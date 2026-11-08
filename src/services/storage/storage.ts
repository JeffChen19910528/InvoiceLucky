import { msg, type Msg } from '../../domain/models/message'
import { invoiceSchema, prizePeriodSchema, type Invoice, type PrizePeriod } from '../../domain/models/types'

export const STORAGE_KEY = 'invoice-lucky:v1'
export const CORRUPT_KEY = 'invoice-lucky:corrupt-backup'

export interface PersistedState {
  version: 1
  invoices: Invoice[]
  userPeriods: PrizePeriod[]
}

export interface LoadResult {
  state: PersistedState
  warning?: Msg
}

const empty = (): PersistedState => ({ version: 1, invoices: [], userPeriods: [] })

/** 讀取本機資料；損毀時保留原始內容到備份鍵並以空資料啟動，不會直接覆蓋。 */
export function loadState(storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage): LoadResult {
  let raw: string | null
  try {
    raw = storage.getItem(STORAGE_KEY)
  } catch {
    return { state: empty(), warning: msg('storage.unavailable') }
  }
  if (!raw) return { state: empty() }
  try {
    const json = JSON.parse(raw) as { version?: number; invoices?: unknown[]; userPeriods?: unknown[] }
    if (json.version !== 1 || !Array.isArray(json.invoices) || !Array.isArray(json.userPeriods)) throw new Error('shape')
    const invoices: Invoice[] = []
    let dropped = 0
    for (const r of json.invoices) {
      const p = invoiceSchema.safeParse(r)
      if (p.success) invoices.push(p.data)
      else dropped++
    }
    const userPeriods: PrizePeriod[] = []
    for (const r of json.userPeriods) {
      const p = prizePeriodSchema.safeParse(r)
      if (p.success) userPeriods.push(p.data)
      else dropped++
    }
    if (dropped > 0) {
      try {
        storage.setItem(CORRUPT_KEY, raw)
      } catch {
        /* ignore */
      }
      return { state: { version: 1, invoices, userPeriods }, warning: msg('storage.dropped', { n: dropped }) }
    }
    return { state: { version: 1, invoices, userPeriods } }
  } catch {
    try {
      storage.setItem(CORRUPT_KEY, raw)
    } catch {
      /* ignore */
    }
    return { state: empty(), warning: msg('storage.corrupt') }
  }
}

export function saveState(state: PersistedState, storage: Pick<Storage, 'setItem'> = localStorage): Msg | null {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state))
    return null
  } catch {
    return msg('storage.writeFailed')
  }
}

export function clearState(storage: Pick<Storage, 'removeItem'> = localStorage): void {
  try {
    storage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
