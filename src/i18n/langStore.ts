import { readStoredLang, writeStoredLang, type Lang } from './core'

const storage = (): Storage | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

const htmlLang = (l: Lang) => (l === 'en' ? 'en' : 'zh-Hant-TW')

let current: Lang = readStoredLang(storage())
if (typeof document !== 'undefined') document.documentElement.lang = htmlLang(current)
const listeners = new Set<() => void>()

export const getLang = () => current
export const subscribeLang = (fn: () => void) => {
  listeners.add(fn)
  return () => void listeners.delete(fn)
}

export function setLang(lang: Lang): void {
  if (lang === current) return
  current = lang
  writeStoredLang(storage(), lang)
  if (typeof document !== 'undefined') document.documentElement.lang = htmlLang(lang)
  listeners.forEach((l) => l())
}
