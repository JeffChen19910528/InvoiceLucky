/**
 * 伺服器端同步官方獎號（由 GitHub Actions 排程執行，也可本機 `npm run prizes:update`）。
 *
 * 瀏覽器無法跨網域讀取財政部網站（無 CORS 標頭），所以改在伺服器端抓取，
 * 解析後寫入 public/data/prize-periods.json，網頁再讀取自己網站上的這份檔案。
 *
 * - 重用 officialParser；結構不符時該頁面失敗，不會寫入任何猜測的資料。
 * - 與既有檔案合併（以期別 id 為鍵），因此歷史期別會累積。
 * - 內容沒有變動就不改檔，避免產生多餘的 commit。
 * - 任一頁面失敗時以非 0 結束，讓 workflow 顯示警告；成功的頁面仍會寫入。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { JSDOM } from 'jsdom'
import { prizePeriodSchema, type PrizePeriod } from '../src/domain/models/types'
import { parseOfficialHtml } from '../src/services/prize-data/officialParser'

const OUT = 'public/data/prize-periods.json'
const SOURCES = ['https://invoice.etax.nat.gov.tw/index.html', 'https://invoice.etax.nat.gov.tw/lastNumber.html']
const USER_AGENT = 'InvoiceLucky-prize-sync (https://github.com/JeffChen19910528/InvoiceLucky)'

// officialParser 使用瀏覽器的 DOMParser；在 Node 以 jsdom 提供。
globalThis.DOMParser = new JSDOM('').window.DOMParser as unknown as typeof DOMParser

function readExisting(): PrizePeriod[] {
  if (!existsSync(OUT)) return []
  try {
    const json = JSON.parse(readFileSync(OUT, 'utf8')) as { periods?: unknown[] }
    return (json.periods ?? []).flatMap((p) => {
      const r = prizePeriodSchema.safeParse(p)
      return r.success ? [r.data] : []
    })
  } catch {
    return []
  }
}

const numbersOf = (p: PrizePeriod) => JSON.stringify([p.specialPrize, p.grandPrize, p.firstPrizes])

async function main() {
  const merged = new Map(readExisting().map((p) => [p.id, p]))
  const before = JSON.stringify([...merged.values()])
  let failed = 0

  for (const url of SOURCES) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'zh-TW' }, signal: AbortSignal.timeout(30_000) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const now = new Date().toISOString()
      const parsed = parseOfficialHtml(await res.text(), new Date(now))
      // 由我們直接從官方網站抓取並解析，標示為官方來源與實際頁面網址。
      const period: PrizePeriod = { ...parsed, source: 'official', sourceUrl: url, fetchedAt: now, verifiedAt: now }
      const old = merged.get(period.id)
      if (old && numbersOf(old) !== numbersOf(period)) console.log(`::warning::${period.id} 的獎號與先前記錄不同，已以官方頁面最新內容為準`)
      // 號碼與領獎期間都沒變時保留原本的時間戳，避免每天都產生 diff。
      const unchanged = old && numbersOf(old) === numbersOf(period) && old.claimStart === period.claimStart && old.claimEnd === period.claimEnd
      merged.set(period.id, unchanged ? old : period)
      console.log(`ok   ${period.id}  <- ${url}${unchanged ? ' (no change)' : ''}`)
    } catch (e) {
      failed++
      console.log(`::warning::同步失敗 ${url}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const periods = [...merged.values()].sort((a, b) => (a.id < b.id ? 1 : -1))
  if (JSON.stringify(periods) !== before) {
    mkdirSync(dirname(OUT), { recursive: true })
    const file = { generatedAt: new Date().toISOString(), source: 'https://invoice.etax.nat.gov.tw/', periods }
    writeFileSync(OUT, JSON.stringify(file, null, 2) + '\n', 'utf8')
    console.log(`wrote ${OUT} (${periods.length} periods)`)
  } else {
    console.log('no changes')
  }
  if (failed > 0) process.exitCode = 1
}

await main()
