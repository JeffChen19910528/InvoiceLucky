import { useMemo } from 'react'
import type { PrizePeriod } from '../domain/models/types'
import { periodIdOfDate, recentPeriodIds, todayIso } from '../domain/period/period'
import { hasPrizeData } from '../domain/prize-engine/engine'
import { useFormat, useT } from '../i18n'

/** 期別選單：已有資料的期別 + 已登錄發票的期別 + 近 8 期。 */
export function PeriodSelect({
  value,
  onChange,
  periods,
  extraIds = [],
  allowAll,
  id,
  label,
}: {
  value: string
  onChange: (v: string) => void
  periods: PrizePeriod[]
  extraIds?: string[]
  allowAll?: boolean
  id?: string
  label?: string
}) {
  const t = useT()
  const f = useFormat()
  const opts = useMemo(() => {
    const ids = new Set<string>([...periods.map((p) => p.id), ...extraIds, ...recentPeriodIds(periodIdOfDate(todayIso()) ?? '115-01-02', 8)])
    if (value) ids.add(value)
    return [...ids].sort().reverse()
  }, [periods, extraIds, value])
  const hasData = (pid: string) => hasPrizeData(periods.find((p) => p.id === pid))
  return (
    <select id={id} aria-label={label ?? t('period.label')} className="input" value={value} onChange={(e) => onChange(e.target.value)}>
      {allowAll && <option value="">{t('period.all')}</option>}
      {opts.map((pid) => (
        <option key={pid} value={pid}>
          {f.period(pid)}
          {hasData(pid) ? '' : t('period.noData')}
        </option>
      ))}
    </select>
  )
}
