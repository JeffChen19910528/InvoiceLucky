/**
 * 與語言無關的訊息：domain / services 只回傳代碼與參數，
 * 由 UI 層（i18n）負責翻譯，使核心邏輯不依賴任何語系或 UI。
 */
export interface Msg {
  key: string
  params?: Record<string, string | number | Msg>
}

export const msg = (key: string, params?: Msg['params']): Msg => ({ key, params })

/** 將多則訊息串接成一則（分隔符號由字典 `common.join` 決定）。 */
export function joinMsgs(list: Msg[]): Msg {
  return list.reduce((a, b) => msg('common.join', { a, b }))
}
