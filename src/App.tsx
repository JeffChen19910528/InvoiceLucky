import { useEffect, useState } from 'react'
import { BarChart3, History, Receipt, Settings, Ticket, WifiOff, X } from 'lucide-react'
import { useAppStore } from './stores/appStore'
import { Notice } from './components/ui'
import { LanguageSwitcher } from './components/LanguageSwitcher'
import { useT, type MessageKey } from './i18n'
import type { PageId } from './app/pages'
import Dashboard from './features/Dashboard'
import InvoicesPage from './features/invoices/InvoicesPage'
import LotteryPage from './features/LotteryPage'
import HistoryPage from './features/HistoryPage'
import SettingsPage from './features/settings/SettingsPage'

const NAV: Array<{ id: PageId; label: MessageKey; icon: typeof Receipt }> = [
  { id: 'dashboard', label: 'nav.dashboard', icon: BarChart3 },
  { id: 'invoices', label: 'nav.invoices', icon: Receipt },
  { id: 'lottery', label: 'nav.lottery', icon: Ticket },
  { id: 'history', label: 'nav.history', icon: History },
  { id: 'settings', label: 'nav.settings', icon: Settings },
]

function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

export default function App() {
  const t = useT()
  const [page, setPage] = useState<PageId>('dashboard')
  const warning = useAppStore((s) => s.warning)
  const dismiss = useAppStore((s) => s.dismissWarning)
  const online = useOnline()
  const syncPublished = useAppStore((s) => s.syncPublished)
  useEffect(() => {
    void syncPublished()
  }, [syncPublished])

  const navButton = (n: (typeof NAV)[number], vertical: boolean) => {
    const Icon = n.icon
    const active = page === n.id
    return (
      <button
        key={n.id}
        onClick={() => setPage(n.id)}
        aria-current={active ? 'page' : undefined}
        className={`flex items-center rounded-lg py-2 font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 ${
          vertical ? 'w-full gap-2 px-3 text-sm' : 'min-w-0 flex-1 flex-col justify-start gap-0.5 px-1 text-center text-[11px] leading-tight min-[400px]:text-xs'
        } ${active ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'}`}
      >
        <Icon size={vertical ? 18 : 20} aria-hidden />
        {t(n.label)}
      </button>
    )
  }

  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden w-56 shrink-0 border-r border-slate-200 bg-white p-4 md:block">
        <div className="mb-6 px-2">
          <div className="text-lg font-bold text-brand-900">🧾 InvoiceLucky</div>
          <div className="text-xs text-slate-500">{t('app.tagline')}</div>
        </div>
        <nav aria-label={t('nav.main')} className="space-y-1">
          {NAV.map((n) => navButton(n, true))}
        </nav>
        <LanguageSwitcher className="mt-4 px-2 text-slate-600" />
        <p className="mt-6 px-2 text-xs leading-relaxed text-slate-500">{t('app.disclaimer')}</p>
      </aside>

      <div className="min-w-0 flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
        <header className="flex items-center justify-between gap-2 border-b border-slate-200 bg-brand-900 px-4 py-3 text-white md:hidden">
          <span className="shrink-0 font-bold">🧾 InvoiceLucky</span>
          <span className="flex min-w-0 items-center gap-2">
            <span className="text-xs leading-tight text-cyan-100">{t('app.unofficialShort')}</span>
            <LanguageSwitcher />
          </span>
        </header>
        <main className="mx-auto max-w-4xl space-y-4 p-4 md:p-6">
          {!online && (
            <Notice tone="warn">
              <span className="inline-flex items-center gap-1">
                <WifiOff size={14} aria-hidden /> {t('app.offline')}
              </span>
            </Notice>
          )}
          {warning && (
            <div className="relative">
              <Notice tone="error">{t(warning)}</Notice>
              <button aria-label={t('app.dismissWarning')} className="absolute right-2 top-2 text-red-700" onClick={dismiss}>
                <X size={16} />
              </button>
            </div>
          )}
          {page === 'dashboard' && <Dashboard go={setPage} />}
          {page === 'invoices' && <InvoicesPage />}
          {page === 'lottery' && <LotteryPage go={setPage} />}
          {page === 'history' && <HistoryPage />}
          {page === 'settings' && <SettingsPage />}
        </main>
      </div>

      <nav aria-label={t('nav.mobile')} className="fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-white p-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] md:hidden">
        {NAV.map((n) => navButton(n, false))}
      </nav>
    </div>
  )
}
