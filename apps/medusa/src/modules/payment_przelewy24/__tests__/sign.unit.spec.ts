import {
  parseNotification,
  signNotification,
  signRegister,
  signVerify,
  signaturesMatch,
  verifyNotification,
  type P24Notification,
} from '../lib/sign'
import { createHash } from 'node:crypto'

/**
 * The signing rules come straight from the P24 docs ("Calculating Sign"): SHA-384 over
 * a JSON object with a per-operation field set, integers as integers. These tests pin
 * that down — a wrong hash means every payment is rejected, so it must not drift.
 */
const sha384 = (s: string) => createHash('sha384').update(s, 'utf8').digest('hex')

describe('P24 signatures', () => {
  it('register signs {sessionId, merchantId, amount, currency, crc} in that order', () => {
    const sign = signRegister({
      sessionId: 'unique-session-id',
      merchantId: 999999,
      amount: 1234,
      currency: 'PLN',
      crc: 'crc-z-panelu-p24',
    })
    expect(sign).toBe(
      sha384(
        '{"sessionId":"unique-session-id","merchantId":999999,"amount":1234,"currency":"PLN","crc":"crc-z-panelu-p24"}',
      ),
    )
    expect(sign).toHaveLength(96) // SHA-384 hex
  })

  it('verify swaps merchantId for orderId (the docs warn about exactly this)', () => {
    const sign = signVerify({
      sessionId: 'unique-session-id',
      orderId: 999999,
      amount: 1234,
      currency: 'PLN',
      crc: 'crc-z-panelu-p24',
    })
    expect(sign).toBe(
      sha384(
        '{"sessionId":"unique-session-id","orderId":999999,"amount":1234,"currency":"PLN","crc":"crc-z-panelu-p24"}',
      ),
    )
    // the two operations must never produce the same checksum for the same transaction
    expect(sign).not.toBe(
      signRegister({
        sessionId: 'unique-session-id',
        merchantId: 999999,
        amount: 1234,
        currency: 'PLN',
        crc: 'crc-z-panelu-p24',
      }),
    )
  })

  it('notification signs all ten fields in the documented order', () => {
    const base = {
      merchantId: 1,
      posId: 1,
      sessionId: 's-1',
      amount: 7900,
      originAmount: 7900,
      currency: 'PLN',
      orderId: 555,
      methodId: 154,
      statement: 'zamowienie 9',
    }
    expect(signNotification(base, 'crc')).toBe(
      sha384(
        '{"merchantId":1,"posId":1,"sessionId":"s-1","amount":7900,"originAmount":7900,"currency":"PLN","orderId":555,"methodId":154,"statement":"zamowienie 9","crc":"crc"}',
      ),
    )
  })

  it('numbers sent as strings change the checksum (type discipline matters)', () => {
    const asNumber = signRegister({
      sessionId: 's',
      merchantId: 42,
      amount: 100,
      currency: 'PLN',
      crc: 'c',
    })
    const asString = sha384('{"sessionId":"s","merchantId":"42","amount":"100","currency":"PLN","crc":"c"}')
    expect(asNumber).not.toBe(asString)
  })
})

describe('notification handling', () => {
  const crc = 'test-crc'
  const valid = (): P24Notification => {
    const base = {
      merchantId: 10,
      posId: 10,
      sessionId: 'gl_abc',
      amount: 9499,
      originAmount: 9499,
      currency: 'PLN',
      orderId: 777,
      methodId: 154,
      statement: 'GiftLab',
    }
    return { ...base, sign: signNotification(base, crc) }
  }

  it('accepts a correctly signed notification for our shop', () => {
    expect(verifyNotification(valid(), { crc, merchantId: 10, posId: 10 })).toEqual({ ok: true })
  })

  it('rejects a tampered amount even when the rest matches', () => {
    const n = { ...valid(), amount: 100 }
    const res = verifyNotification(n, { crc, merchantId: 10, posId: 10 })
    expect(res.ok).toBe(false)
  })

  it('rejects a notification signed with someone else’s CRC', () => {
    const n = valid()
    n.sign = signNotification(n, 'other-crc')
    expect(verifyNotification(n, { crc, merchantId: 10, posId: 10 })).toEqual({
      ok: false,
      reason: 'signature mismatch',
    })
  })

  it('rejects a notification addressed to a different merchant', () => {
    expect(verifyNotification(valid(), { crc, merchantId: 11, posId: 10 })).toEqual({
      ok: false,
      reason: 'merchantId mismatch',
    })
  })

  it('flags a paid amount that differs from the registered one', () => {
    const res = verifyNotification(valid(), { crc, merchantId: 10, posId: 10, expectedAmount: 7900 })
    expect(res).toEqual({ ok: false, reason: 'amount mismatch: paid 9499, expected 7900' })
  })

  it('parse rejects junk, string numbers and missing fields', () => {
    expect(parseNotification(null)).toBeNull()
    expect(parseNotification({})).toBeNull()
    expect(parseNotification({ ...valid(), amount: '9499' })).toBeNull()
    const { statement: _dropped, ...withoutStatement } = valid()
    expect(parseNotification(withoutStatement)).toBeNull()
    expect(parseNotification(valid())).not.toBeNull()
  })

  it('signature compare is length-safe', () => {
    expect(signaturesMatch('abc', 'abc')).toBe(true)
    expect(signaturesMatch('abc', 'abcd')).toBe(false)
    expect(signaturesMatch('abc', 'abd')).toBe(false)
  })
})
