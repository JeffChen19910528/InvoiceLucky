import { useState } from 'react'
import { Field, Notice } from '../../components/ui'
import { prizePeriodSchema, type PrizePeriod } from '../../domain/models/types'
import { joinMsgs, msg, type Msg } from '../../domain/models/message'
import { makePeriodId } from '../../domain/period/period'
import { useT } from '../../i18n'

const MONTH_OPTIONS = ['01-02', '03-04', '05-06', '07-08', '09-10', '11-12']

export function ManualPeriodForm({ onSave }: { onSave: (p: PrizePeriod) => void }) {
  const t = useT()
  const [year, setYear] = useState('115')
  const [months, setMonths] = useState('09-10')
  const [special, setSpecial] = useState('')
  const [grand, setGrand] = useState('')
  const [first, setFirst] = useState('')
  const [cs, setCs] = useState('')
  const [ce, setCe] = useState('')
  const [err, setErr] = useState<Msg | null>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const [a, b] = months.split('-').map(Number) as [number, number]
    const firstPrizes = first.split(/[\s,，、]+/).filter(Boolean)
    const r = prizePeriodSchema.safeParse({
      id: makePeriodId(Number(year), [a, b]),
      year: Number(year),
      months: [a, b],
      claimStart: cs || undefined,
      claimEnd: ce || undefined,
      specialPrize: special.trim(),
      grandPrize: grand.trim(),
      firstPrizes,
      source: 'user-import',
      fetchedAt: new Date().toISOString(),
    })
    if (!r.success) {
      setErr(joinMsgs(r.error.issues.map((i) => msg('err.field', { path: i.path.join('.'), detail: msg(i.message) }))))
      return
    }
    if (firstPrizes.length === 0) {
      setErr(msg('manual.needFirst'))
      return
    }
    setErr(null)
    onSave(r.data)
  }

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('manual.year')}>
          <input className="input" inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value)} />
        </Field>
        <Field label={t('manual.months')}>
          <select className="input" value={months} onChange={(e) => setMonths(e.target.value)}>
            {MONTH_OPTIONS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </Field>
        <Field label={t('manual.special')}>
          <input className="input font-mono" value={special} onChange={(e) => setSpecial(e.target.value)} maxLength={8} />
        </Field>
        <Field label={t('manual.grand')}>
          <input className="input font-mono" value={grand} onChange={(e) => setGrand(e.target.value)} maxLength={8} />
        </Field>
      </div>
      <Field label={t('manual.first')}>
        <input className="input font-mono" value={first} onChange={(e) => setFirst(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('manual.claimStart')}>
          <input type="date" className="input" value={cs} onChange={(e) => setCs(e.target.value)} />
        </Field>
        <Field label={t('manual.claimEnd')}>
          <input type="date" className="input" value={ce} onChange={(e) => setCe(e.target.value)} />
        </Field>
      </div>
      {err && <Notice tone="error">{t(err)}</Notice>}
      <button type="submit" className="btn-primary">
        {t('manual.save')}
      </button>
    </form>
  )
}
