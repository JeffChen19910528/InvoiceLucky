import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ScanDialog } from './ScanDialog'
import { useAppStore } from '../../stores/appStore'
import { setLang } from '../../i18n/langStore'
import { CameraError, toCameraError, type CodeScanner } from '../../services/scanner/scanner'

const QR = 'AB11234578' + '1150815' + '1234' + '00000064' + '00000069' + '00000000' + '12345678' + 'xxxxxxxxxxxxxxxxxxxxxxxx'

function fakeScanner(startError?: CameraError) {
  let emit: (t: string) => void = () => {}
  const stop = vi.fn()
  const scanner: CodeScanner = {
    start: async (_v, onCode) => {
      if (startError) throw startError
      emit = onCode
    },
    stop,
  }
  return { factory: () => scanner, scan: (t: string) => act(() => emit(t)), stop }
}

beforeEach(() => {
  setLang('zh-TW')
  useAppStore.getState().clearAll()
})

describe('ScanDialog', () => {
  it('掃到電子發票 QR Code 會加入清單（重複略過），確認後以號碼、日期、金額寫入', async () => {
    const user = userEvent.setup()
    const fake = fakeScanner()
    render(<ScanDialog onClose={() => {}} createScanner={fake.factory} />)
    await screen.findByText('已掃描（0 張）')

    await fake.scan(QR)
    expect(screen.getByTestId('scan-list')).toHaveTextContent('AB11234578')
    expect(screen.getByTestId('scan-list')).toHaveTextContent('2026-08-15')
    expect(screen.getByTestId('scan-list')).toHaveTextContent('NT$ 105')

    await new Promise((r) => setTimeout(r, 1600)) // 越過連續重複過濾，驗證清單層級的去重
    await fake.scan(QR)
    expect(screen.getByText('這張已在清單中。')).toBeInTheDocument()
    expect(screen.getByText('已掃描（1 張）')).toBeInTheDocument()

    await fake.scan('**:1:1:1:商品')
    expect(screen.getByText(/右側的 QR Code/)).toBeInTheDocument()
    await fake.scan('https://example.com')
    expect(screen.getByText(/不是電子發票/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '新增 1 張' }))
    expect(useAppStore.getState().invoices).toMatchObject([{ invoiceNumber: 'AB11234578', invoiceDate: '2026-08-15', period: '115-07-08', amount: 105 }])
    expect(screen.getByText(/已新增 1 張/)).toBeInTheDocument()
  })

  it('已登錄的同期同號碼不會被覆蓋，並回報略過', async () => {
    const user = userEvent.setup()
    const fake = fakeScanner()
    render(<ScanDialog onClose={() => {}} createScanner={fake.factory} />)
    await screen.findByText('已掃描（0 張）')
    await fake.scan(QR)
    await user.click(screen.getByRole('button', { name: '新增 1 張' }))
    await fake.scan('AB11234578' + '1150816' + '9999' + '00000001' + '00000001')
    await user.click(screen.getByRole('button', { name: '新增 1 張' }))
    expect(useAppStore.getState().invoices).toHaveLength(1)
    expect(screen.getByText(/略過重複 1 張/)).toBeInTheDocument()
  })

  it('相機被拒絕時顯示說明與重試，不會崩潰', async () => {
    const fake = fakeScanner(new CameraError('denied'))
    render(<ScanDialog onClose={() => {}} createScanner={fake.factory} />)
    expect(await screen.findByText(/相機權限被拒絕/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '重試' })).toBeInTheDocument()
  })

  it('關閉對話框時釋放相機', async () => {
    const fake = fakeScanner()
    const { unmount } = render(<ScanDialog onClose={() => {}} createScanner={fake.factory} />)
    await screen.findByText('已掃描（0 張）')
    unmount()
    expect(fake.stop).toHaveBeenCalled()
  })
})

describe('toCameraError', () => {
  it('將瀏覽器錯誤對應成錯誤代碼', () => {
    const named = (name: string) => Object.assign(new Error('x'), { name })
    expect(toCameraError(named('NotAllowedError')).code).toBe('denied')
    expect(toCameraError(named('NotFoundError')).code).toBe('no-camera')
    expect(toCameraError(named('NotReadableError')).code).toBe('busy')
    expect(toCameraError(new Error('?')).code).toBe('unknown')
  })
})
