import { useState } from 'react'
import { useAppStore } from '../../stores/appStore'
import { usePeriods } from '../../stores/hooks'
import { Notice } from '../../components/ui'
import { SourceBadge } from '../../components/badges'
import { parsePrizeJson, PRIZE_JSON_EXAMPLE } from '../../services/import-export/backup'
import { OfficialParseError, parseOfficialHtml } from '../../services/prize-data/officialParser'
import { OFFICIAL_LINKS } from '../../services/prize-data/seed'
import { downloadFile } from '../../lib/download'
import { readSelectedFile } from '../../lib/files'
import { useFormat, useT, type MessageKey } from '../../i18n'
import { ManualPeriodForm } from './ManualPeriodForm'

type TabId = 'html' | 'json' | 'manual'
const TABS: Array<[TabId, MessageKey]> = [
  ['html', 'prize.tabHtml'],
  ['json', 'prize.tabJson'],
  ['manual', 'prize.tabManual'],
]

export function PrizeDataSection() {
  const t = useT()
  const f = useFormat()
  const periods = usePeriods()
  const savePeriods = useAppStore((s) => s.savePeriods)
  const removeUserPeriod = useAppStore((s) => s.removeUserPeriod)
  const [tab, setTab] = useState<TabId>('html')
  const [text, setText] = useState('')
  const [msg, setMsg] = useState<{ tone: 'info' | 'error'; text: string } | null>(null)

  const importHtml = () => {
    try {
      const p = parseOfficialHtml(text)
      savePeriods([p])
      setMsg({ tone: 'info', text: t('prize.imported', { period: f.period(p.id) }) })
      setText('')
    } catch (e) {
      setMsg({ tone: 'error', text: e instanceof OfficialParseError ? t(e.msg) : t('prize.unknownError') })
    }
  }
  const importJson = (raw: string) => {
    const r = parsePrizeJson(raw)
    if (r.errors.length) return setMsg({ tone: 'error', text: r.errors.map((m) => t(m)).join('\n') })
    savePeriods(r.periods)
    setMsg({ tone: 'info', text: t('prize.importedN', { n: r.periods.length }) })
    setText('')
  }

  return (
    <section className="card space-y-3">
      <h2 className="font-semibold">{t('prize.title')}</h2>
      <Notice>
        {t('prize.cors')}
        {OFFICIAL_LINKS.map((l) => (
          <a key={l.url} className="ml-2 underline" href={l.url} target="_blank" rel="noreferrer noopener">
            {t(l.label)}
          </a>
        ))}
      </Notice>
      <div role="tablist" className="flex gap-1 border-b">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            className={`px-3 py-2 text-sm ${tab === id ? 'border-b-2 border-brand-600 font-semibold text-brand-700' : 'text-slate-600'}`}
            onClick={() => {
              setTab(id)
              setMsg(null)
              setText('')
            }}
          >
            {t(label)}
          </button>
        ))}
      </div>
      {tab === 'html' && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500">{t('prize.htmlHelp')}</p>
          <textarea aria-label={t('prize.htmlAria')} className="input h-32 font-mono text-xs" value={text} onChange={(e) => setText(e.target.value)} />
          <button className="btn-primary" disabled={!text.trim()} onClick={importHtml}>
            {t('prize.parse')}
          </button>
        </div>
      )}
      {tab === 'json' && (
        <div className="space-y-2">
          <textarea aria-label={t('prize.jsonAria')} className="input h-40 font-mono text-xs" value={text} onChange={(e) => setText(e.target.value)} placeholder={PRIZE_JSON_EXAMPLE} />
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" disabled={!text.trim()} onClick={() => importJson(text)}>
              {t('prize.import')}
            </button>
            <label className="btn-ghost cursor-pointer">
              {t('prize.pickFile')}
              <input
                type="file"
                accept="application/json,.json"
                className="sr-only"
                aria-label={t('prize.pickFileAria')}
                onChange={async (e) => {
                  const raw = await readSelectedFile(e)
                  if (raw !== null) importJson(raw)
                }}
              />
            </label>
            <button className="btn-ghost" onClick={() => downloadFile('prize-example.json', PRIZE_JSON_EXAMPLE, 'application/json')}>
              {t('prize.example')}
            </button>
          </div>
          <p className="text-xs text-slate-500">{t('prize.exampleNote')}</p>
        </div>
      )}
      {tab === 'manual' && (
        <ManualPeriodForm
          onSave={(p) => {
            savePeriods([p])
            setMsg({ tone: 'info', text: t('manual.saved', { period: f.period(p.id) }) })
          }}
        />
      )}
      {msg && (
        <Notice tone={msg.tone}>
          <span className="whitespace-pre-line">{msg.text}</span>
        </Notice>
      )}

      <h3 className="pt-2 text-sm font-semibold">{t('prize.available')}</h3>
      <ul className="divide-y text-sm">
        {periods.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <span>{f.period(p.id)}</span>
            <span className="flex items-center gap-2">
              <SourceBadge source={p.source} />
              {p.source !== 'official' && (
                <button className="btn-ghost px-2 py-1 text-xs text-red-600" aria-label={t('prize.removeAria', { id: p.id })} onClick={() => removeUserPeriod(p.id)}>
                  {t('prize.remove')}
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-slate-500">{t('prize.overrideNote')}</p>
    </section>
  )
}
