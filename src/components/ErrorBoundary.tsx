import { Component, type ReactNode } from 'react'
import { translate } from '../i18n/core'
import { getLang } from '../i18n/langStore'
import { dictionaries } from '../i18n/messages'

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    if (!this.state.error) return this.props.children
    // 錯誤邊界可能在 React 樹壞掉時顯示，故不依賴 hook，直接讀目前語言。
    const t = (key: string) => translate(dictionaries[getLang()], key)
    return (
      <div role="alert" className="mx-auto mt-16 max-w-md rounded-xl border border-red-200 bg-white p-6 text-center">
        <h1 className="text-lg font-semibold text-red-700">{t('error.title')}</h1>
        <p className="mt-2 text-sm text-slate-600">{this.state.error.message}</p>
        <p className="mt-2 text-xs text-slate-500">{t('error.hint')}</p>
        <button className="btn-primary mt-4" onClick={() => location.reload()}>
          {t('error.reload')}
        </button>
      </div>
    )
  }
}
