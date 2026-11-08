import type { Msg } from '../domain/models/message'

export type Lang = 'zh-TW' | 'en'
export const LANGS: Lang[] = ['zh-TW', 'en']
export const DEFAULT_LANG: Lang = 'zh-TW'
export const LANG_STORAGE_KEY = 'invoice-lucky:lang'

export type Dictionary = Record<string, string>

export function isLang(v: unknown): v is Lang {
  return v === 'zh-TW' || v === 'en'
}

/** 純函式：依字典翻譯代碼或 Msg；缺字時退回代碼本身（zod 內建訊息亦走此路徑）。 */
export function translate(dict: Dictionary, input: string | Msg, params?: Msg['params']): string {
  const key = typeof input === 'string' ? input : input.key
  const p = typeof input === 'string' ? params : input.params
  const tpl = dict[key] ?? key
  if (!p) return tpl
  return tpl.replace(/\{(\w+)\}/g, (_, name: string) => {
    const v = p[name]
    if (v === undefined) return `{${name}}`
    return typeof v === 'object' ? translate(dict, v) : String(v)
  })
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

export function readStoredLang(storage: StorageLike | null): Lang {
  try {
    const v = storage?.getItem(LANG_STORAGE_KEY)
    return isLang(v) ? v : DEFAULT_LANG
  } catch {
    return DEFAULT_LANG
  }
}

export function writeStoredLang(storage: StorageLike | null, lang: Lang): void {
  try {
    storage?.setItem(LANG_STORAGE_KEY, lang)
  } catch {
    /* 無法儲存時僅本次工作階段生效 */
  }
}
