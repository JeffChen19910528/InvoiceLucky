import { useMemo } from 'react'
import { useAppStore, mergePeriods } from './appStore'
import { matchInvoice } from '../domain/prize-engine/engine'
import { todayIso } from '../domain/period/period'
import type { Invoice, MatchResult, PrizePeriod } from '../domain/models/types'

export function usePeriods(): PrizePeriod[] {
  const userPeriods = useAppStore((s) => s.userPeriods)
  return useMemo(() => mergePeriods(userPeriods), [userPeriods])
}

export function useResults(): { periods: PrizePeriod[]; results: Map<string, MatchResult>; invoices: Invoice[] } {
  const invoices = useAppStore((s) => s.invoices)
  const periods = usePeriods()
  const results = useMemo(() => {
    const byId = new Map(periods.map((p) => [p.id, p]))
    const today = todayIso()
    return new Map(invoices.map((i) => [i.id, matchInvoice(i, byId.get(i.period), today)]))
  }, [invoices, periods])
  return { periods, results, invoices }
}
