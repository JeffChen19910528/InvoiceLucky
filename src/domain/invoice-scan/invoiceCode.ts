import { periodIdOfDate, rocToIso } from '../period/period'

/**
 * 解析電子發票證明聯上的條碼內容（純函式，不依賴相機或 UI）。
 *
 * - 左側 QR Code：發票號碼(10) + 民國日期 YYYMMDD(7) + 隨機碼(4) + 銷售額十六進位(8) + 總計額十六進位(8) + …
 * - 上方 Code 39 條碼：民國年月 YYYMM(5) + 發票號碼(10) + 隨機碼(4)，共 19 碼；月份為該期的偶數月。
 * - 右側 QR Code 以 `**` 開頭，不含可用的發票號碼。
 */
export interface ScannedInvoice {
  invoiceNumber: string
  /** ISO 日期；條碼只有年月，故以該月 1 日代表（仍落在同一期別內）。 */
  invoiceDate: string
  period: string
  /** 總計金額（元）；僅 QR Code 提供。 */
  amount?: number
  kind: 'qr' | 'barcode'
}

export type ScanParseResult =
  | { ok: true; invoice: ScannedInvoice }
  | { ok: false; reason: 'right-qr' | 'unrecognized' }

const QR_RE = /^([A-Z]{2}\d{8})(\d{3})(\d{2})(\d{2})[0-9A-Za-z]{4}([0-9A-Fa-f]{8})([0-9A-Fa-f]{8})/
const BARCODE_RE = /^(\d{3})(\d{2})([A-Z]{2}\d{8})\d{4}$/

export function parseInvoiceCode(raw: string): ScanParseResult {
  const text = raw.trim()
  if (text.startsWith('**')) return { ok: false, reason: 'right-qr' }

  const qr = QR_RE.exec(text.toUpperCase())
  if (qr) {
    const invoiceDate = rocToIso(Number(qr[2]), Number(qr[3]), Number(qr[4]))
    const period = periodIdOfDate(invoiceDate)
    if (period) {
      const total = parseInt(qr[6], 16)
      return { ok: true, invoice: { invoiceNumber: qr[1], invoiceDate, period, amount: Number.isFinite(total) ? total : undefined, kind: 'qr' } }
    }
  }

  const bar = BARCODE_RE.exec(text.toUpperCase())
  if (bar) {
    const month = Number(bar[2])
    if (month >= 2 && month <= 12 && month % 2 === 0) {
      const invoiceDate = rocToIso(Number(bar[1]), month, 1)
      const period = periodIdOfDate(invoiceDate)
      if (period) return { ok: true, invoice: { invoiceNumber: bar[3], invoiceDate, period, kind: 'barcode' } }
    }
  }

  return { ok: false, reason: 'unrecognized' }
}
