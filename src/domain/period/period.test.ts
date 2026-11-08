import { describe, expect, it } from 'vitest'
import {
  isDateInPeriod,
  nextPeriodId,
  parsePeriodId,
  periodIdOfDate,
  periodRange,
  previousPeriodId,
  recentPeriodIds,
} from './period'

describe('period', () => {
  it('20 每月邊界對應期別', () => {
    const expected = ['01-02', '01-02', '03-04', '03-04', '05-06', '05-06', '07-08', '07-08', '09-10', '09-10', '11-12', '11-12']
    expected.forEach((p, i) => {
      const month = String(i + 1).padStart(2, '0')
      expect(periodIdOfDate(`2026-${month}-15`)).toBe(`115-${p}`)
      expect(periodIdOfDate(`2026-${month}-01`)).toBe(`115-${p}`)
    })
  })
  it('月底與月初邊界', () => {
    expect(periodIdOfDate('2026-02-28')).toBe('115-01-02')
    expect(periodIdOfDate('2026-03-01')).toBe('115-03-04')
    expect(periodIdOfDate('2026-12-31')).toBe('115-11-12')
    expect(periodIdOfDate('2027-01-01')).toBe('116-01-02')
  })
  it('閏年 2 月 29 日', () => {
    expect(periodIdOfDate('2028-02-29')).toBe('117-01-02')
    expect(periodIdOfDate('2027-02-29')).toBeNull()
    expect(periodRange('117-01-02')).toEqual({ start: '2028-01-01', end: '2028-02-29' })
    expect(periodRange('116-01-02')).toEqual({ start: '2027-01-01', end: '2027-02-28' })
  })
  it('無效日期', () => {
    expect(periodIdOfDate('2026-13-01')).toBeNull()
    expect(periodIdOfDate('abc')).toBeNull()
    expect(periodIdOfDate('2026-04-31')).toBeNull()
  })
  it('跨年前後期別', () => {
    expect(previousPeriodId('116-01-02')).toBe('115-11-12')
    expect(nextPeriodId('115-11-12')).toBe('116-01-02')
    expect(nextPeriodId('115-07-08')).toBe('115-09-10')
    expect(recentPeriodIds('115-03-04', 3)).toEqual(['115-03-04', '115-01-02', '114-11-12'])
  })
  it('parsePeriodId 驗證', () => {
    expect(parsePeriodId('115-07-08')).toEqual({ rocYear: 115, months: [7, 8] })
    expect(parsePeriodId('115-02-03')).toBeNull()
  })
  it('日期是否在期別內', () => {
    expect(isDateInPeriod('2026-08-31', '115-07-08')).toBe(true)
    expect(isDateInPeriod('2026-09-01', '115-07-08')).toBe(false)
  })
})
