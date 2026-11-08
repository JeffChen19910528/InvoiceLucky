import { useMemo, useState } from 'react'
import { Pencil, Plus, Search, Trash2, ListPlus, ScanLine } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import { useResults } from '../../stores/hooks'
import { Empty } from '../../components/ui'
import { ConfirmDialog } from '../../components/Modal'
import { ResultBadge } from '../../components/badges'
import { PeriodSelect } from '../../components/PeriodSelect'
import type { Invoice } from '../../domain/models/types'
import { isDateInPeriod } from '../../domain/period/period'
import { useFormat, useT } from '../../i18n'
import { InvoiceForm } from './InvoiceForm'
import { BatchDialog } from './BatchDialog'
import { ScanDialog } from './ScanDialog'

type SortKey = 'date-desc' | 'date-asc' | 'amount-desc' | 'prize-desc'

export default function InvoicesPage() {
  const t = useT()
  const f = useFormat()
  const { invoices, results, periods } = useResults()
  const removeInvoice = useAppStore((s) => s.removeInvoice)
  const [filterPeriod, setFilterPeriod] = useState('')
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<SortKey>('date-desc')
  const [form, setForm] = useState<{ editing?: Invoice } | null>(null)
  const [batch, setBatch] = useState(false)
  const [scan, setScan] = useState(false)
  const [toDelete, setToDelete] = useState<Invoice | null>(null)

  const list = useMemo(() => {
    const kw = q.trim().toUpperCase()
    const out = invoices.filter((i) => (!filterPeriod || i.period === filterPeriod) && (!kw || i.invoiceNumber.includes(kw) || (i.note ?? '').toUpperCase().includes(kw)))
    const prize = (i: Invoice) => results.get(i.id)?.amount ?? 0
    return out.sort((a, b) => {
      if (sort === 'date-asc') return a.invoiceDate.localeCompare(b.invoiceDate)
      if (sort === 'amount-desc') return b.amount - a.amount
      if (sort === 'prize-desc') return prize(b) - prize(a)
      return b.invoiceDate.localeCompare(a.invoiceDate) || b.createdAt.localeCompare(a.createdAt)
    })
  }, [invoices, results, filterPeriod, q, sort])

  const usedPeriods = useMemo(() => [...new Set(invoices.map((i) => i.period))], [invoices])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">{t('inv.title')}</h1>
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost" onClick={() => setScan(true)}>
            <ScanLine size={16} aria-hidden /> {t('scan.btn')}
          </button>
          <button className="btn-ghost" onClick={() => setBatch(true)}>
            <ListPlus size={16} aria-hidden /> {t('inv.batchBtn')}
          </button>
          <button className="btn-primary" onClick={() => setForm({})}>
            <Plus size={16} aria-hidden /> {t('inv.add')}
          </button>
        </div>
      </div>

      <div className="card grid gap-3 sm:grid-cols-3">
        <PeriodSelect value={filterPeriod} onChange={setFilterPeriod} periods={periods} extraIds={usedPeriods} allowAll label={t('inv.filterPeriod')} />
        <div className="relative">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" aria-hidden />
          <input className="input pl-9" placeholder={t('inv.search')} aria-label={t('inv.search')} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input" aria-label={t('inv.sort')} value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
          <option value="date-desc">{t('sort.dateDesc')}</option>
          <option value="date-asc">{t('sort.dateAsc')}</option>
          <option value="amount-desc">{t('sort.amountDesc')}</option>
          <option value="prize-desc">{t('sort.prizeDesc')}</option>
        </select>
      </div>

      {invoices.length === 0 ? (
        <Empty title={t('inv.emptyTitle')} hint={t('inv.emptyHint')}>
          <button className="btn-primary" onClick={() => setForm({})}>
            {t('inv.addFirst')}
          </button>
        </Empty>
      ) : list.length === 0 ? (
        <Empty title={t('inv.noMatch')} />
      ) : (
        <ul className="space-y-2" aria-label={t('inv.listAria')}>
          {list.map((i) => {
            const r = results.get(i.id)!
            return (
              <li key={i.id} className="card flex flex-wrap items-center gap-x-4 gap-y-2" data-testid="invoice-row">
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-lg font-semibold tracking-wide">{i.invoiceNumber}</div>
                  <div className="text-xs text-slate-500">
                    {f.period(i.period)}・{i.invoiceDate}・{f.money(i.amount)}
                    {i.isCloud && `・${t('inv.cloudTag')}`}
                    {i.note && `・${i.note}`}
                  </div>
                  {!isDateInPeriod(i.invoiceDate, i.period) && <div className="text-xs text-amber-700">{t('inv.dateMismatch')}</div>}
                </div>
                <ResultBadge r={r} />
                <div className="flex gap-1">
                  <button className="btn-ghost px-2" aria-label={t('inv.editAria', { n: i.invoiceNumber })} onClick={() => setForm({ editing: i })}>
                    <Pencil size={16} />
                  </button>
                  <button className="btn-ghost px-2 text-red-600" aria-label={t('inv.deleteAria', { n: i.invoiceNumber })} onClick={() => setToDelete(i)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {form && <InvoiceForm editing={form.editing} onClose={() => setForm(null)} />}
      {batch && <BatchDialog onClose={() => setBatch(false)} />}
      {scan && <ScanDialog onClose={() => setScan(false)} />}
      {toDelete && (
        <ConfirmDialog
          title={t('inv.deleteTitle')}
          message={t('inv.deleteMsg', { n: toDelete.invoiceNumber, period: f.period(toDelete.period) })}
          confirmLabel={t('inv.deleteConfirm')}
          onCancel={() => setToDelete(null)}
          onConfirm={() => {
            removeInvoice(toDelete.id)
            setToDelete(null)
          }}
        />
      )}
    </div>
  )
}
