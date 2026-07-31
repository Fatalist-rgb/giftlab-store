import { signRegister, signVerify } from './sign'

/**
 * Thin Przelewy24 REST v1 client: register a transaction, verify it after the status
 * notification, and a credentials smoke-check. Basic auth = posId : apiKey (P24 docs,
 * "Authentication"). Amounts are always in grosze (1.23 PLN = 123).
 */

export interface P24Config {
  merchantId: number
  posId: number
  crc: string
  apiKey: string
  sandbox: boolean
  /** where P24 sends the async status notification */
  urlStatus: string
  /** where the customer lands after paying (or cancelling) */
  urlReturn: string
}

const apiBase = (sandbox: boolean) =>
  sandbox ? 'https://sandbox.przelewy24.pl/api/v1' : 'https://secure.przelewy24.pl/api/v1'

export const redirectUrl = (token: string, sandbox: boolean) =>
  `${sandbox ? 'https://sandbox.przelewy24.pl' : 'https://secure.przelewy24.pl'}/trnRequest/${token}`

export class P24Error extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly body?: unknown,
  ) {
    super(message)
    this.name = 'P24Error'
  }
}

async function call(
  cfg: P24Config,
  path: string,
  init: { method: 'POST' | 'PUT' | 'GET'; body?: unknown },
): Promise<Record<string, unknown>> {
  const auth = Buffer.from(`${cfg.posId}:${cfg.apiKey}`, 'utf8').toString('base64')
  const res = await fetch(`${apiBase(cfg.sandbox)}${path}`, {
    method: init.method,
    headers: {
      authorization: `Basic ${auth}`,
      'content-type': 'application/json',
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(15000),
  })
  let json: Record<string, unknown> = {}
  try {
    json = (await res.json()) as Record<string, unknown>
  } catch {
    /* P24 answers JSON on every documented path; an empty body is an error anyway */
  }
  if (!res.ok) {
    const detail =
      (json.error as string | undefined) ??
      (json.message as string | undefined) ??
      JSON.stringify(json).slice(0, 300)
    throw new P24Error(`P24 ${path} -> HTTP ${res.status}: ${detail}`, res.status, json)
  }
  return json
}

export interface RegisterInput {
  sessionId: string
  /** grosze */
  amount: number
  currency: string
  description: string
  email: string
  /** ISO-2, P24 expects the customer's country, e.g. "PL" */
  country?: string
  language?: string
  client?: string
}

/** POST /transaction/register → token used for the redirect. */
export async function registerTransaction(
  cfg: P24Config,
  input: RegisterInput,
): Promise<{ token: string; redirectUrl: string }> {
  const body = {
    merchantId: cfg.merchantId,
    posId: cfg.posId,
    sessionId: input.sessionId,
    amount: input.amount,
    currency: input.currency,
    description: input.description,
    email: input.email,
    country: input.country ?? 'PL',
    language: input.language ?? 'pl',
    client: input.client,
    urlReturn: cfg.urlReturn,
    urlStatus: cfg.urlStatus,
    encoding: 'UTF-8',
    sign: signRegister({
      sessionId: input.sessionId,
      merchantId: cfg.merchantId,
      amount: input.amount,
      currency: input.currency,
      crc: cfg.crc,
    }),
  }
  const json = await call(cfg, '/transaction/register', { method: 'POST', body })
  const token = (json.data as { token?: string } | undefined)?.token
  if (!token) throw new P24Error('P24 register returned no token', undefined, json)
  return { token, redirectUrl: redirectUrl(token, cfg.sandbox) }
}

/**
 * PUT /transaction/verify — the confirmation half of the flow. Only after P24 answers
 * `{ data: { status: "success" } }` may the order be treated as paid.
 */
export async function verifyTransaction(
  cfg: P24Config,
  input: { sessionId: string; orderId: number; amount: number; currency: string },
): Promise<boolean> {
  const json = await call(cfg, '/transaction/verify', {
    method: 'PUT',
    body: {
      merchantId: cfg.merchantId,
      posId: cfg.posId,
      sessionId: input.sessionId,
      amount: input.amount,
      currency: input.currency,
      orderId: input.orderId,
      sign: signVerify({
        sessionId: input.sessionId,
        orderId: input.orderId,
        amount: input.amount,
        currency: input.currency,
        crc: cfg.crc,
      }),
    },
  })
  return (json.data as { status?: string } | undefined)?.status === 'success'
}

/** GET /testAccess — credentials smoke-check for the setup script. */
export async function testAccess(cfg: P24Config): Promise<boolean> {
  const json = await call(cfg, '/testAccess', { method: 'GET' })
  return json.data === true || (json.data as { status?: boolean } | undefined)?.status === true
}

/** Read the provider config from env; returns null when P24 is not configured yet. */
export function configFromEnv(env: NodeJS.ProcessEnv = process.env): P24Config | null {
  const merchantId = Number(env.P24_MERCHANT_ID)
  const posId = Number(env.P24_POS_ID || env.P24_MERCHANT_ID)
  const crc = env.P24_CRC
  const apiKey = env.P24_API_KEY
  const backendUrl = env.BACKEND_PUBLIC_URL ?? env.MEDUSA_BACKEND_URL
  const siteUrl = env.SITE_URL ?? env.NEXT_PUBLIC_SITE_URL
  if (!Number.isInteger(merchantId) || !merchantId || !crc || !apiKey || !backendUrl || !siteUrl) {
    return null
  }
  return {
    merchantId,
    posId: Number.isInteger(posId) && posId ? posId : merchantId,
    crc,
    apiKey,
    sandbox: env.P24_SANDBOX !== 'false',
    urlStatus: `${backendUrl.replace(/\/$/, '')}/hooks/payment/przelewy24_przelewy24`,
    urlReturn: `${siteUrl.replace(/\/$/, '')}/pl/checkout/return`,
  }
}
