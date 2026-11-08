import { create } from 'zustand'
import { msg, type Msg } from '../domain/models/message'
import type { Invoice, PrizePeriod } from '../domain/models/types'
import { SEED_PERIODS } from '../services/prize-data/seed'
import { fetchPublishedPeriods } from '../services/prize-data/published'
import { loadState, saveState, clearState } from '../services/storage/storage'
import { invoiceKey, planAdd } from '../services/import-export/invoices'
import type { ImportPreview } from '../services/import-export/backup'
import { hasPrizeData } from '../domain/prize-engine/engine'

export interface AddOutcome {
  added: number
  duplicates: Invoice[]
}

export type SyncStatus = { state: 'idle' | 'loading' | 'ok' | 'error'; generatedAt?: string }

interface AppState {
  invoices: Invoice[]
  userPeriods: PrizePeriod[]
  /** 由排程同步、隨網站部署的官方獎號（非使用者資料，不寫入 localStorage）。 */
  publishedPeriods: PrizePeriod[]
  syncStatus: SyncStatus
  selectedPeriod: string
  warning: Msg | null
  addInvoices: (list: Invoice[]) => AddOutcome
  updateInvoice: (id: string, patch: Partial<Omit<Invoice, 'id' | 'createdAt'>>) => { ok: boolean; message?: Msg }
  removeInvoice: (id: string) => void
  setSelectedPeriod: (id: string) => void
  savePeriods: (periods: PrizePeriod[]) => void
  removeUserPeriod: (id: string) => void
  commitImport: (preview: ImportPreview) => void
  clearAll: () => void
  dismissWarning: () => void
  syncPublished: (fetchFn?: typeof fetch) => Promise<void>
}

/** 優先序：使用者匯入 > 自動同步的官方資料 > 內建快照。 */
export function mergePeriods(userPeriods: PrizePeriod[], publishedPeriods: PrizePeriod[] = []): PrizePeriod[] {
  const map = new Map<string, PrizePeriod>()
  for (const p of SEED_PERIODS) map.set(p.id, p)
  for (const p of publishedPeriods) map.set(p.id, p)
  for (const p of userPeriods) map.set(p.id, p)
  return [...map.values()].sort((a, b) => (a.id < b.id ? 1 : -1))
}

export function latestPeriodWithData(periods: PrizePeriod[]): string | undefined {
  return periods.find((p) => hasPrizeData(p))?.id
}

const loaded = loadState()

export const useAppStore = create<AppState>((set, get) => {
  const persist = (patch: Partial<Pick<AppState, 'invoices' | 'userPeriods'>>) => {
    const next = { invoices: get().invoices, userPeriods: get().userPeriods, ...patch }
    const err = saveState({ version: 1, ...next })
    set({ ...patch, warning: err ?? get().warning })
  }
  return {
    invoices: loaded.state.invoices,
    userPeriods: loaded.state.userPeriods,
    selectedPeriod: latestPeriodWithData(mergePeriods(loaded.state.userPeriods)) ?? '',
    warning: loaded.warning ?? null,
    publishedPeriods: [],
    syncStatus: { state: 'idle' },

    addInvoices(list) {
      const { toAdd, duplicates } = planAdd(get().invoices, list)
      if (toAdd.length) persist({ invoices: [...get().invoices, ...toAdd] })
      return { added: toAdd.length, duplicates }
    },
    updateInvoice(id, patch) {
      const cur = get().invoices.find((i) => i.id === id)
      if (!cur) return { ok: false, message: msg('err.invoiceNotFound') }
      const next = { ...cur, ...patch, updatedAt: new Date().toISOString() }
      const clash = get().invoices.some(
        (i) => i.id !== id && invoiceKey(i.period, i.invoiceNumber) === invoiceKey(next.period, next.invoiceNumber),
      )
      if (clash) return { ok: false, message: msg('err.duplicateInPeriod') }
      persist({ invoices: get().invoices.map((i) => (i.id === id ? next : i)) })
      return { ok: true }
    },
    removeInvoice(id) {
      persist({ invoices: get().invoices.filter((i) => i.id !== id) })
    },
    setSelectedPeriod: (id) => set({ selectedPeriod: id }),
    savePeriods(periods) {
      const ids = new Set(periods.map((p) => p.id))
      persist({ userPeriods: [...get().userPeriods.filter((p) => !ids.has(p.id)), ...periods] })
    },
    removeUserPeriod(id) {
      persist({ userPeriods: get().userPeriods.filter((p) => p.id !== id) })
    },
    commitImport(preview) {
      if (!preview.ok) return
      const ids = new Set(preview.newPeriods.map((p) => p.id))
      persist({
        invoices: [...get().invoices, ...preview.newInvoices],
        userPeriods: [...get().userPeriods.filter((p) => !ids.has(p.id)), ...preview.newPeriods],
      })
    },
    clearAll() {
      clearState()
      set({ invoices: [], userPeriods: [] })
    },
    dismissWarning: () => set({ warning: null }),
    async syncPublished(fetchFn) {
      set({ syncStatus: { state: 'loading' } })
      try {
        const data = await fetchPublishedPeriods(fetchFn)
        const user = get().userPeriods
        const prevLatest = latestPeriodWithData(mergePeriods(user, get().publishedPeriods))
        const nextLatest = latestPeriodWithData(mergePeriods(user, data.periods))
        // 使用者還停在原本的最新期別時，自動跟到新開獎的那一期；手動選過別期則不動。
        const follow = get().selectedPeriod === (prevLatest ?? '') && nextLatest
        set({
          publishedPeriods: data.periods,
          syncStatus: { state: 'ok', generatedAt: data.generatedAt },
          ...(follow ? { selectedPeriod: nextLatest } : {}),
        })
      } catch {
        // 離線或檔案不可用：維持內建快照，並讓設定頁明示同步失敗（不靜默回退）。
        set({ syncStatus: { state: 'error' } })
      }
    },
  }
})
