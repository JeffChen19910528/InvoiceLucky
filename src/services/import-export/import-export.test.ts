import { describe, expect, it } from 'vitest'
import { parseCsv, toCsv } from './csv'
import { buildInvoice, invoicesToCsv, parseBatchInput, planAdd } from './invoices'
import { exportBackup, parsePrizeJson, previewBackup } from './backup'
import { SEED_PERIODS } from '../prize-data/seed'
import { loadState, saveState, STORAGE_KEY, CORRUPT_KEY } from '../storage/storage'

const mk = (num: string, date = '2026-07-15', extra = {}) => buildInvoice({ invoiceDate: date, invoiceNumber: num, amount: 100, ...extra }, 'manual')

describe('CSV', () => {
  it('19 欄位含逗號、引號與中文備註可來回轉換', () => {
    const rows = [
      ['a', '含,逗號', '他說"你好"', '多行\n備註', '中文備註'],
      ['1', '', '2', '3', '4'],
    ]
    expect(parseCsv(toCsv(rows))).toEqual(rows)
  })
  it('支援 CRLF、BOM 與尾端空行', () => {
    const text = String.fromCharCode(0xfeff) + ['a,b', 'c,d', '', ''].join('\r\n')
    expect(parseCsv(text)).toEqual([['a', 'b'], ['c', 'd']])
  })
  it('匯出 CSV 含備註逗號與引號', () => {
    const csv = invoicesToCsv([mk('AB12345678', '2026-07-15', { note: '午餐, "牛肉麵"' })])
    const rows = parseCsv(csv)
    expect(rows[0][0]).toBe('period')
    expect(rows[1][2]).toBe('AB12345678')
    expect(rows[1][4]).toBe('午餐, "牛肉麵"')
  })
  it('防止公式注入', () => {
    expect(toCsv([['=1+1']])).toBe("'=1+1")
  })
})

describe('批次輸入', () => {
  it('純號碼與 CSV 混合，備註可含逗號', () => {
    const r = parseBatchInput('ab-12345678\n2026-08-03,cd00012345,250,"晚餐, 朋友"\n\n', '2026-07-01', '115-07-08')
    expect(r.errors).toEqual([])
    expect(r.drafts[0]).toMatchObject({ invoiceNumber: 'AB12345678', period: '115-07-08', amount: 0 })
    expect(r.drafts[1]).toMatchObject({ invoiceNumber: 'CD00012345', amount: 250, note: '晚餐, 朋友', invoiceDate: '2026-08-03' })
  })
  it('保留前導零並回報錯誤行', () => {
    const r = parseBatchInput('AB00000001\nXX123\n2026-13-01,AB12345678,1\n2026-07-01,AB12345678,-5', '2026-07-01', '115-07-08')
    expect(r.drafts[0].invoiceNumber).toBe('AB00000001')
    expect(r.errors.map((e) => e.line)).toEqual([2, 3, 4])
  })
})

describe('重複發票防護', () => {
  it('14 同期別相同號碼視為重複，不覆蓋；不同期別允許', () => {
    const a = mk('AB12345678')
    const plan = planAdd([a], [mk('ab12345678'), mk('AB12345678', '2026-09-10'), mk('CD00000000'), mk('CD00000000')])
    expect(plan.duplicates).toHaveLength(2)
    expect(plan.toAdd.map((i) => i.period)).toEqual(['115-09-10', '115-07-08'])
  })
})

describe('備份', () => {
  const existing = { invoices: [] as ReturnType<typeof mk>[], prizePeriods: [] }
  it('17 JSON 匯出再匯入資料一致', () => {
    const invoices = [mk('AB00000001', '2026-07-15', { note: '備註,測試' }), mk('CD12345678', '2026-08-20', { isCloud: true })]
    const json = exportBackup({ invoices, prizePeriods: [{ ...SEED_PERIODS[0], source: 'user-import' }] })
    const p = previewBackup(json, existing)
    expect(p.ok).toBe(true)
    expect(p.invalid).toEqual([])
    expect(p.newInvoices.map((i) => ({ ...i, source: 'manual' }))).toEqual(invoices)
    expect(p.newPeriods).toEqual([{ ...SEED_PERIODS[0], source: 'user-import' }])
  })
  it('預覽標出重複與格式錯誤', () => {
    const a = mk('AB00000001')
    const json = JSON.stringify({ app: 'invoice-lucky', version: 1, exportedAt: 'x', invoices: [a, { ...mk('CD00000002'), invoiceNumber: 'bad' }], prizePeriods: [] })
    const p = previewBackup(json, { invoices: [a], prizePeriods: [] })
    expect(p.duplicateInvoices).toHaveLength(1)
    expect(p.invalid).toHaveLength(1)
    expect(p.newInvoices).toHaveLength(0)
  })
  it('18 無效 JSON 或非備份檔回報 fatal 且不產生變更', () => {
    expect(previewBackup('{oops', existing)).toMatchObject({ ok: false, fatal: { key: 'import.notJson' } })
    expect(previewBackup('{"hello":1}', existing)).toMatchObject({ ok: false, fatal: { key: 'import.notBackup' } })
  })
  it('匯入的獎號不得自稱官方', () => {
    const json = JSON.stringify({ app: 'invoice-lucky', version: 1, exportedAt: 'x', invoices: [], prizePeriods: [SEED_PERIODS[0]] })
    expect(previewBackup(json, existing).newPeriods[0].source).toBe('user-import')
  })
  it('獎號 JSON 匯入驗證', () => {
    const ok = parsePrizeJson(JSON.stringify(SEED_PERIODS[1]))
    expect(ok.periods[0]).toMatchObject({ id: '115-05-06', source: 'user-import' })
    const bad = parsePrizeJson(JSON.stringify([{ ...SEED_PERIODS[1], grandPrize: '123' }]))
    expect(bad.periods).toHaveLength(0)
    expect(bad.errors).toHaveLength(1)
    expect(parsePrizeJson('nope').errors).toHaveLength(1)
  })
})

describe('本機儲存', () => {
  const fake = () => {
    const m = new Map<string, string>()
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m }
  }
  it('存取來回一致', () => {
    const s = fake()
    const invoices = [mk('AB00000001')]
    expect(saveState({ version: 1, invoices, userPeriods: [] }, s)).toBeNull()
    expect(loadState(s).state.invoices).toEqual(invoices)
  })
  it('損毀資料會另存備份並以空資料啟動', () => {
    const s = fake()
    s.setItem(STORAGE_KEY, '{broken')
    const r = loadState(s)
    expect(r.warning).toBeTruthy()
    expect(r.state.invoices).toEqual([])
    expect(s.m.get(CORRUPT_KEY)).toBe('{broken')
  })
  it('略過格式異常的單筆資料並保留其餘', () => {
    const s = fake()
    s.setItem(STORAGE_KEY, JSON.stringify({ version: 1, invoices: [mk('AB00000001'), { bad: true }], userPeriods: [] }))
    const r = loadState(s)
    expect(r.state.invoices).toHaveLength(1)
    expect(r.warning).toBeTruthy()
  })
})
