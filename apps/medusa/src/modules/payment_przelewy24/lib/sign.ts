import { createHash, timingSafeEqual } from 'node:crypto'

/**
 * Przelewy24 REST API v1 checksums. Every request/notification is signed with SHA-384
 * over a JSON object whose FIELD SET AND ORDER differ per operation (P24 docs,
 * "Calculating Sign"). Types matter too: merchantId/posId/amount/orderId/methodId are
 * integers, everything else is a string — a number sent as a string produces a
 * different hash and P24 rejects the call.
 *
 * Pure functions, no I/O: this is the part that must be provably correct, so it is
 * unit-tested against the vectors from the documentation.
 */

const sha384 = (input: string): string => createHash('sha384').update(input, 'utf8').digest('hex')

/** P24 signs `json_encode($params, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)`. */
export function p24Json(params: Record<string, string | number>): string {
  // JSON.stringify already leaves unicode and slashes unescaped, matching PHP's flags
  return JSON.stringify(params)
}

export interface RegisterSignInput {
  sessionId: string
  merchantId: number
  amount: number
  currency: string
  crc: string
}

/** Transaction register: {"sessionId","merchantId","amount","currency","crc"} */
export function signRegister(input: RegisterSignInput): string {
  return sha384(
    p24Json({
      sessionId: input.sessionId,
      merchantId: input.merchantId,
      amount: input.amount,
      currency: input.currency,
      crc: input.crc,
    }),
  )
}

export interface VerifySignInput {
  sessionId: string
  orderId: number
  amount: number
  currency: string
  crc: string
}

/** Transaction verify: {"sessionId","orderId","amount","currency","crc"} */
export function signVerify(input: VerifySignInput): string {
  return sha384(
    p24Json({
      sessionId: input.sessionId,
      orderId: input.orderId,
      amount: input.amount,
      currency: input.currency,
      crc: input.crc,
    }),
  )
}

/** The status notification P24 POSTs to `urlStatus`. */
export interface P24Notification {
  merchantId: number
  posId: number
  sessionId: string
  amount: number
  originAmount: number
  currency: string
  orderId: number
  methodId: number
  statement: string
  sign: string
}

/**
 * Notification checksum:
 * {"merchantId","posId","sessionId","amount","originAmount","currency","orderId","methodId","statement","crc"}
 */
export function signNotification(n: Omit<P24Notification, 'sign'>, crc: string): string {
  return sha384(
    p24Json({
      merchantId: n.merchantId,
      posId: n.posId,
      sessionId: n.sessionId,
      amount: n.amount,
      originAmount: n.originAmount,
      currency: n.currency,
      orderId: n.orderId,
      methodId: n.methodId,
      statement: n.statement,
      crc,
    }),
  )
}

/** Constant-time hex compare — a webhook signature check must not leak by timing. */
export function signaturesMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(String(a), 'utf8')
  const bufB = Buffer.from(String(b), 'utf8')
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v)

/**
 * Parse an untrusted webhook body into a notification. Returns null when a field is
 * missing or has the wrong type — the caller then answers 400 without touching orders.
 */
export function parseNotification(body: unknown): P24Notification | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  if (
    !isInt(b.merchantId) ||
    !isInt(b.posId) ||
    typeof b.sessionId !== 'string' ||
    !b.sessionId ||
    !isInt(b.amount) ||
    !isInt(b.originAmount) ||
    typeof b.currency !== 'string' ||
    !isInt(b.orderId) ||
    !isInt(b.methodId) ||
    typeof b.statement !== 'string' ||
    typeof b.sign !== 'string'
  ) {
    return null
  }
  return {
    merchantId: b.merchantId,
    posId: b.posId,
    sessionId: b.sessionId,
    amount: b.amount,
    originAmount: b.originAmount,
    currency: b.currency,
    orderId: b.orderId,
    methodId: b.methodId,
    statement: b.statement,
    sign: b.sign,
  }
}

/**
 * A notification is trustworthy only when the signature matches AND it is about our
 * shop, our session and the amount we registered. P24 also re-sends notifications, so
 * the caller must treat a repeated valid notification as idempotent.
 */
export function verifyNotification(
  n: P24Notification,
  opts: { crc: string; merchantId: number; posId: number; expectedAmount?: number },
): { ok: true } | { ok: false; reason: string } {
  if (n.merchantId !== opts.merchantId) return { ok: false, reason: 'merchantId mismatch' }
  if (n.posId !== opts.posId) return { ok: false, reason: 'posId mismatch' }
  if (!signaturesMatch(signNotification(n, opts.crc), n.sign)) {
    return { ok: false, reason: 'signature mismatch' }
  }
  if (opts.expectedAmount != null && n.amount !== opts.expectedAmount) {
    return { ok: false, reason: `amount mismatch: paid ${n.amount}, expected ${opts.expectedAmount}` }
  }
  return { ok: true }
}
