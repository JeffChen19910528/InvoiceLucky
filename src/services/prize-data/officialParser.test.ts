import { describe, expect, it } from 'vitest'
import { OfficialParseError, parseOfficialHtml } from './officialParser'
import { SEED_PERIODS } from './seed'

/** 與財政部稅務入口網頁面結構相同的精簡片段（取自 2026-11-08 實測回應）。 */
const FIXTURE = `
<html><body>
<ul><li><a class="etw-on" href="index.html" title="115年07-08月中獎號碼單">115年07-08月中獎號碼單</a></li></ul>
<table><tbody>
<tr><td class="text-center">特別獎</td><td><p class="etw-tbiggest"><span class="fw-bold etw-color-red">89996565</span></p><p class="mb-0">獎金1,000萬元</p></td></tr>
<tr><td class="text-center">特獎</td><td><p class="etw-tbiggest"><span class="fw-bold etw-color-red">91098182</span></p></td></tr>
<tr><td class="text-center">頭獎</td><td>
 <p class="etw-tbiggest mb-md-4"><span class="fw-bold">54348</span><span
   class="fw-bold etw-color-red">835</span></p>
 <p class="etw-tbiggest mb-md-4"><span class="fw-bold">44991</span><span
   class="fw-bold etw-color-red">397</span></p>
 <p class="etw-tbiggest mb-md-4"><span class="fw-bold">06595</span><span
   class="fw-bold etw-color-red">111</span></p>
</td></tr>
<tr><td colspan="2" class="text-center">領獎期間自115年10月06日起至116年01月05日止</td></tr>
</tbody></table>
<table><tbody><tr><td>特別獎</td><td><p class="etw-tbiggest">00000000</p></td></tr></tbody></table>
</body></html>`

describe('parseOfficialHtml', () => {
  it('解析期別、獎號（含前導零）與領獎期間，並標為 user-import', () => {
    const p = parseOfficialHtml(FIXTURE, new Date('2026-11-08T00:00:00Z'))
    const seed = SEED_PERIODS[0]
    expect(p).toMatchObject({
      id: '115-07-08',
      specialPrize: seed.specialPrize,
      grandPrize: seed.grandPrize,
      firstPrizes: seed.firstPrizes,
      claimStart: '2026-10-06',
      claimEnd: '2027-01-05',
      source: 'user-import',
    })
    expect(p.fetchedAt).toBe('2026-11-08T00:00:00.000Z')
  })
  it('只取第一組表格（頁面含手機／桌面重複區塊）', () => {
    expect(parseOfficialHtml(FIXTURE).specialPrize).toBe('89996565')
  })
  it('結構不符時明確失敗，不回退舊資料', () => {
    expect(() => parseOfficialHtml('<html><body>hi</body></html>')).toThrow(OfficialParseError)
    expect(() => parseOfficialHtml(FIXTURE.replace('89996565', '1234'))).toThrow(OfficialParseError)
    expect(() => parseOfficialHtml(FIXTURE.replace(/<tr><td class="text-center">頭獎.*?<\/tr>/s, ''))).toThrow(OfficialParseError)
  })
})
