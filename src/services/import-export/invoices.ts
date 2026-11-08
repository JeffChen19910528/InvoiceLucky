import { invoiceSchema, INVOICE_NUMBER_RE, type Invoice } from '../../domain/models/types'
import { normalizeInvoiceNumber } from '../../domain/prize-engine/engine'
import { periodIdOfDate } from '../../domain/period/period'
import { joinMsgs, msg, type Msg } from '../../domain/models/message'
import { parseCsv, toCsv } from './csv'

export const invoiceKey = (period: string, number: string) => `${period}|${normalizeInvoiceNumber(number)}`

let seq = 0
export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `id-${Date.now().toString(36)}-${(seq++).toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export interface DraftInvoice {
  invoiceDate: string
  invoiceNumber: string
  amount: number
  note?: string
  isCloud?: boolean
  period?: string
}

export function buildInvoice(d: DraftInvoice, source: Invoice['source'], now = new Date().toISOString()): Invoice {
  return {
    id: newId(),
    period: d.period ?? periodIdOfDate(d.invoiceDate) ?? '',
    invoiceDate: d.invoiceDate,
    invoiceNumber: normalizeInvoiceNumber(d.invoiceNumber),
    amount: d.amount,
    note: d.note?.trim() || undefined,
    isCloud: d.isCloud || undefined,
    source,
    createdAt: now,
    updatedAt: now,
  }
}

export interface BatchLineError {
  line: number
  text: string
  message: Msg
}
export interface BatchParseResult {
  drafts: DraftInvoice[]
  errors: BatchLineError[]
}

/**
 * 解析批次輸入。每行二擇一：
 *  - `AB12345678`（使用預設日期、金額 0）
 *  - `日期,號碼,金額,備註`（CSV；備註可含逗號並以引號包起）
 * 期別一律由日期推算，除非為純號碼行，則使用 `defaultPeriod`。
 */
export function parseBatchInput(text: string, defaultDate: string, defaultPeriod: string): BatchParseResult {
  const drafts: DraftInvoice[] = []
  const errors: BatchLineError[] = []
  const lines = text.split(/\r?\n/)
  lines.forEach((raw, idx) => {
    const line = raw.trim()
    if (!line) return
    const fail = (message: Msg) => errors.push({ line: idx + 1, text: line, message })
    if (!line.includes(',')) {
      const n = normalizeInvoiceNumber(line)
      if (!INVOICE_NUMBER_RE.test(n)) return fail(msg('err.invoiceNumber'))
      drafts.push({ invoiceDate: defaultDate, invoiceNumber: n, amount: 0, period: defaultPeriod })
      return
    }
    const [cells] = parseCsv(line)
    const [date, number, amount, ...noteParts] = cells.map((c) => c.trim())
    if (!periodIdOfDate(date ?? '')) return fail(msg('err.dateInvalid'))
    const n = normalizeInvoiceNumber(number ?? '')
    if (!INVOICE_NUMBER_RE.test(n)) return fail(msg('err.invoiceNumber'))
    const amt = amount === undefined || amount === '' ? 0 : Number(amount)
    if (!Number.isInteger(amt) || amt < 0) return fail(msg('err.amountInvalid'))
    drafts.push({ invoiceDate: date, invoiceNumber: n, amount: amt, note: noteParts.join(',') || undefined })
  })
  return { drafts, errors }
}

export interface AddPlan {
  toAdd: Invoice[]
  duplicates: Invoice[]
}

/** 排除與既有（或同批次內）重複的發票；不覆蓋。 */
export function planAdd(existing: Invoice[], incoming: Invoice[]): AddPlan {
  const seen = new Set(existing.map((i) => invoiceKey(i.period, i.invoiceNumber)))
  const toAdd: Invoice[] = []
  const duplicates: Invoice[] = []
  for (const inv of incoming) {
    const k = invoiceKey(inv.period, inv.invoiceNumber)
    if (seen.has(k)) duplicates.push(inv)
    else {
      seen.add(k)
      toAdd.push(inv)
    }
  }
  return { toAdd, duplicates }
}

export const CSV_HEADER = ['period', 'invoiceDate', 'invoiceNumber', 'amount', 'note', 'isCloud', 'source']

export function invoicesToCsv(invoices: Invoice[]): string {
  const rows = invoices.map((i) => [
    i.period,
    i.invoiceDate,
    i.invoiceNumber,
    String(i.amount),
    i.note ?? '',
    i.isCloud ? '1' : '0',
    i.source,
  ])
  return String.fromCharCode(0xfeff) + toCsv([CSV_HEADER, ...rows])
}

export function validateInvoice(raw: unknown): { ok: true; invoice: Invoice } | { ok: false; message: Msg } {
  const r = invoiceSchema.safeParse(raw)
  if (r.success) return { ok: true, invoice: r.data }
  return { ok: false, message: joinMsgs(r.error.issues.map((i) => msg('err.field', { path: i.path.join('.'), detail: msg(i.message) }))) }
}
