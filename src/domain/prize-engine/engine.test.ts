import { describe, expect, it } from 'vitest'
import type { PrizePeriod } from '../models/types'
import { isClaimExpired, matchInvoice, summarize } from './engine'

const period: PrizePeriod = {
  id: '115-07-08',
  year: 115,
  months: [7, 8],
  claimStart: '2026-10-06',
  claimEnd: '2027-01-05',
  specialPrize: '89996565',
  grandPrize: '91098182',
  firstPrizes: ['54348835', '44991397', '06595111'],
  source: 'official',
}
const TODAY = '2026-11-08'
const m = (num: string, p: PrizePeriod | null = period, extra = {}) =>
  matchInvoice({ period: '115-07-08', invoiceNumber: num, ...extra }, p ?? undefined, TODAY)

describe('matchInvoice 一般獎項', () => {
  it('1 特別獎完整命中', () => {
    const r = m('AB89996565')
    expect(r).toMatchObject({ status: 'won', tierId: 'special', amount: 10_000_000, matchedNumber: '89996565' })
  })
  it('2 特獎完整命中', () => {
    expect(m('ZZ91098182')).toMatchObject({ status: 'won', tierId: 'grand', amount: 2_000_000 })
  })
  it('3 頭獎完整命中', () => {
    expect(m('AA54348835')).toMatchObject({ status: 'won', tierId: 'first', amount: 200_000 })
  })
  it('4 二獎末 7 位', () => {
    expect(m('AA04348835')).toMatchObject({ tierId: 'second', amount: 40_000 })
  })
  it('5 三獎末 6 位', () => {
    expect(m('AA00348835')).toMatchObject({ tierId: 'third', amount: 10_000 })
  })
  it('6 四獎末 5 位', () => {
    expect(m('AA00048835')).toMatchObject({ tierId: 'fourth', amount: 4_000 })
  })
  it('7 五獎末 4 位', () => {
    expect(m('AA00008835')).toMatchObject({ tierId: 'fifth', amount: 1_000 })
  })
  it('8 六獎末 3 位', () => {
    expect(m('AA00000835')).toMatchObject({ tierId: 'sixth', amount: 200 })
  })
  it('9 末位不符為未中獎', () => {
    expect(m('AA12345678')).toMatchObject({ status: 'lost', amount: 0 })
    expect(m('AA00000834').status).toBe('lost')
  })
  it('10 前導零不遺失（頭獎 06595111）', () => {
    expect(m('AA06595111')).toMatchObject({ tierId: 'first', matchedNumber: '06595111' })
    expect(m('AA16595111')).toMatchObject({ tierId: 'second' })
  })
  it('11 多組頭獎任一組命中', () => {
    expect(m('AA44991397').tierId).toBe('first')
    expect(m('AA00000397').matchedNumber).toBe('44991397')
  })
  it('12 多獎項命中只計最高獎（沿用頭獎末碼同時符合 3~8 位）', () => {
    const r = m('AA54348835')
    expect(r.tierId).toBe('first')
    expect(r.amount).toBe(200_000)
  })
  it('二至六獎不與特別獎／特獎末碼比對', () => {
    // 末 3 位 565 為特別獎末碼，但不屬頭獎末碼
    expect(m('AA00000565').status).toBe('lost')
    expect(m('AA00000182').status).toBe('lost')
  })
  it('英文字軌不影響比對', () => {
    expect(m('AB54348835').tierId).toBe(m('XY54348835').tierId)
  })
})

describe('期別與資料缺漏', () => {
  it('13 不同期別不可互相對獎', () => {
    const r = matchInvoice({ period: '115-05-06', invoiceNumber: 'AB89996565' }, period, TODAY)
    expect(r.status).toBe('no-data')
  })
  it('15 無獎號資料時不誤判未中獎', () => {
    expect(m('AB89996565', null).status).toBe('no-data')
    expect(m('AB89996565', { ...period, firstPrizes: [] }).status).toBe('no-data')
    expect(m('AB89996565', { ...period, grandPrize: undefined }).status).toBe('no-data')
  })
  it('16 領獎期限逾期標示', () => {
    const expired = { ...period, claimEnd: '2026-11-05' }
    expect(isClaimExpired(expired, '2026-11-08')).toBe(true)
    expect(isClaimExpired(expired, '2026-11-05')).toBe(false)
    expect(m('AB89996565', expired).claimExpired).toBe(true)
    expect(m('AB89996565').claimExpired).toBe(false)
  })
  it('規則由期別資料驅動（可覆寫獎金）', () => {
    const custom: PrizePeriod = {
      ...period,
      tiers: [{ id: 'first', name: '頭獎', source: 'first', matchLength: 8, amount: 123, rank: 1 }],
    }
    expect(m('AA54348835', custom)).toMatchObject({ amount: 123 })
    expect(m('AA04348835', custom).status).toBe('lost')
  })
})

describe('雲端專屬獎', () => {
  const withCloud: PrizePeriod = {
    ...period,
    cloudPrizes: [
      { id: 'c500', name: '雲端專屬獎 500 元', amount: 500, numbers: ['123'], matchLength: 3, eligibility: 'cloud-only' },
      { id: 'c2k', name: '雲端專屬獎 2000 元', amount: 2000, numbers: ['AB12345678'], matchLength: 10, eligibility: 'cloud-only' },
    ],
  }
  it('紙本（未標示雲端）不適用雲端專屬獎', () => {
    expect(m('AA00000123', withCloud).status).toBe('lost')
  })
  it('標示雲端者可命中雲端獎', () => {
    expect(m('AA00000123', withCloud, { isCloud: true })).toMatchObject({ tierId: 'c500', amount: 500 })
    expect(m('AB12345678', withCloud, { isCloud: true })).toMatchObject({ tierId: 'c2k', amount: 2000 })
  })
  it('同時命中一般獎與雲端獎只計金額最高者', () => {
    const r = m('AA54348835', { ...withCloud, cloudPrizes: [{ ...withCloud.cloudPrizes![0], numbers: ['835'], amount: 500 }] }, { isCloud: true })
    expect(r.tierId).toBe('first')
    const r2 = m('AA00000835', { ...withCloud, cloudPrizes: [{ ...withCloud.cloudPrizes![0], numbers: ['835'], amount: 500 }] }, { isCloud: true })
    expect(r2).toMatchObject({ tierId: 'c500', amount: 500 })
  })
})

describe('summarize', () => {
  it('分開統計可領與逾期金額', () => {
    const s = summarize([
      { status: 'won', amount: 200, claimExpired: false },
      { status: 'won', amount: 1000, claimExpired: true },
      { status: 'lost', amount: 0, claimExpired: false },
      { status: 'no-data', amount: 0, claimExpired: false },
    ])
    expect(s).toEqual({ total: 4, won: 2, noData: 1, claimableAmount: 200, expiredAmount: 1000 })
  })
})
