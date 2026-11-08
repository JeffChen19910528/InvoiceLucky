import { Languages } from 'lucide-react'
import { LANGS, useLang, useT, type Lang } from '../i18n'

const LANG_NAME: Record<Lang, string> = { 'zh-TW': '繁體中文', en: 'English' }

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const [lang, setLang] = useLang()
  const t = useT()
  return (
    <label className={`inline-flex items-center gap-1.5 text-xs ${className}`}>
      <Languages size={14} aria-hidden />
      <select
        aria-label={t('lang.label')}
        className="rounded-md border border-slate-300 bg-white px-1.5 py-1 text-xs text-slate-700"
        value={lang}
        onChange={(e) => setLang(e.target.value as Lang)}
      >
        {LANGS.map((l) => (
          <option key={l} value={l}>
            {LANG_NAME[l]}
          </option>
        ))}
      </select>
    </label>
  )
}
