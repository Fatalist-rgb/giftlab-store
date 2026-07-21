/**
 * Order-confirmation email HTML (T050 finishing touch). Inline styles only (email
 * clients ignore stylesheets), table layout, Polish first. The SMTP provider will send
 * `data.html` as the body and `data.subject` as the subject — the local provider just
 * logs them until credentials exist.
 */
export interface ConfirmationData {
  display_id: number | null
  items: Array<{ title: string | null; quantity: number; total: number }>
  item_total: number
  shipping_total: number
  total: number
  currency: string
  notice: { title: string; body: string }
  orderUrl?: string | null
}

const money = (v: number, currency: string) =>
  new Intl.NumberFormat('pl-PL', { style: 'currency', currency }).format(v)

export function renderConfirmationHtml(d: ConfirmationData): string {
  const rows = d.items
    .map(
      (i) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #eee;">${escapeHtml(i.title ?? 'Figurka')} × ${i.quantity}</td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">${money(i.total, d.currency)}</td>
      </tr>`,
    )
    .join('')

  return `<!doctype html>
<html lang="pl"><body style="margin:0;padding:24px;background:#faf6ef;font-family:Arial,Helvetica,sans-serif;color:#17131a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:2px solid #17131a;border-radius:16px;">
    <tr><td style="padding:28px;">
      <p style="margin:0;font-size:22px;font-weight:bold;">GiftLab</p>
      <h1 style="margin:16px 0 4px;font-size:24px;">Dziękujemy za zamówienie${d.display_id ? ` #${d.display_id}` : ''}!</h1>
      <p style="margin:0 0 20px;color:#555;">Zaczynamy produkcję Twoich figurek. Poniżej podsumowanie.</p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
        ${rows}
        <tr><td style="padding:8px 0;color:#555;">Dostawa</td><td style="padding:8px 0;text-align:right;color:#555;">${money(d.shipping_total, d.currency)}</td></tr>
        <tr><td style="padding:10px 0;font-weight:bold;border-top:2px solid #17131a;">Razem</td><td style="padding:10px 0;text-align:right;font-weight:bold;border-top:2px solid #17131a;">${money(d.total, d.currency)}</td></tr>
      </table>

      ${
        d.orderUrl
          ? `<p style="margin:20px 0 0;"><a href="${escapeHtml(d.orderUrl)}" style="display:inline-block;padding:12px 20px;background:#ff7a3d;color:#ffffff;text-decoration:none;font-weight:bold;border:2px solid #17131a;border-radius:12px;">Śledź zamówienie</a></p>`
          : ''
      }

      <div style="margin-top:24px;padding:14px;background:#faf6ef;border-radius:12px;font-size:12px;color:#555;line-height:1.5;">
        <p style="margin:0 0 6px;font-weight:bold;">${escapeHtml(d.notice.title)}</p>
        <p style="margin:0;">${escapeHtml(d.notice.body)}</p>
      </div>
    </td></tr>
  </table>
  <p style="max-width:560px;margin:12px auto 0;font-size:11px;color:#999;text-align:center;">Ta wiadomość została wysłana automatycznie po złożeniu zamówienia w GiftLab.</p>
</body></html>`
}

export function renderConfirmationText(d: ConfirmationData): string {
  const lines = d.items.map((i) => `- ${i.title ?? 'Figurka'} × ${i.quantity}: ${money(i.total, d.currency)}`)
  return [
    `Dziękujemy za zamówienie${d.display_id ? ` #${d.display_id}` : ''}!`,
    '',
    ...lines,
    `Dostawa: ${money(d.shipping_total, d.currency)}`,
    `Razem: ${money(d.total, d.currency)}`,
    ...(d.orderUrl ? ['', `Śledź zamówienie: ${d.orderUrl}`] : []),
    '',
    d.notice.title,
    d.notice.body,
  ].join('\n')
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
