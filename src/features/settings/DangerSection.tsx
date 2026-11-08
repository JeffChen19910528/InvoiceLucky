import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import { Notice } from '../../components/ui'
import { ConfirmDialog } from '../../components/Modal'
import { useT } from '../../i18n'

export function DangerSection() {
  const t = useT()
  const clearAll = useAppStore((s) => s.clearAll)
  const [confirm, setConfirm] = useState(false)
  const [done, setDone] = useState(false)
  return (
    <section className="card space-y-2">
      <h2 className="font-semibold text-red-700">{t('danger.title')}</h2>
      <p className="text-sm text-slate-600">{t('danger.desc')}</p>
      <button className="btn-danger" onClick={() => setConfirm(true)}>
        <Trash2 size={16} aria-hidden /> {t('danger.btn')}
      </button>
      {done && <Notice>{t('danger.done')}</Notice>}
      {confirm && (
        <ConfirmDialog
          title={t('danger.btn')}
          message={t('danger.confirmMsg')}
          confirmLabel={t('danger.confirmBtn')}
          onCancel={() => setConfirm(false)}
          onConfirm={() => {
            clearAll()
            setConfirm(false)
            setDone(true)
          }}
        />
      )}
    </section>
  )
}
