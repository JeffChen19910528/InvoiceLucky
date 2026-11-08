import type { ChangeEvent } from 'react'

/** 讀取 <input type="file"> 選取的第一個檔案文字，並重設 input 以便重複選同一檔。 */
export function readSelectedFile(e: ChangeEvent<HTMLInputElement>): Promise<string | null> {
  const f = e.target.files?.[0]
  e.target.value = ''
  return f ? f.text() : Promise.resolve(null)
}
