import { useState } from 'react'
import { useAppStore } from '../../stores/appStore'
import { useResults } from '../../stores/hooks'
import { Field, Notice } from '../../components/ui'
import { Modal } from '../../components/Modal'
import { PeriodSelect } from '../../components/PeriodSelect'
import { INVOICE_NUMBER_RE, type Invoice } from '../../domain/models/types'
import { normalizeInvoiceNumber } from '../../domain/prize-engine/engine'
import { isDateInPeriod, periodIdOfDate, periodRange, todayIso } from '../../domain/period/period'
import { buildInvoice } from '../../services/import-export/invoices'
import { useFormat, useT } from '../../i18n'

export function InvoiceForm({ editing, onClose }: { editing?: Invoice; onClose: () => void }) {
  const t = useT()
  const f = useFormat()
  const { periods } = useResults()
  const addInvoices = useAppStore((s) => s.addInvoices)
  const updateInvoice = useAppStore((s) => s.updateInvoice)
  const [date, setDate] = useState(editing?.invoiceDate ?? todayIso())
  const [period, setPeriod] = useState(editing?.period ?? periodIdOfDate(todayIso()) ?? '')
  const [number, setNumber] = useState(editing?.invoiceNumber ?? '')
  const [amount, setAmount] = useState(String(editing?.amount ?? ''))
  const [note, setNote] = useState(editing?.note ?? '')
  const [isCloud, setIsCloud] = useState(editing?.isCloud ?? false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')

  const onDate = (v: string) => {
    setDate(v)
    const p = periodIdOfDate(v)
    if (p) setPeriod(p)
  }
  const mismatch = date && period && !isDateInPeriod(date, period)
  const range = periodRange(period)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    const n = normalizeInvoiceNumber(number)
    if (!INVOICE_NUMBER_RE.test(n)) errs.number = t('err.invoiceNumberExample')
    if (!periodIdOfDate(date)) errs.date = t('err.dateRequired')
    const amt = amount.trim() === '' ? 0 : Number(amount)
    if (!Number.isInteger(amt) || amt < 0) errs.amount = t('err.amountInvalid')
    setErrors(errs)
    if (Object.keys(errs).length) return
    const draft = { invoiceDate: date, invoiceNumber: n, amount: amt, note, isCloud, period }
    if (editing) {
      const r = updateInvoice(editing.id, {
        invoiceDate: date,
        invoiceNumber: n,
        amount: amt,
        note: note.trim() || undefined,
        isCloud: isCloud || undefined,
        period,
      })
      if (!r.ok) return setFormError(r.message ? t(r.message) : t('inv.saveFailed'))
    } else {
      const out = addInvoices([buildInvoice(draft, 'manual')])
      if (out.duplicates.length) return setFormError(t('inv.dupExists', { period: f.period(period), n }))
    }
    onClose()
  }

  return (
    <Modal title={editing ? t('inv.edit') : t('inv.add')} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3" noValidate>
        <Field label={t('inv.number')} error={errors.number}>
          <input
            className="input font-mono uppercase"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="AB12345678"
            maxLength={12}
            autoFocus
            autoComplete="off"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('inv.date')} error={errors.date}>
            <input type="date" className="input" value={date} onChange={(e) => onDate(e.target.value)} />
          </Field>
          <Field label={t('period.label')}>
            <PeriodSelect value={period} onChange={setPeriod} periods={periods} />
          </Field>
        </div>
        {mismatch && <Notice tone="warn">{t('inv.mismatch', { period: f.period(period), start: range?.start ?? '', end: range?.end ?? '' })}</Notice>}
        <Field label={t('inv.amount')} error={errors.amount} hint={t('inv.amountHint')}>
          <input className="input" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label={t('inv.note')}>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" checked={isCloud} onChange={(e) => setIsCloud(e.target.checked)} />
          <span>
            {t('inv.cloudLabel')}
            <span className="block text-xs text-slate-500">{t('inv.cloudHint')}</span>
          </span>
        </label>
        {formError && <Notice tone="error">{formError}</Notice>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-ghost" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn-primary">
            {editing ? t('inv.saveChanges') : t('inv.addBtn')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
