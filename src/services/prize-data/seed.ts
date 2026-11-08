import type { PrizePeriod } from '../../domain/models/types'

/**
 * 內建官方獎號快照。
 * 於 2026-11-08 直接讀取財政部稅務入口網（https://invoice.etax.nat.gov.tw/）頁面取得，
 * 屬官方資料的靜態快照，並非即時同步；新期別請至「設定」匯入。
 * 雲端專屬獎號碼僅以 PDF 清單公布，未內建。
 */
const FETCHED_AT = '2026-11-08T09:04:00Z'

export const SEED_PERIODS: PrizePeriod[] = [
  {
    id: '115-07-08',
    year: 115,
    months: [7, 8],
    claimStart: '2026-10-06',
    claimEnd: '2027-01-05',
    specialPrize: '89996565',
    grandPrize: '91098182',
    firstPrizes: ['54348835', '44991397', '06595111'],
    source: 'official',
    sourceUrl: 'https://invoice.etax.nat.gov.tw/index.html',
    fetchedAt: FETCHED_AT,
    verifiedAt: FETCHED_AT,
  },
  {
    id: '115-05-06',
    year: 115,
    months: [5, 6],
    claimStart: '2026-08-06',
    claimEnd: '2026-11-05',
    specialPrize: '38548029',
    grandPrize: '10138845',
    firstPrizes: ['24121106', '28589937', '83663333'],
    source: 'official',
    sourceUrl: 'https://invoice.etax.nat.gov.tw/lastNumber.html',
    fetchedAt: FETCHED_AT,
    verifiedAt: FETCHED_AT,
  },
]

export const OFFICIAL_LINKS = [
  { label: 'link.latest', url: 'https://invoice.etax.nat.gov.tw/lastNumber.html' },
  { label: 'link.cloud', url: 'https://invoice.etax.nat.gov.tw/cloudNowNumber.html' },
  { label: 'link.platform', url: 'https://www.einvoice.nat.gov.tw/' },
] as const
