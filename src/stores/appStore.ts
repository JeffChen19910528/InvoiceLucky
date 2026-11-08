import { create } from 'zustand'
import { msg, type Msg } from '../domain/models/message'
import type { Invoice, PrizePeriod } from '../domain/models/types'
import { SEED_PERIODS } from '../services/prize-data/seed'
import { loadState, saveState, clearState } from '../services/storage/storage'
import { invoiceKey, planAdd } from '../services/import-export/invoices'
import type { ImportPreview } from '../services/import-export/backup'
import { hasPrizeData } from '../domain/prize-engine/engine'

export interface AddOutcome {
  added: number
  duplicates: Invoice[]
}

interface AppState {
  invoices: Invoice[]
  userPeriods: PrizePeriod[]
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
}

/** 使用者資料優先於內建快照；其餘使用內建官方快照。 */
export function mergePeriods(userPeriods: PrizePeriod[]): PrizePeriod[] {
  const map = new Map<string, PrizePeriod>()
  for (const p of SEED_PERIODS) map.set(p.id, p)
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
  }
})
