const MONTH_PAIRS: Array<[number, number]> = [
  [1, 2],
  [3, 4],
  [5, 6],
  [7, 8],
  [9, 10],
  [11, 12],
]
const pad = (n: number) => String(n).padStart(2, '0')

export const toRocYear = (y: number) => y - 1911
export const toAdYear = (roc: number) => roc + 1911

export function makePeriodId(rocYear: number, months: [number, number]): string {
  return `${rocYear}-${pad(months[0])}-${pad(months[1])}`
}

export function parsePeriodId(id: string): { rocYear: number; months: [number, number] } | null {
  const m = /^(\d{2,3})-(\d{2})-(\d{2})$/.exec(id)
  if (!m) return null
  const a = Number(m[2])
  const b = Number(m[3])
  if (!MONTH_PAIRS.some(([x, y]) => x === a && y === b)) return null
  return { rocYear: Number(m[1]), months: [a, b] }
}

/** 由 ISO 日期（YYYY-MM-DD）推算所屬期別 id；無效日期回傳 null。 */
export function periodIdOfDate(iso: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  const dt = new Date(Date.UTC(y, mo - 1, d))
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null
  const pair = MONTH_PAIRS[Math.floor((mo - 1) / 2)]
  return makePeriodId(toRocYear(y), pair)
}

export function lastDayOfMonth(adYear: number, month: number): number {
  return new Date(Date.UTC(adYear, month, 0)).getUTCDate()
}

/** 期別的消費日期區間（ISO，含頭尾）。 */
export function periodRange(id: string): { start: string; end: string } | null {
  const p = parsePeriodId(id)
  if (!p) return null
  const y = toAdYear(p.rocYear)
  return {
    start: `${y}-${pad(p.months[0])}-01`,
    end: `${y}-${pad(p.months[1])}-${pad(lastDayOfMonth(y, p.months[1]))}`,
  }
}

export function isDateInPeriod(iso: string, id: string): boolean {
  const r = periodRange(id)
  return !!r && iso >= r.start && iso <= r.end
}

export function previousPeriodId(id: string): string | null {
  const p = parsePeriodId(id)
  if (!p) return null
  const idx = MONTH_PAIRS.findIndex(([a]) => a === p.months[0])
  return idx === 0 ? makePeriodId(p.rocYear - 1, MONTH_PAIRS[5]) : makePeriodId(p.rocYear, MONTH_PAIRS[idx - 1])
}

export function nextPeriodId(id: string): string | null {
  const p = parsePeriodId(id)
  if (!p) return null
  const idx = MONTH_PAIRS.findIndex(([a]) => a === p.months[0])
  return idx === 5 ? makePeriodId(p.rocYear + 1, MONTH_PAIRS[0]) : makePeriodId(p.rocYear, MONTH_PAIRS[idx + 1])
}

/** 由新到舊列出自 `fromId` 起往前 n 期。 */
export function recentPeriodIds(fromId: string, n: number): string[] {
  const out: string[] = []
  let cur: string | null = fromId
  while (cur && out.length < n) {
    out.push(cur)
    cur = previousPeriodId(cur)
  }
  return out
}

export function todayIso(d = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** ROC 日期（年,月,日）轉 ISO。 */
export function rocToIso(rocYear: number, month: number, day: number): string {
  return `${toAdYear(rocYear)}-${pad(month)}-${pad(day)}`
}

export function daysBetween(fromIso: string, toIso: string): number {
  const f = Date.parse(`${fromIso}T00:00:00Z`)
  const t = Date.parse(`${toIso}T00:00:00Z`)
  return Math.round((t - f) / 86_400_000)
}
