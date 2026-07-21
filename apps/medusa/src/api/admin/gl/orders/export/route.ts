import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules } from '@medusajs/framework/utils'
import type { IOrderModuleService } from '@medusajs/framework/types'
import { PERSONALIZATION_MODULE } from '../../../../../modules/personalization'
import type PersonalizationModuleService from '../../../../../modules/personalization/service'

/**
 * GET /admin/gl/orders/export — fulfilment CSV (T058): one row per personalized line
 * with the design summary, the per-line withdrawal right and the render state. Excel-
 * friendly: UTF-8 BOM + semicolon separator (Polish locale default).
 */
const esc = (v: unknown): string => {
  let s = v === null || v === undefined ? '' : String(v)
  // formula-injection guard: Excel executes cells starting with = + - @ or tab —
  // customer-controlled fields (name, email, selections) must never become formulas
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const personalization: PersonalizationModuleService = req.scope.resolve(PERSONALIZATION_MODULE)
  const orders: IOrderModuleService = req.scope.resolve(Modules.ORDER)

  const lines = await personalization.listOrderLineDesigns({}, { order: { created_at: 'DESC' }, take: 1000 })

  // one order fetch per distinct order id (emails + totals)
  const orderIds = [...new Set(lines.map((l) => l.order_id).filter((x): x is string => Boolean(x)))]
  const orderById = new Map<string, { email: string | null; total: unknown; created_at: unknown }>()
  for (const id of orderIds) {
    try {
      const o = await orders.retrieveOrder(id, { relations: [] })
      orderById.set(id, { email: o.email ?? null, total: o.total, created_at: o.created_at })
    } catch {
      /* order missing — row still exported with blanks */
    }
  }

  const header = [
    'zamowienie', 'data', 'email', 'linia', 'projekt', 'imie', 'ilosc',
    'zdjecie', 'prawo_odstapienia', 'status_renderu', 'plik_gotowy',
  ]
  const rows: string[] = [header.join(';')]

  for (const l of lines) {
    let selections = ''
    let name = ''
    let qty: number | string = ''
    let photo = ''
    try {
      const d = await personalization.retrieveDesignState(l.design_state_id)
      selections = Object.entries((d.character_selections as Record<string, string>) ?? {})
        .map(([k, v]) => `${k}=${v}`)
        .join(',')
      name = (((d.text_values as Array<{ value?: string }> | null) ?? [])[0]?.value ?? '')
      qty = d.quantity ?? ''
      photo = d.photo_status ?? ''
    } catch {
      /* design gone — export what the line knows */
    }
    const o = l.order_id ? orderById.get(l.order_id) : undefined
    rows.push(
      [
        esc(l.order_display_id ?? ''),
        esc(o?.created_at ? new Date(o.created_at as string).toISOString().slice(0, 10) : ''),
        esc(o?.email ?? ''),
        esc(l.medusa_line_item_id),
        esc(selections),
        esc(name),
        esc(qty),
        esc(photo),
        esc(l.withdrawal_right === 'excluded' ? 'wylaczone (art. 38 pkt 3)' : '14 dni'),
        esc(l.render_status),
        esc(l.production_package_id ? 'tak' : 'nie'),
      ].join(';'),
    )
  }

  const csv = '﻿' + rows.join('\r\n') // BOM keeps Excel happy with UTF-8
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="giftlab-zamowienia-${new Date().toISOString().slice(0, 10)}.csv"`)
  res.send(csv)
}
