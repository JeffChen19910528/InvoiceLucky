import { useMemo, useState } from 'react'
import { useAppStore } from '../stores/appStore'
import { useResults } from '../stores/hooks'
import { Notice } from '../components/ui'
import { ResultBadge } from '../components/badges'
import { PeriodSelect } from '../components/PeriodSelect'
import { PrizeNumbers } from '../components/PrizeNumbers'
import { hasPrizeData, matchInvoice, normalizeInvoiceNumber, summarize } from '../domain/prize-engine/engine'
import { INVOICE_NUMBER_RE } from '../domain/models/types'
import { todayIso } from '../domain/period/period'
import { useFormat, useT } from '../i18n'
import type { Navigate } from '../app/pages'

export default function LotteryPage({ go }: { go: Navigate }) {
  const t = useT()
  const f = useFormat()
  const { invoices, results, periods } = useResults()
  const selected = useAppStore((s) => s.selectedPeriod)
  const setSelected = useAppStore((s) => s.setSelectedPeriod)
  const period = periods.find((p) => p.id === selected)
  const dataOk = hasPrizeData(period)
  const [quick, setQuick] = useState('')

  const mine = useMemo(() => invoices.filter((i) => i.period === selected), [invoices, selected])
  const sum = summarize(mine.map((i) => results.get(i.id)!))
  const num = normalizeInvoiceNumber(quick)
  const quickValid = INVOICE_NUMBER_RE.test(num)
  const quickResult = quickValid ? matchInvoice({ period: selected, invoiceNumber: num }, period, todayIso()) : null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">{t('lot.title')}</h1>
        <div className="w-56">
          <PeriodSelect value={selected} onChange={setSelected} periods={periods} extraIds={invoices.map((i) => i.period)} />
        </div>
      </div>

      {dataOk ? (
        <PrizeNumbers periodId={selected} />
      ) : (
        <Notice tone="warn">
          {t('lot.noData', { period: selected ? f.period(selected) : t('lot.noPeriod') })}
          <button className="ml-2 underline" onClick={() => go('settings')}>
            {t('lot.import')}
          </button>
        </Notice>
      )}

      <section className="card space-y-2">
        <h2 className="font-semibold">{t('lot.quickTitle')}</h2>
        <input
          className="input font-mono uppercase"
          aria-label={t('lot.quickAria')}
          placeholder="AB12345678"
          maxLength={12}
          value={quick}
          onChange={(e) => setQuick(e.target.value)}
        />
        <div aria-live="polite" className="min-h-6 text-sm">
          {quick && !quickValid && <span className="text-slate-500">{t('lot.quickHint')}</span>}
          {quickResult && (
            <span data-testid="quick-result">
              <ResultBadge r={quickResult} />
              {quickResult.status === 'won' && quickResult.matchedNumber && (
                <span className="ml-2 text-xs text-slate-500">{t('lot.matched', { n: quickResult.matchedNumber })}</span>
              )}
            </span>
          )}
        </div>
      </section>

      <section className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">{t('lot.mineTitle', { n: mine.length })}</h2>
          {dataOk && mine.length > 0 && (
            <span className="text-sm" data-testid="batch-summary">
              {t('lot.summary', { won: sum.won, amount: f.money(sum.claimableAmount) })}
              {sum.expiredAmount > 0 && <span className="text-red-600">{t('lot.summaryExpired', { amount: f.money(sum.expiredAmount) })}</span>}
            </span>
          )}
        </div>
        {mine.length === 0 ? (
          <p className="text-sm text-slate-500">{t('lot.none')}</p>
        ) : (
          <ul className="divide-y">
            {mine.map((i) => {
              const r = results.get(i.id)!
              return (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span className="font-mono">{i.invoiceNumber}</span>
                  <span className="flex items-center gap-2">
                    {r.status === 'won' && <span className="text-xs text-slate-500">{t('lot.matchedShort', { n: r.matchedNumber ?? '' })}</span>}
                    <ResultBadge r={r} />
                  </span>
                </li>
              )
            })}
          </ul>
        )}
        <p className="text-xs text-slate-500">{t('lot.disclaimer')}</p>
      </section>
    </div>
  )
}
