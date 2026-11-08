import { hasPrizeData, periodTiers } from '../domain/prize-engine/engine'
import { useResults } from '../stores/hooks'
import { useFormat, useT } from '../i18n'
import { SourceBadge } from './badges'

export function PrizeNumbers({ periodId }: { periodId: string }) {
  const t = useT()
  const f = useFormat()
  const { periods } = useResults()
  const p = periods.find((x) => x.id === periodId)
  if (!hasPrizeData(p)) return null
  const all = periodTiers(p)
  const label = (id: string) => {
    const tier = all.find((x) => x.id === id)
    return `${f.tier(tier?.name ?? '')} ${f.money(tier?.amount ?? 0)}`
  }
  const lower = all.filter((x) => x.source === 'first' && x.matchLength < 8)
  return (
    <div className="card space-y-3" data-testid="prize-numbers">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-semibold">{t('prize.numbersTitle', { period: f.period(p.id) })}</h2>
        <SourceBadge source={p.source} />
      </div>
      <dl className="grid gap-3 sm:grid-cols-3">
        <div>
          <dt className="text-xs text-slate-500">{label('special')}</dt>
          <dd className="font-mono text-xl font-bold text-red-600">{p.specialPrize}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">{label('grand')}</dt>
          <dd className="font-mono text-xl font-bold text-red-600">{p.grandPrize}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">{label('first')}</dt>
          {p.firstPrizes.map((n) => (
            <dd key={n} className="font-mono text-xl font-bold text-red-600">
              {n}
            </dd>
          ))}
        </div>
      </dl>
      <ul className="grid gap-1 text-sm text-slate-600 sm:grid-cols-2">
        {lower.map((x) => (
          <li key={x.id}>{t('prize.lowerTier', { name: f.tier(x.name), n: x.matchLength, amount: f.money(x.amount) })}</li>
        ))}
      </ul>
      {p.claimEnd && <p className="text-sm text-slate-600">{t('prize.claimPeriod', { start: p.claimStart ?? '?', end: p.claimEnd })}</p>}
      {p.cloudPrizes && p.cloudPrizes.length > 0 ? (
        <ul className="text-sm text-slate-600">
          {p.cloudPrizes.map((c) => (
            <li key={c.id}>{t('prize.cloudItem', { name: c.name, amount: f.money(c.amount), n: c.numbers.length })}</li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-slate-500">{t('prize.noCloud')}</p>
      )}
    </div>
  )
}
