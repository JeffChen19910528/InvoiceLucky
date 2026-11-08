import { prizePeriodSchema, type PrizePeriod } from '../../domain/models/types'
import { joinMsgs, msg, type Msg } from '../../domain/models/message'
import { makePeriodId, rocToIso } from '../../domain/period/period'

export class OfficialParseError extends Error {
  constructor(readonly msg: Msg) {
    super(msg.key)
  }
}

const clean = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, '')

/**
 * 解析財政部稅務入口網「中獎號碼單」頁面 HTML（invoice.etax.nat.gov.tw 的
 * index.html / lastNumber.html）。結構不符時丟出 OfficialParseError，不回退到任何舊資料。
 * 使用者需自行複製頁面原始碼貼上（該站未提供 CORS，瀏覽器無法直接讀取）。
 */
export function parseOfficialHtml(html: string, now = new Date()): PrizePeriod {
  const doc = new DOMParser().parseFromString(html, 'text/html')

  const title = doc.querySelector('a.etw-on')?.getAttribute('title') ?? ''
  const pm = /(\d{2,3})年(\d{2})-(\d{2})月中獎號碼單/.exec(title)
  if (!pm) throw new OfficialParseError(msg('parser.noTitle'))
  const year = Number(pm[1])
  const months: [number, number] = [Number(pm[2]), Number(pm[3])]

  let special: string | undefined
  let grand: string | undefined
  let first: string[] = []
  for (const tr of Array.from(doc.querySelectorAll('tr'))) {
    const label = clean(tr.querySelector('td')?.textContent)
    const nums = Array.from(tr.querySelectorAll('p.etw-tbiggest')).map((p) => clean(p.textContent))
    if (label === '特別獎' && !special) special = nums[0]
    else if (label === '特獎' && !grand) grand = nums[0]
    else if (label === '頭獎' && first.length === 0) first = nums
  }

  const cm = /領獎期間自(\d+)年(\d+)月(\d+)日起至(\d+)年(\d+)月(\d+)日止/.exec(clean(doc.body?.textContent))

  const candidate = {
    id: makePeriodId(year, months),
    year,
    months,
    claimStart: cm ? rocToIso(+cm[1], +cm[2], +cm[3]) : undefined,
    claimEnd: cm ? rocToIso(+cm[4], +cm[5], +cm[6]) : undefined,
    specialPrize: special,
    grandPrize: grand,
    firstPrizes: first,
    source: 'user-import' as const,
    sourceUrl: 'https://invoice.etax.nat.gov.tw/lastNumber.html',
    fetchedAt: now.toISOString(),
  }
  const parsed = prizePeriodSchema.safeParse(candidate)
  if (!parsed.success || !special || !grand || first.length === 0) {
    const detail = parsed.success
      ? msg('parser.missingNumbers')
      : joinMsgs(parsed.error.issues.map((i) => msg('err.field', { path: i.path.join('.'), detail: msg(i.message) })))
    throw new OfficialParseError(msg('parser.failed', { detail }))
  }
  return parsed.data
}
