import { CheckCircle2, CircleDashed, XCircle } from 'lucide-react'
import type { MatchResult, PrizePeriod } from '../domain/models/types'
import { useFormat, useT } from '../i18n'

export function ResultBadge({ r }: { r: MatchResult }) {
  const t = useT()
  const f = useFormat()
  if (r.status === 'won')
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-gold-100 px-2 py-0.5 text-xs font-semibold text-gold-700"
        data-testid="result-won"
      >
        <CheckCircle2 size={14} aria-hidden /> {f.tier(r.tierName ?? '')} {f.money(r.amount)}
        {r.claimExpired && <span className="ml-1 text-red-600">{t('result.expired')}</span>}
      </span>
    )
  if (r.status === 'lost')
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600" data-testid="result-lost">
        <XCircle size={14} aria-hidden /> {t('result.lost')}
      </span>
    )
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700"
      title={r.reason ? t(r.reason) : undefined}
      data-testid="result-nodata"
    >
      <CircleDashed size={14} aria-hidden /> {t('result.noData')}
    </span>
  )
}

export function SourceBadge({ source }: { source: PrizePeriod['source'] }) {
  const t = useT()
  const label = { official: t('source.official'), 'user-import': t('source.userImport'), demo: t('source.demo') }[source]
  const cls = source === 'official' ? 'bg-emerald-50 text-emerald-700' : source === 'demo' ? 'bg-amber-50 text-amber-700' : 'bg-indigo-50 text-indigo-700'
  return <span className={`rounded-full px-2 py-0.5 text-xs ${cls}`}>{label}</span>
}
