import { msg } from '../models/message'
import type { Invoice, MatchResult, PrizePeriod, PrizeTier } from '../models/types'

/** 預設獎項規則（財政部統一發票給獎辦法）。期別資料可用 `tiers` 覆寫。 */
export const DEFAULT_TIERS: PrizeTier[] = [
  { id: 'special', name: '特別獎', source: 'special', matchLength: 8, amount: 10_000_000, rank: 1 },
  { id: 'grand', name: '特獎', source: 'grand', matchLength: 8, amount: 2_000_000, rank: 2 },
  { id: 'first', name: '頭獎', source: 'first', matchLength: 8, amount: 200_000, rank: 3 },
  { id: 'second', name: '二獎', source: 'first', matchLength: 7, amount: 40_000, rank: 4 },
  { id: 'third', name: '三獎', source: 'first', matchLength: 6, amount: 10_000, rank: 5 },
  { id: 'fourth', name: '四獎', source: 'first', matchLength: 5, amount: 4_000, rank: 6 },
  { id: 'fifth', name: '五獎', source: 'first', matchLength: 4, amount: 1_000, rank: 7 },
  { id: 'sixth', name: '六獎', source: 'first', matchLength: 3, amount: 200, rank: 8 },
]

export function normalizeInvoiceNumber(raw: string): string {
  return raw.trim().toUpperCase().replace(/[\s-]/g, '')
}

export function periodTiers(period: PrizePeriod): PrizeTier[] {
  return [...(period.tiers ?? DEFAULT_TIERS)].sort((a, b) => a.rank - b.rank)
}

/** 該期是否具備完整的一般獎號（特別獎、特獎、頭獎皆有）。 */
export function hasPrizeData(period: PrizePeriod | undefined): period is PrizePeriod {
  return !!period && !!period.specialPrize && !!period.grandPrize && period.firstPrizes.length > 0
}

function numbersFor(period: PrizePeriod, source: PrizeTier['source']): string[] {
  if (source === 'special') return period.specialPrize ? [period.specialPrize] : []
  if (source === 'grand') return period.grandPrize ? [period.grandPrize] : []
  return period.firstPrizes
}

export function isClaimExpired(period: PrizePeriod | undefined, today: string): boolean {
  return !!period?.claimEnd && today > period.claimEnd
}

type Candidate = { id: string; name: string; amount: number; rank: number; matched: string }

/**
 * 對單張發票對獎。純函式：
 * - 只以發票所屬期別的資料比對（呼叫端需傳入同一期別，否則回傳 no-data）。
 * - 號碼全程為字串，保留前導零。
 * - 多獎項命中只回傳金額最高的一個（同額取 rank 較前者）。
 */
export function matchInvoice(
  invoice: Pick<Invoice, 'period' | 'invoiceNumber' | 'isCloud'>,
  period: PrizePeriod | undefined,
  today: string,
): MatchResult {
  if (!period || period.id !== invoice.period) {
    return { status: 'no-data', amount: 0, claimExpired: false, reason: msg('reason.noPeriodData') }
  }
  if (!hasPrizeData(period)) {
    return { status: 'no-data', amount: 0, claimExpired: false, reason: msg('reason.incompletePrize') }
  }
  const num = normalizeInvoiceNumber(invoice.invoiceNumber)
  const digits = num.slice(2)
  const claimExpired = isClaimExpired(period, today)
  const candidates: Candidate[] = []

  for (const tier of periodTiers(period)) {
    for (const prize of numbersFor(period, tier.source)) {
      if (tier.matchLength <= prize.length && digits.slice(-tier.matchLength) === prize.slice(-tier.matchLength)) {
        candidates.push({ ...tier, matched: prize })
        break
      }
    }
  }

  // 雲端專屬獎：僅限使用者標示為雲端發票者，且資料需由期別資料提供。
  if (invoice.isCloud && period.cloudPrizes) {
    period.cloudPrizes.forEach((cp, i) => {
      for (const n of cp.numbers) {
        const target = cp.matchLength >= 10 ? num : digits
        const len = Math.min(cp.matchLength >= 10 ? 10 : cp.matchLength, n.length)
        if (target.slice(-len) === n.slice(-len)) {
          candidates.push({ id: cp.id, name: cp.name, amount: cp.amount, rank: 1000 + i, matched: n })
          break
        }
      }
    })
  }

  if (candidates.length === 0) return { status: 'lost', amount: 0, claimExpired }
  candidates.sort((a, b) => b.amount - a.amount || a.rank - b.rank)
  const best = candidates[0]
  return {
    status: 'won',
    tierId: best.id,
    tierName: best.name,
    amount: best.amount,
    matchedNumber: best.matched,
    claimExpired,
  }
}

export interface InvoiceSummary {
  total: number
  won: number
  noData: number
  /** 未過領獎期限的中獎總額 */
  claimableAmount: number
  /** 已逾領獎期限的中獎總額 */
  expiredAmount: number
}

export function summarize(results: MatchResult[]): InvoiceSummary {
  const s: InvoiceSummary = { total: results.length, won: 0, noData: 0, claimableAmount: 0, expiredAmount: 0 }
  for (const r of results) {
    if (r.status === 'no-data') s.noData++
    if (r.status !== 'won') continue
    s.won++
    if (r.claimExpired) s.expiredAmount += r.amount
    else s.claimableAmount += r.amount
  }
  return s
}
