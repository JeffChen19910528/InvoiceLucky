import { useState, type ChangeEvent } from 'react'
import { Download, Upload } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import { Notice } from '../../components/ui'
import { exportBackup, previewBackup, type ImportPreview } from '../../services/import-export/backup'
import { invoicesToCsv } from '../../services/import-export/invoices'
import { todayIso } from '../../domain/period/period'
import { downloadFile } from '../../lib/download'
import { readSelectedFile } from '../../lib/files'
import { useT } from '../../i18n'

export function BackupSection() {
  const t = useT()
  const { invoices, userPeriods, commitImport } = useAppStore()
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [done, setDone] = useState<{ a: number; b: number } | null>(null)

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const text = await readSelectedFile(e)
    if (text === null) return
    setDone(null)
    setPreview(previewBackup(text, { invoices, prizePeriods: userPeriods }))
  }

  return (
    <section className="card space-y-3">
      <h2 className="font-semibold">{t('backup.title')}</h2>
      <Notice>{t('backup.notice')}</Notice>
      <div className="flex flex-wrap gap-2">
        <button
          className="btn-primary"
          onClick={() => downloadFile(`invoice-lucky-backup-${todayIso()}.json`, exportBackup({ invoices, prizePeriods: userPeriods }), 'application/json')}
        >
          <Download size={16} aria-hidden /> {t('backup.exportJson')}
        </button>
        <button
          className="btn-ghost"
          disabled={invoices.length === 0}
          onClick={() => downloadFile(`invoice-lucky-invoices-${todayIso()}.csv`, invoicesToCsv(invoices), 'text/csv;charset=utf-8')}
        >
          <Download size={16} aria-hidden /> {t('backup.exportCsv')}
        </button>
        <label className="btn-ghost cursor-pointer">
          <Upload size={16} aria-hidden /> {t('backup.importJson')}
          <input type="file" accept="application/json,.json" className="sr-only" aria-label={t('backup.fileAria')} onChange={onFile} />
        </label>
      </div>
      {preview && (
        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm" data-testid="import-preview">
          {preview.fatal ? (
            <Notice tone="error">{t('backup.fatal', { msg: preview.fatal })}</Notice>
          ) : (
            <>
              <p>
                {t('backup.summary', {
                  a: preview.newInvoices.length,
                  b: preview.duplicateInvoices.length,
                  c: preview.invalid.length,
                  d: preview.newPeriods.length,
                })}
                {preview.replacedPeriodIds.length > 0 && t('backup.replace', { ids: preview.replacedPeriodIds.join(t('common.listSep')) })}
              </p>
              {preview.invalid.length > 0 && (
                <ul className="max-h-24 overflow-auto text-xs text-red-600">
                  {preview.invalid.map((x) => (
                    <li key={x.index}>{t('backup.itemErr', { n: x.index + 1, msg: x.message })}</li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2">
                <button
                  className="btn-primary"
                  disabled={preview.newInvoices.length + preview.newPeriods.length === 0}
                  onClick={() => {
                    commitImport(preview)
                    setDone({ a: preview.newInvoices.length, b: preview.newPeriods.length })
                    setPreview(null)
                  }}
                >
                  {t('backup.confirm')}
                </button>
                <button className="btn-ghost" onClick={() => setPreview(null)}>
                  {t('common.cancel')}
                </button>
              </div>
            </>
          )}
        </div>
      )}
      {done && <Notice>{t('backup.done', done)}</Notice>}
    </section>
  )
}
