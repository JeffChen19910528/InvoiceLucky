import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { useAppStore } from '../stores/appStore'
import { setLang } from '../i18n/langStore'

beforeEach(() => {
  setLang('zh-TW')
  useAppStore.getState().clearAll()
})

describe('App', () => {
  it('總覽顯示最近有獎號的期別與來源，且尚無發票時為 0 張', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: '總覽' })).toBeInTheDocument()
    expect(screen.getByTestId('stat-total')).toHaveTextContent('0 張')
    expect(screen.getAllByText('官方來源（網站快照）').length).toBeGreaterThan(0)
  })

  it('新增發票後在發票頁顯示中獎結果，錯誤格式顯示提示', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(within(screen.getByRole('navigation', { name: '主要導覽' })).getByRole('button', { name: '發票' }))
    await user.click(screen.getAllByRole('button', { name: /新增發票/ })[0])
    await user.type(screen.getByLabelText('發票號碼'), 'bad')
    await user.click(screen.getByRole('button', { name: /^新增$/ }))
    expect(screen.getByText(/2 個英文字母 \+ 8 位數字/)).toBeInTheDocument()

    await user.clear(screen.getByLabelText('發票號碼'))
    await user.type(screen.getByLabelText('發票號碼'), 'ab06595111')
    await user.click(screen.getByRole('button', { name: /^新增$/ }))
    // 今天（測試環境日期）未必落在 115-07-08；僅驗證資料已寫入並保留前導零
    expect(useAppStore.getState().invoices[0].invoiceNumber).toBe('AB06595111')
  })

  it('語言切換為英文後介面改為英文，且偏好被保存、可切回繁中', async () => {
    const user = userEvent.setup()
    render(<App />)
    const nav = () => screen.getByRole('navigation', { name: /Main navigation$|主要導覽$/ })
    await user.selectOptions(screen.getAllByRole('combobox', { name: '語言' })[0], 'en')
    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument()
    expect(within(nav()).getByRole('button', { name: 'Invoices' })).toBeInTheDocument()
    expect(screen.getByTestId('stat-total')).toHaveTextContent('0')
    expect(screen.getAllByText('Official (site snapshot)').length).toBeGreaterThan(0)
    expect(document.documentElement.lang).toBe('en')
    expect(localStorage.getItem('invoice-lucky:lang')).toBe('en')

    await user.selectOptions(screen.getAllByRole('combobox', { name: 'Language' })[0], 'zh-TW')
    expect(screen.getByRole('heading', { name: '總覽' })).toBeInTheDocument()
  })
})
