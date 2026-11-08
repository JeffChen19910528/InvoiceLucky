import { describe, expect, it } from 'vitest'
import { fetchPublishedPeriods } from './published'
import { SEED_PERIODS } from './seed'
import { mergePeriods } from '../../stores/appStore'

const respond = (body: unknown, status = 200) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch

describe('已發佈獎號檔', () => {
  it('驗證並載入期別，略過格式錯誤的筆數', async () => {
    const good = { ...SEED_PERIODS[0], id: '115-09-10', months: [9, 10] }
    const bad = { ...SEED_PERIODS[0], id: '115-11-12', months: [11, 12], grandPrize: '123' }
    const r = await fetchPublishedPeriods(respond({ generatedAt: '2026-11-25T00:00:00Z', periods: [good, bad] }), 'x')
    expect(r.periods.map((p) => p.id)).toEqual(['115-09-10'])
    expect(r.skipped).toBe(1)
    expect(r.generatedAt).toBe('2026-11-25T00:00:00Z')
  })

  it('HTTP 錯誤或內容不是預期格式時丟出錯誤，不回傳假資料', async () => {
    await expect(fetchPublishedPeriods(respond({}, 404), 'x')).rejects.toThrow('404')
    await expect(fetchPublishedPeriods(respond({ nope: 1 }), 'x')).rejects.toThrow()
    const net = (async () => {
      throw new TypeError('network')
    }) as unknown as typeof fetch
    await expect(fetchPublishedPeriods(net, 'x')).rejects.toThrow('network')
  })
})

describe('期別資料合併優先序', () => {
  it('使用者匯入 > 自動同步 > 內建快照；新期別被加入並排在最前', () => {
    const synced = [
      { ...SEED_PERIODS[0], id: '115-09-10', months: [9, 10] as [number, number], specialPrize: '11111111' },
      { ...SEED_PERIODS[0], specialPrize: '22222222' },
    ]
    const user = [{ ...SEED_PERIODS[0], specialPrize: '33333333', source: 'user-import' as const }]
    const merged = mergePeriods(user, synced)
    expect(merged.map((p) => p.id)).toEqual(['115-09-10', '115-07-08', '115-05-06'])
    expect(merged.find((p) => p.id === '115-07-08')?.specialPrize).toBe('33333333')
    expect(mergePeriods([], synced).find((p) => p.id === '115-07-08')?.specialPrize).toBe('22222222')
    expect(mergePeriods([], []).find((p) => p.id === '115-07-08')?.specialPrize).toBe(SEED_PERIODS[0].specialPrize)
  })
})
