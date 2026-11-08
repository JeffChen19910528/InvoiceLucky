import { useEffect, useMemo, useRef, useState } from 'react'
import { ScanLine, X } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import { Notice } from '../../components/ui'
import { Modal } from '../../components/Modal'
import { parseInvoiceCode, type ScannedInvoice } from '../../domain/invoice-scan/invoiceCode'
import { buildInvoice, invoiceKey } from '../../services/import-export/invoices'
import { createZxingScanner, toCameraError, type CameraErrorCode, type ScannerFactory } from '../../services/scanner/scanner'
import { useFormat, useT, type MessageKey } from '../../i18n'

const CAMERA_ERROR_KEY: Record<CameraErrorCode, MessageKey> = {
  denied: 'scan.err.denied',
  'no-camera': 'scan.err.noCamera',
  busy: 'scan.err.busy',
  insecure: 'scan.err.insecure',
  unsupported: 'scan.err.unsupported',
  unknown: 'scan.err.unknown',
}

type Hint = 'right-qr' | 'unrecognized' | 'dup-in-list' | null

/** 同一個內容在這段時間內不重複處理（相機會連續解出同一張）。 */
const REPEAT_MS = 1500

export function ScanDialog({ onClose, createScanner = createZxingScanner }: { onClose: () => void; createScanner?: ScannerFactory }) {
  const t = useT()
  const f = useFormat()
  const existing = useAppStore((s) => s.invoices)
  const addInvoices = useAppStore((s) => s.addInvoices)
  const videoRef = useRef<HTMLVideoElement>(null)
  const last = useRef({ text: '', at: 0 })
  const [attempt, setAttempt] = useState(0)
  const [status, setStatus] = useState<'starting' | 'scanning'>('starting')
  const [error, setError] = useState<CameraErrorCode | null>(null)
  const [items, setItemsState] = useState<ScannedInvoice[]>([])
  // 掃描回呼不在 render 內，以 ref 取得最新清單做去重，避免在 state updater 內產生副作用。
  const itemsRef = useRef<ScannedInvoice[]>([])
  const setItems = (next: ScannedInvoice[]) => {
    itemsRef.current = next
    setItemsState(next)
  }
  const [hint, setHint] = useState<Hint>(null)
  const [report, setReport] = useState<{ added: number; duplicates: string[] } | null>(null)

  const recorded = useMemo(() => new Set(existing.map((i) => invoiceKey(i.period, i.invoiceNumber))), [existing])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const scanner = createScanner()
    const onCode = (text: string) => {
      const now = Date.now()
      if (text === last.current.text && now - last.current.at < REPEAT_MS) return
      last.current = { text, at: now }
      const r = parseInvoiceCode(text)
      if (!r.ok) return setHint(r.reason)
      const key = invoiceKey(r.invoice.period, r.invoice.invoiceNumber)
      if (itemsRef.current.some((x) => invoiceKey(x.period, x.invoiceNumber) === key)) return setHint('dup-in-list')
      setHint(null)
      navigator.vibrate?.(60)
      setItems([...itemsRef.current, r.invoice])
    }
    scanner
      .start(video, onCode)
      .then(() => setStatus('scanning'))
      .catch((e) => setError(toCameraError(e).code))
    return () => scanner.stop()
  }, [createScanner, attempt])

  const retry = () => {
    setError(null)
    setStatus('starting')
    setAttempt((n) => n + 1)
  }

  const submit = () => {
    const out = addInvoices(
      items.map((i) => buildInvoice({ invoiceDate: i.invoiceDate, invoiceNumber: i.invoiceNumber, amount: i.amount ?? 0, period: i.period }, 'manual')),
    )
    setReport({ added: out.added, duplicates: out.duplicates.map((d) => `${d.invoiceNumber}（${f.period(d.period)}）`) })
    setItems([])
  }

  const hintText = hint && t(({ 'right-qr': 'scan.hintRight', unrecognized: 'scan.hintUnknown', 'dup-in-list': 'scan.hintDup' } as const)[hint])

  return (
    <Modal title={t('scan.title')} onClose={onClose}>
      <div className="space-y-3">
        <p className="text-xs text-slate-500">{t('scan.help')}</p>

        {error ? (
          <Notice tone="error">
            <span>{t(CAMERA_ERROR_KEY[error])}</span>
            <button className="ml-2 underline" onClick={retry}>
              {t('scan.retry')}
            </button>
          </Notice>
        ) : (
          <div className="relative overflow-hidden rounded-lg bg-black">
            <video ref={videoRef} playsInline muted autoPlay className="aspect-[4/3] w-full object-cover" aria-label={t('scan.videoAria')} />
            {status === 'starting' && <p className="absolute inset-0 flex items-center justify-center text-sm text-white">{t('scan.starting')}</p>}
            {status === 'scanning' && <ScanLine size={28} className="pointer-events-none absolute right-2 top-2 text-emerald-300" aria-hidden />}
          </div>
        )}

        <div aria-live="polite" className="min-h-5 text-xs text-amber-700">
          {hintText}
        </div>

        <h3 className="text-sm font-semibold">{t('scan.listTitle', { n: items.length })}</h3>
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">{t('scan.empty')}</p>
        ) : (
          <ul className="max-h-40 divide-y overflow-auto text-sm" data-testid="scan-list">
            {items.map((i) => (
              <li key={`${i.period}|${i.invoiceNumber}`} className="flex items-center justify-between gap-2 py-1.5">
                <span className="min-w-0">
                  <span className="font-mono font-semibold">{i.invoiceNumber}</span>
                  <span className="ml-2 text-xs text-slate-500">
                    {f.period(i.period)}
                    {i.kind === 'qr' ? `・${i.invoiceDate}・${f.money(i.amount ?? 0)}` : `・${t('scan.barcodeMeta')}`}
                  </span>
                  {recorded.has(invoiceKey(i.period, i.invoiceNumber)) && <span className="ml-2 text-xs text-amber-700">{t('scan.alreadyRecorded')}</span>}
                </span>
                <button
                  className="btn-ghost shrink-0 px-2 py-1"
                  aria-label={t('scan.removeAria', { n: i.invoiceNumber })}
                  onClick={() => setItems(itemsRef.current.filter((x) => x !== i))}
                >
                  <X size={14} />
                </button>
              </li>
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
            {t('common.close')}
          </button>
          <button className="btn-primary" disabled={items.length === 0} onClick={submit}>
            {t('batch.addN', { n: items.length })}
          </button>
        </div>
      </div>
    </Modal>
  )
}
