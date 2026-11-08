import { describe, expect, it } from 'vitest'
import { parseInvoiceCode } from './invoiceCode'

// AB12345678 + 1150815 + 1234 + 銷售額 0x64(100) + 總計 0x69(105) + 買方 00000000 + 賣方 12345678 + 加密區
const QR = 'AB11234578' + '1150815' + '1234' + '00000064' + '00000069' + '00000000' + '12345678' + 'Ab12cD34Ef56Gh78Ij90Kl12:**********:1:1:1:品名:1:105:'

describe('電子發票條碼解析', () => {
  it('左側 QR Code：取出號碼、日期、期別與總額', () => {
    expect(parseInvoiceCode(QR)).toEqual({
      ok: true,
      invoice: { invoiceNumber: 'AB11234578', invoiceDate: '2026-08-15', period: '115-07-08', amount: 105, kind: 'qr' },
    })
  })

  it('保留號碼前導零，且跨年期別（1 月）正確', () => {
    const r = parseInvoiceCode('CD00000012' + '1150103' + 'abcd' + '00000000' + '000003e8')
    expect(r).toMatchObject({ ok: true, invoice: { invoiceNumber: 'CD00000012', period: '115-01-02', amount: 1000 } })
  })

  it('上方 Code 39 條碼：民國年月 + 號碼 + 隨機碼，月份取該期偶數月', () => {
    expect(parseInvoiceCode('11508AB123456780123')).toEqual({
      ok: true,
      invoice: { invoiceNumber: 'AB12345678', invoiceDate: '2026-08-01', period: '115-07-08', kind: 'barcode' },
    })
  })

  it('條碼月份為奇數或不合法時不接受', () => {
    expect(parseInvoiceCode('11507AB123456780123')).toEqual({ ok: false, reason: 'unrecognized' })
    expect(parseInvoiceCode('11500AB123456780123')).toEqual({ ok: false, reason: 'unrecognized' })
  })

  it('右側 QR Code 與無關內容會回報原因，不會誤判成發票', () => {
    expect(parseInvoiceCode('**:1:1:1:商品')).toEqual({ ok: false, reason: 'right-qr' })
    expect(parseInvoiceCode('https://example.com/shop')).toEqual({ ok: false, reason: 'unrecognized' })
    expect(parseInvoiceCode('')).toEqual({ ok: false, reason: 'unrecognized' })
  })

  it('QR 日期不合法（例如 2 月 30 日）時不接受', () => {
    expect(parseInvoiceCode('AB11234578' + '1150230' + '1234' + '00000064' + '00000069')).toEqual({ ok: false, reason: 'unrecognized' })
  })
})
