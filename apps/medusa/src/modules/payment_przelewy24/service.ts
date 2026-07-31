import { AbstractPaymentProvider, PaymentActions, PaymentSessionStatus } from '@medusajs/framework/utils'
import type { Logger } from '@medusajs/framework/types'
import type {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  ProviderWebhookPayload,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from '@medusajs/framework/types'
import { configFromEnv, registerTransaction, verifyTransaction, type P24Config } from './lib/client'
import { parseNotification, verifyNotification } from './lib/sign'

type Options = Partial<P24Config> & { description?: string }

/**
 * Przelewy24 payment provider (T045) — BLIK, szybki przelew and cards all live behind
 * one P24 redirect, which is how Polish shops normally take payments.
 *
 * Flow: initiatePayment registers the transaction and hands the storefront a
 * `redirectUrl`; the customer pays on P24; P24 POSTs the status notification to
 * `/hooks/payment/przelewy24_przelewy24`; getWebhookActionAndData checks the signature,
 * calls the mandatory verify endpoint and reports "authorized" so Medusa can complete
 * the order. Nothing is ever treated as paid on the customer's return alone.
 *
 * The module is only registered when the merchant credentials exist (see
 * medusa-config.ts) — without them the shop keeps using the default provider.
 */
class Przelewy24ProviderService extends AbstractPaymentProvider<Options> {
  static identifier = 'przelewy24'

  private readonly p24: P24Config
  private readonly description: string
  private readonly logger_: Logger

  constructor({ logger }: { logger: Logger }, options: Options) {
    super({ logger } as never, options)
    const fromEnv = configFromEnv()
    const merged = { ...(fromEnv ?? {}), ...options } as P24Config
    if (!merged.merchantId || !merged.crc || !merged.apiKey) {
      throw new Error(
        'Przelewy24 provider is registered without credentials — set P24_MERCHANT_ID, P24_CRC, P24_API_KEY',
      )
    }
    this.p24 = merged
    this.description = options.description ?? 'GiftLab'
    this.logger_ = logger
  }

  /** Medusa amounts are major units (PLN); P24 wants grosze. */
  private static toGrosze(amount: unknown): number {
    return Math.round(Number(amount) * 100)
  }

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const amount = Przelewy24ProviderService.toGrosze(input.amount)
    const currency = (input.currency_code ?? 'pln').toUpperCase()
    // P24 requires a session id unique per transaction; Medusa's payment session id is
    // not known yet at initiate time, so we mint one and keep it in `data`.
    const sessionId = `gl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
    const email = (input.context?.customer?.email as string | undefined) ?? 'brak@giftlab.local'

    const { token, redirectUrl } = await registerTransaction(this.p24, {
      sessionId,
      amount,
      currency,
      description: this.description,
      email,
    })

    return {
      id: sessionId,
      status: PaymentSessionStatus.PENDING,
      data: { sessionId, token, redirectUrl, amount, currency, verified: false },
    }
  }

  /**
   * Authorization happens through the webhook (the only trustworthy signal). Here we
   * only report what the webhook already recorded, so a customer who returns before the
   * notification arrives sees "pending" instead of a wrongly-completed order.
   */
  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    const data = (input.data ?? {}) as { verified?: boolean }
    return {
      status: data.verified ? PaymentSessionStatus.AUTHORIZED : PaymentSessionStatus.PENDING,
      data: input.data ?? {},
    }
  }

  /** P24 settles the money itself — a verified transaction is already captured. */
  async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    return { data: { ...(input.data ?? {}), captured: true } }
  }

  async getPaymentStatus(input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    const data = (input.data ?? {}) as { verified?: boolean; canceled?: boolean }
    if (data.canceled) return { status: PaymentSessionStatus.CANCELED, data: input.data ?? {} }
    return {
      status: data.verified ? PaymentSessionStatus.AUTHORIZED : PaymentSessionStatus.PENDING,
      data: input.data ?? {},
    }
  }

  async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    return { data: input.data ?? {} }
  }

  /**
   * A registered P24 transaction cannot be re-priced: if the cart changed we register a
   * new transaction and the old token simply expires unused.
   */
  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    const previous = (input.data ?? {}) as { amount?: number; verified?: boolean }
    const amount = Przelewy24ProviderService.toGrosze(input.amount)
    if (previous.verified || previous.amount === amount) {
      return { data: input.data ?? {} }
    }
    const initiated = await this.initiatePayment({
      amount: input.amount,
      currency_code: input.currency_code,
      context: input.context,
    })
    return { data: initiated.data ?? {}, status: PaymentSessionStatus.PENDING }
  }

  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    // nothing to call: an unpaid P24 transaction expires on its own
    return { data: { ...(input.data ?? {}), canceled: true } }
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return { data: { ...(input.data ?? {}), canceled: true } }
  }

  /**
   * Refunds go through the P24 panel or the refund API, which needs a separate
   * agreement per account; until the client's account is live we fail loudly instead of
   * pretending the money moved.
   */
  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    throw new Error(
      'Zwrot środków przez API Przelewy24 nie jest jeszcze skonfigurowany — wykonaj zwrot w panelu P24',
    )
  }

  async getWebhookActionAndData(payload: ProviderWebhookPayload['payload']): Promise<WebhookActionResult> {
    const notification = parseNotification(payload.data)
    if (!notification) {
      this.logger_.warn('[p24] malformed status notification')
      return { action: PaymentActions.NOT_SUPPORTED }
    }
    const check = verifyNotification(notification, {
      crc: this.p24.crc,
      merchantId: this.p24.merchantId,
      posId: this.p24.posId,
    })
    if (!check.ok) {
      this.logger_.warn(`[p24] rejected notification for ${notification.sessionId}: ${check.reason}`)
      return { action: PaymentActions.FAILED }
    }

    // mandatory second step: P24 only counts the payment once we confirm it back
    const verified = await verifyTransaction(this.p24, {
      sessionId: notification.sessionId,
      orderId: notification.orderId,
      amount: notification.amount,
      currency: notification.currency,
    })
    if (!verified) {
      this.logger_.warn(`[p24] verify said no for ${notification.sessionId}`)
      return { action: PaymentActions.FAILED }
    }

    this.logger_.info(`[p24] payment verified for ${notification.sessionId} (order ${notification.orderId})`)
    return {
      action: PaymentActions.AUTHORIZED,
      data: {
        // Medusa matches this against the payment session id returned by initiatePayment
        session_id: notification.sessionId,
        amount: notification.amount / 100,
      },
    }
  }
}

export default Przelewy24ProviderService
