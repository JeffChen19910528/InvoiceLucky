import { useMemo, useState } from 'react'
import { useAppStore } from '../../stores/appStore'
import { useResults } from '../../stores/hooks'
import { Field, Notice } from '../../components/ui'
import { Modal } from '../../components/Modal'
import { PeriodSelect } from '../../components/PeriodSelect'
import { periodIdOfDate, periodRange, todayIso } from '../../domain/period/period'
import { buildInvoice, parseBatchInput } from '../../services/import-export/invoices'
import { useFormat, useT } from '../../i18n'

export function BatchDialog({ onClose }: { onClose: () => void }) {
  const t = useT()
  const f = useFormat()
  const { periods } = useResults()
  const addInvoices = useAppStore((s) => s.addInvoices)
  const selected = useAppStore((s) => s.selectedPeriod)
  const [period, setPeriod] = useState(selected || periodIdOfDate(todayIso()) || '')
  const [date, setDate] = useState(periodRange(selected || '')?.start ?? todayIso())
  const [text, setText] = useState('')
  const [report, setReport] = useState<{ added: number; duplicates: string[] } | null>(null)

  const parsed = useMemo(() => parseBatchInput(text, date, period), [text, date, period])

  const submit = () => {
    const out = addInvoices(parsed.drafts.map((d) => buildInvoice(d, 'manual')))
    setReport({ added: out.added, duplicates: out.duplicates.map((d) => `${d.invoiceNumber}（${f.period(d.period)}）`) })
  }

  return (
    <Modal title={t('batch.title')} onClose={onClose}>
      <div className="space-y-3">
        <p className="text-xs text-slate-500">
          {t('batch.helpA')}
          <code>AB12345678</code>
          {t('batch.helpB')}
          <code>{t('batch.helpFormat')}</code>
          {t('batch.helpC')}
          <code>2026-08-03,CD00012345,250,Dinner</code>
          {t('batch.helpD')}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('batch.defPeriod')}>
            <PeriodSelect value={period} onChange={setPeriod} periods={periods} />
          </Field>
          <Field label={t('batch.defDate')}>
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        <textarea
          aria-label={t('batch.aria')}
          className="input h-40 font-mono"
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setReport(null)
          }}
          placeholder={'AB12345678\nCD00012345\n2026-08-03,EF11112222,250,"Dinner, friends"'}
        />
        <p className="text-sm" aria-live="polite">
          {t('batch.canAdd', { n: parsed.drafts.length })}
          {parsed.errors.length > 0 && <span className="text-red-600">{t('batch.errCount', { n: parsed.errors.length })}</span>}
        </p>
        {parsed.errors.length > 0 && (
          <ul className="max-h-24 overflow-auto text-xs text-red-600">
            {parsed.errors.map((e) => (
              <li key={e.line}>{t('batch.lineErr', { line: e.line, text: e.text, msg: e.message })}</li>
            ))}
          </ul>
        )}
        {report && (
          <Notice tone={report.duplicates.length ? 'warn' : 'info'}>
            {t('batch.added', { n: report.added })}
            {report.duplicates.length > 0 && <> {t('batch.skipped', { n: report.duplicates.length, list: report.duplicates.join(t('common.listSep')) })}</>}
          </Notice>
        )}
        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>
            {report ? t('common.close') : t('common.cancel')}
          </button>
          <button className="btn-primary" disabled={parsed.drafts.length === 0 || !!report} onClick={submit}>
            {t('batch.addN', { n: parsed.drafts.length })}
          </button>
        </div>
      </div>
    </Modal>
  )
}
