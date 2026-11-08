import { useCallback, useMemo, useSyncExternalStore } from 'react'
import type { Msg } from '../domain/models/message'
import { translate, type Lang } from './core'
import { getLang, setLang, subscribeLang } from './langStore'
import { dictionaries, type MessageKey } from './messages'

export function useLang(): [Lang, (l: Lang) => void] {
  const lang = useSyncExternalStore(subscribeLang, getLang, getLang)
  return [lang, setLang]
}

export type TFunction = (input: MessageKey | Msg, params?: Msg['params']) => string

/** 回傳綁定目前語言的翻譯函式；語言切換時使用它的元件會重新渲染。 */
export function useT(): TFunction {
  const [lang] = useLang()
  return useCallback((input, params) => translate(dictionaries[lang], input, params), [lang])
}

export interface Formatters {
  lang: Lang
  money: (n: number) => string
  period: (id: string) => string
  dateTime: (iso: string) => string
  /** 預設獎項名稱依語言翻譯；期別自訂的名稱原樣顯示。 */
  tier: (name: string) => string
}

export function useFormat(): Formatters {
  const [lang] = useLang()
  const t = useT()
  return useMemo(
    () => ({
      lang,
      money: (n) => `NT$ ${n.toLocaleString(lang)}`,
      period: (id) => {
        const m = /^(\d{2,3})-(\d{2})-(\d{2})$/.exec(id)
        return m ? t('period.format', { year: m[1], m1: m[2], m2: m[3] }) : id
      },
      dateTime: (iso) => new Date(iso).toLocaleString(lang),
      tier: (name) => dictionaries[lang][`tier.${name}`] ?? name,
    }),
    [lang, t],
  )
}
