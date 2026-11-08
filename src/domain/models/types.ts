import { z } from 'zod'
import type { Msg } from './message'

export const PERIOD_ID_RE = /^\d{2,3}-(01-02|03-04|05-06|07-08|09-10|11-12)$/
export const INVOICE_NUMBER_RE = /^[A-Z]{2}\d{8}$/
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'err.dateFormat')
const eightDigits = z.string().regex(/^\d{8}$/, 'err.eightDigits')

export type PrizeSource = 'special' | 'grand' | 'first'

/** 一般獎項規則（資料驅動；期別可覆寫 tiers）。 */
export const prizeTierSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  source: z.enum(['special', 'grand', 'first']),
  matchLength: z.number().int().min(1).max(8),
  amount: z.number().int().nonnegative(),
  rank: z.number().int().positive(),
})
export type PrizeTier = z.infer<typeof prizeTierSchema>

export const cloudPrizeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  amount: z.number().int().nonnegative(),
  numbers: z.array(z.string().regex(/^[A-Z0-9]{3,10}$/)).min(1),
  /** 比對末幾碼（10 = 含字軌完整比對） */
  matchLength: z.number().int().min(3).max(10),
  eligibility: z.literal('cloud-only'),
})
export type CloudPrize = z.infer<typeof cloudPrizeSchema>

export const prizePeriodSchema = z.object({
  id: z.string().regex(PERIOD_ID_RE, 'err.periodFormat'),
  year: z.number().int().positive(),
  months: z.tuple([z.number().int().min(1).max(11), z.number().int().min(2).max(12)]),
  drawDate: isoDate.optional(),
  claimStart: isoDate.optional(),
  claimEnd: isoDate.optional(),
  specialPrize: eightDigits.optional(),
  grandPrize: eightDigits.optional(),
  firstPrizes: z.array(eightDigits),
  tiers: z.array(prizeTierSchema).optional(),
  cloudPrizes: z.array(cloudPrizeSchema).optional(),
  source: z.enum(['official', 'user-import', 'demo']),
  sourceUrl: z.string().optional(),
  fetchedAt: z.string().optional(),
  verifiedAt: z.string().optional(),
})
export type PrizePeriod = z.infer<typeof prizePeriodSchema>

export const invoiceSchema = z.object({
  id: z.string().min(1),
  period: z.string().regex(PERIOD_ID_RE),
  invoiceDate: isoDate,
  invoiceNumber: z.string().regex(INVOICE_NUMBER_RE, 'err.invoiceNumber'),
  amount: z.number().int().nonnegative(),
  note: z.string().optional(),
  /** 使用者標示為雲端發票（載具歸戶、未列印）；紙本預設為 false。 */
  isCloud: z.boolean().optional(),
  source: z.enum(['manual', 'import']),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Invoice = z.infer<typeof invoiceSchema>

export const backupSchema = z.object({
  app: z.literal('invoice-lucky'),
  version: z.literal(1),
  exportedAt: z.string(),
  invoices: z.array(z.unknown()),
  prizePeriods: z.array(z.unknown()).default([]),
})

export type MatchStatus = 'won' | 'lost' | 'no-data'
export interface MatchResult {
  status: MatchStatus
  tierId?: string
  tierName?: string
  amount: number
  /** 命中的獎號 */
  matchedNumber?: string
  claimExpired: boolean
  reason?: Msg
}
