import { z } from 'zod'
import { prizePeriodSchema, type PrizePeriod } from '../../domain/models/types'

/** 由排程同步產生、與網站一起部署的官方獎號檔（同源，不涉及 CORS）。 */
export const PUBLISHED_URL = `${import.meta.env.BASE_URL}data/prize-periods.json`

const fileSchema = z.object({ generatedAt: z.string(), periods: z.array(z.unknown()) })

export interface PublishedData {
  periods: PrizePeriod[]
  generatedAt: string
  /** 格式不符而略過的筆數。 */
  skipped: number
}

/** 讀取並驗證已發佈的獎號檔；任何失敗都會丟出錯誤，由呼叫端決定如何呈現。 */
export async function fetchPublishedPeriods(fetchFn: typeof fetch = fetch, url: string = PUBLISHED_URL): Promise<PublishedData> {
  const res = await fetchFn(url, { cache: 'no-cache' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const head = fileSchema.parse(await res.json())
  const periods: PrizePeriod[] = []
  let skipped = 0
  for (const raw of head.periods) {
    const r = prizePeriodSchema.safeParse(raw)
    if (r.success) periods.push(r.data)
    else skipped++
  }
  return { periods, generatedAt: head.generatedAt, skipped }
}
