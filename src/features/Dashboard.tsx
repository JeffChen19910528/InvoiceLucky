import { useMemo } from 'react'
import { useAppStore } from '../stores/appStore'
import { useResults } from '../stores/hooks'
import { Empty, Notice } from '../components/ui'
import { ResultBadge, SourceBadge } from '../components/badges'
import { PeriodSelect } from '../components/PeriodSelect'
import { summarize, hasPrizeData } from '../domain/prize-engine/engine'
import { daysBetween, todayIso } from '../domain/period/period'
import { useFormat, useT } from '../i18n'
import type { Navigate } from '../app/pages'

export default function Dashboard({ go }: { go: Navigate }) {
  const t = useT()
  const f = useFormat()
  const { invoices, results, periods } = useResults()
  const selected = useAppStore((s) => s.selectedPeriod)
  const setSelected = useAppStore((s) => s.setSelectedPeriod)
  const period = periods.find((p) => p.id === selected)
  const dataOk = hasPrizeData(period)
  const today = todayIso()

  const inPeriod = useMemo(() => invoices.filter((i) => i.period === selected), [invoices, selected])
  const sum = useMemo(() => summarize(inPeriod.map((i) => results.get(i.id)!)), [inPeriod, results])
  const winners = inPeriod.filter((i) => results.get(i.id)?.status === 'won')
  const recent = [...invoices].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5)

  let claimHint: { text: string; tone: 'info' | 'warn' | 'error' } | null = null
  if (period?.claimEnd) {
    const left = daysBetween(today, period.claimEnd)
    if (left < 0) claimHint = { text: t('claim.expired', { end: period.claimEnd, days: -left }), tone: 'error' }
    else if (left <= 30) claimHint = { text: t('claim.soon', { end: period.claimEnd, days: left }), tone: 'warn' }
    else claimHint = { text: t('claim.range', { start: period.claimStart ?? '?', end: period.claimEnd, days: left }), tone: 'info' }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">{t('dash.title')}</h1>
        <div className="w-56">
          <PeriodSelect value={selected} onChange={setSelected} periods={periods} extraIds={invoices.map((i) => i.period)} />
        </div>
      </div>

      <section className="card flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm text-slate-500">{t('dash.currentPeriod')}</div>
          <div className="text-lg font-semibold">{selected ? f.period(selected) : t('dash.notSelected')}</div>
        </div>
        <div className="text-sm">
          {dataOk && period ? (
            <span className="flex items-center gap-2">
              {t('dash.hasData')} <SourceBadge source={period.source} />
            </span>
          ) : (
            <span className="text-blue-700">{t('dash.noData')}</span>
          )}
        </div>
      </section>

      {!dataOk && (
        <Notice tone="info">
          {t('dash.noDataNotice')}
          <button className="ml-2 underline" onClick={() => go('settings')}>
            {t('dash.goSettings')}
          </button>
        </Notice>
      )}
      {claimHint && <Notice tone={claimHint.tone}>{claimHint.text}</Notice>}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="card">
          <div className="text-xs text-slate-500">{t('dash.registered')}</div>
          <div className="text-2xl font-bold" data-testid="stat-total">
            {t('dash.count', { n: sum.total })}
          </div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-500">{t('dash.wonCount')}</div>
          <div className="text-2xl font-bold" data-testid="stat-won">
            {dataOk ? t('dash.count', { n: sum.won }) : '—'}
          </div>
        </div>
        <div className="card col-span-2 border-gold-500/40 bg-gold-50">
          <div className="text-xs text-gold-700">{t('dash.estimated')}</div>
          <div className="text-2xl font-bold text-gold-700" data-testid="stat-amount">
            {dataOk ? f.money(sum.claimableAmount) : '—'}
          </div>
          {sum.expiredAmount > 0 && <div className="text-xs text-red-600">{t('dash.expiredExtra', { amount: f.money(sum.expiredAmount) })}</div>}
        </div>
      </section>

      <section className="card">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">{t('dash.winners')}</h2>
          <button className="btn-primary" onClick={() => go('invoices')}>
            {t('dash.addInvoice')}
          </button>
        </div>
        {winners.length === 0 ? (
          <p className="text-sm text-slate-500">{dataOk ? t('dash.noWinners') : t('dash.noPrizeCannot')}</p>
        ) : (
          <ul className="divide-y">
            {winners.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-2 py-2">
                <span className="font-mono">{i.invoiceNumber}</span>
                <ResultBadge r={results.get(i.id)!} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2 className="mb-2 font-semibold">{t('dash.recent')}</h2>
        {recent.length === 0 ? (
          <Empty title={t('dash.emptyTitle')} hint={t('dash.emptyHint')} />
        ) : (
          <ul className="divide-y">
            {recent.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <span>
                  <span className="font-mono">{i.invoiceNumber}</span>
                  <span className="ml-2 text-xs text-slate-500">{f.period(i.period)}</span>
                </span>
                <ResultBadge r={results.get(i.id)!} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
