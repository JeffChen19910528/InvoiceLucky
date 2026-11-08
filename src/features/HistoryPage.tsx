import { useMemo, useState } from 'react'
import { useResults } from '../stores/hooks'
import { Empty } from '../components/ui'
import { SourceBadge } from '../components/badges'
import { PrizeNumbers } from '../components/PrizeNumbers'
import { hasPrizeData, periodTiers } from '../domain/prize-engine/engine'
import { parsePeriodId } from '../domain/period/period'
import { OFFICIAL_LINKS } from '../services/prize-data/seed'
import { useFormat, useT } from '../i18n'

export default function HistoryPage() {
  const t = useT()
  const f = useFormat()
  const { periods } = useResults()
  const years = useMemo(() => [...new Set(periods.map((p) => parsePeriodId(p.id)?.rocYear ?? 0))].sort((a, b) => b - a), [periods])
  const [year, setYear] = useState<number | 'all'>('all')
  const [open, setOpen] = useState<string>('')
  const list = periods.filter((p) => year === 'all' || parsePeriodId(p.id)?.rocYear === year)
  const na = t('common.notProvided')

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">{t('hist.title')}</h1>
        <select className="input w-40" aria-label={t('hist.filterYear')} value={year} onChange={(e) => setYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
          <option value="all">{t('hist.allYears')}</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {t('hist.year', { y })}
            </option>
          ))}
        </select>
      </div>
      <p className="text-sm text-slate-600">
        {t('hist.intro')}
        {OFFICIAL_LINKS.map((l, i) => (
          <span key={l.url}>
            {i > 0 && t('common.listSep')}
            <a className="text-brand-600 underline" href={l.url} target="_blank" rel="noreferrer noopener">
              {t(l.label)}
            </a>
          </span>
        ))}
      </p>
      {list.length === 0 ? (
        <Empty title={t('hist.empty')} />
      ) : (
        <ul className="space-y-2">
          {list.map((p) => (
            <li key={p.id} className="card" data-testid="history-row">
              <button
                className="flex w-full flex-wrap items-center justify-between gap-2 text-left"
                aria-expanded={open === p.id}
                onClick={() => setOpen(open === p.id ? '' : p.id)}
              >
                <span className="font-semibold">{f.period(p.id)}</span>
                <span className="flex items-center gap-2 text-xs text-slate-500">
                  <SourceBadge source={p.source} />
                  {hasPrizeData(p) ? '' : t('hist.incomplete')}
                </span>
              </button>
              {open === p.id && (
                <div className="mt-3 space-y-2 text-sm">
                  <PrizeNumbers periodId={p.id} />
                  <dl className="grid gap-x-4 gap-y-1 text-xs text-slate-600 sm:grid-cols-2">
                    <div>{t('hist.claim', { start: p.claimStart ?? na, end: p.claimEnd ?? na })}</div>
                    <div>{t('hist.drawDate', { v: p.drawDate ?? na })}</div>
                    <div>{t('hist.fetchedAt', { v: p.fetchedAt ? f.dateTime(p.fetchedAt) : na })}</div>
                    <div>{t('hist.verifiedAt', { v: p.verifiedAt ? f.dateTime(p.verifiedAt) : t('common.notVerified') })}</div>
                    <div className="sm:col-span-2">
                      {t('hist.source')}
                      {p.sourceUrl ? (
                        <a className="text-brand-600 underline" href={p.sourceUrl} target="_blank" rel="noreferrer noopener">
                          {p.sourceUrl}
                        </a>
                      ) : (
                        na
                      )}
                    </div>
                    <div className="sm:col-span-2">{t('hist.rules', { n: periodTiers(p).length, kind: p.tiers ? t('hist.custom') : t('hist.default') })}</div>
                  </dl>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
