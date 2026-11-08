import {
  backupSchema,
  prizePeriodSchema,
  type Invoice,
  type PrizePeriod,
} from '../../domain/models/types'
import { joinMsgs, msg, type Msg } from '../../domain/models/message'
import { invoiceKey, validateInvoice } from './invoices'

export interface BackupData {
  invoices: Invoice[]
  prizePeriods: PrizePeriod[]
}

export function exportBackup(data: BackupData, now = new Date().toISOString()): string {
  return JSON.stringify(
    { app: 'invoice-lucky', version: 1, exportedAt: now, invoices: data.invoices, prizePeriods: data.prizePeriods },
    null,
    2,
  )
}

export interface ImportPreview {
  ok: boolean
  fatal?: Msg
  newInvoices: Invoice[]
  duplicateInvoices: Invoice[]
  invalid: Array<{ index: number; message: Msg }>
  newPeriods: PrizePeriod[]
  replacedPeriodIds: string[]
}

/** 純函式：驗證備份 JSON 並產出預覽；不修改任何既有資料。 */
export function previewBackup(text: string, existing: BackupData): ImportPreview {
  const empty: ImportPreview = {
    ok: false,
    newInvoices: [],
    duplicateInvoices: [],
    invalid: [],
    newPeriods: [],
    replacedPeriodIds: [],
  }
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return { ...empty, fatal: msg('import.notJson') }
  }
  const head = backupSchema.safeParse(json)
  if (!head.success) return { ...empty, fatal: msg('import.notBackup') }

  const seen = new Set(existing.invoices.map((i) => invoiceKey(i.period, i.invoiceNumber)))
  const preview: ImportPreview = { ...empty, ok: true }
  head.data.invoices.forEach((raw, index) => {
    const v = validateInvoice(raw)
    if (!v.ok) return preview.invalid.push({ index, message: v.message })
    const k = invoiceKey(v.invoice.period, v.invoice.invoiceNumber)
    if (seen.has(k)) preview.duplicateInvoices.push(v.invoice)
    else {
      seen.add(k)
      preview.newInvoices.push({ ...v.invoice, source: 'import' })
    }
  })
  const existingIds = new Set(existing.prizePeriods.map((p) => p.id))
  head.data.prizePeriods.forEach((raw, index) => {
    const r = prizePeriodSchema.safeParse(raw)
    if (!r.success) return preview.invalid.push({ index, message: msg('import.prizeData', { detail: joinMsgs(r.error.issues.map((i) => msg(i.message))) }) })
    // 備份檔不得宣稱 official；一律視為使用者匯入
    preview.newPeriods.push({ ...r.data, source: r.data.source === 'demo' ? 'demo' : 'user-import' })
    if (existingIds.has(r.data.id)) preview.replacedPeriodIds.push(r.data.id)
  })
  return preview
}

export interface PrizeImportResult {
  periods: PrizePeriod[]
  errors: Msg[]
}

/** 官方獎號 JSON 匯入：接受單一期別物件或期別陣列。 */
export function parsePrizeJson(text: string): PrizeImportResult {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return { periods: [], errors: [msg('import.notJsonShort')] }
  }
  const list = Array.isArray(json) ? json : [json]
  const periods: PrizePeriod[] = []
  const errors: Msg[] = []
  list.forEach((raw, i) => {
    const r = prizePeriodSchema.safeParse(raw)
    if (r.success) periods.push({ ...r.data, source: 'user-import' })
    else errors.push(msg('import.itemError', { n: i + 1, detail: joinMsgs(r.error.issues.map((x) => msg('err.field', { path: x.path.join('.'), detail: msg(x.message) }))) }))
  })
  return { periods, errors }
}

export const PRIZE_JSON_EXAMPLE = JSON.stringify(
  [
    {
      id: '115-09-10',
      year: 115,
      months: [9, 10],
      claimStart: '2026-12-06',
      claimEnd: '2027-03-05',
      specialPrize: '00000000',
      grandPrize: '11111111',
      firstPrizes: ['22222222', '33333333', '44444444'],
      source: 'user-import',
      sourceUrl: 'https://invoice.etax.nat.gov.tw/lastNumber.html',
    },
  ],
  null,
  2,
)
