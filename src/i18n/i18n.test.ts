import { describe, expect, it } from 'vitest'
import { joinMsgs, msg } from '../domain/models/message'
import { LANG_STORAGE_KEY, readStoredLang, translate, writeStoredLang } from './core'
import { dictionaries } from './messages'

describe('i18n 核心', () => {
  it('兩種語言的字典鍵完全一致，且每個字串的 {參數} 相同', () => {
    const zh = dictionaries['zh-TW']
    const en = dictionaries.en
    expect(Object.keys(en).sort()).toEqual(Object.keys(zh).sort())
    const params = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
    for (const k of Object.keys(zh)) expect(params(en[k]), k).toEqual(params(zh[k]))
  })

  it('插入參數、巢狀 Msg 與缺字退回原鍵', () => {
    const en = dictionaries.en
    expect(translate(en, 'inv.deleteAria', { n: 'AB12345678' })).toBe('Delete AB12345678')
    expect(translate(en, msg('backup.fatal', { msg: msg('import.notJson') }))).toBe('Not a valid JSON file. Your existing data is unaffected.')
    expect(translate(en, joinMsgs([msg('err.eightDigits'), msg('err.dateFormat')]))).toContain('; ')
    expect(translate(en, 'Required')).toBe('Required')
  })

  it('語言偏好存取：預設繁中、可讀寫、儲存失敗不拋錯', () => {
    const m = new Map<string, string>()
    const store = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }
    expect(readStoredLang(store)).toBe('zh-TW')
    writeStoredLang(store, 'en')
    expect(m.get(LANG_STORAGE_KEY)).toBe('en')
    expect(readStoredLang(store)).toBe('en')
    m.set(LANG_STORAGE_KEY, 'fr')
    expect(readStoredLang(store)).toBe('zh-TW')
    const broken = { getItem: () => { throw new Error('x') }, setItem: () => { throw new Error('x') } }
    expect(readStoredLang(broken)).toBe('zh-TW')
    expect(() => writeStoredLang(broken, 'en')).not.toThrow()
  })
})
