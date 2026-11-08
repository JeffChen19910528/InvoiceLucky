import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

async function goto(page: import('@playwright/test').Page, name: string) {
  await page.getByRole('navigation', { name: '主要導覽' }).getByRole('button', { name }).click()
}

test('新增、批次對獎、重新整理後資料保留、編輯與刪除', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 800 })
  await goto(page, '發票')
  await page.getByRole('button', { name: '新增發票' }).first().click()
  await page.getByLabel('發票號碼').fill('ab-54348835')
  await page.getByLabel('消費日期').fill('2026-07-20')
  await page.getByLabel('金額（元）').fill('120')
  await page.getByRole('button', { name: '新增', exact: true }).click()
  await expect(page.getByTestId('invoice-row')).toHaveCount(1)
  await expect(page.getByTestId('result-won')).toContainText('頭獎')

  // 重複防護
  await page.getByRole('button', { name: '新增發票' }).first().click()
  await page.getByLabel('發票號碼').fill('AB54348835')
  await page.getByLabel('消費日期').fill('2026-07-21')
  await page.getByRole('button', { name: '新增', exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: '未重複新增' })).toBeVisible()
  await page.getByRole('button', { name: '取消' }).click()

  // 批次輸入
  await page.getByRole('button', { name: '批次輸入' }).click()
  await page.getByLabel('批次發票內容').fill('CD00000835\nEF12345678\n2026-08-03,GH06595111,250,"晚餐, 朋友"\nBAD')
  await expect(page.getByText('可新增 3 張')).toBeVisible()
  await page.getByRole('button', { name: '新增 3 張' }).click()
  await page.getByRole('button', { name: '關閉' }).click()
  await expect(page.getByTestId('invoice-row')).toHaveCount(4)

  // 對獎中心
  await goto(page, '對獎')
  await expect(page.getByTestId('prize-numbers')).toContainText('89996565')
  await expect(page.getByTestId('batch-summary')).toContainText('中獎 3 張')
  await page.getByLabel('輸入發票號碼快速對獎').fill('zz91098182')
  await expect(page.getByTestId('quick-result')).toContainText('特獎')

  // 重新整理後仍存在
  await page.reload()
  await goto(page, '發票')
  await expect(page.getByTestId('invoice-row')).toHaveCount(4)

  // 編輯
  await page.getByRole('button', { name: '編輯 EF12345678' }).click()
  await page.getByLabel('備註', { exact: true }).fill('編輯後備註')
  await page.getByRole('button', { name: '儲存變更' }).click()
  await expect(page.getByText('編輯後備註')).toBeVisible()

  // 刪除需二次確認
  await page.getByRole('button', { name: '刪除 EF12345678' }).click()
  await page.getByRole('dialog').getByRole('button', { name: '取消' }).click()
  await expect(page.getByTestId('invoice-row')).toHaveCount(4)
  await page.getByRole('button', { name: '刪除 EF12345678' }).click()
  await page.getByRole('dialog').getByRole('button', { name: '刪除' }).click()
  await expect(page.getByTestId('invoice-row')).toHaveCount(3)
})

test('無獎號期別不誤判；匯出與匯入備份', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 800 })
  await goto(page, '發票')
  await page.getByRole('button', { name: '新增發票' }).first().click()
  await page.getByLabel('發票號碼').fill('AB12345678')
  await page.getByLabel('消費日期').fill('2026-10-15') // 115-09-10 尚無獎號
  await page.getByRole('button', { name: '新增', exact: true }).click()
  await expect(page.getByTestId('result-nodata')).toBeVisible()
  await expect(page.getByTestId('result-lost')).toHaveCount(0)

  await goto(page, '設定')
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: '匯出 JSON 備份' }).click()])
  const path = await dl.path()
  const json = readFileSync(path!, 'utf8')
  expect(JSON.parse(json).invoices).toHaveLength(1)

  // 無效檔案不破壞資料
  await page.getByLabel('選擇備份檔').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{oops') })
  await expect(page.getByTestId('import-preview')).toContainText('不是有效的 JSON')

  // 清除（二次確認）後匯入還原
  await page.getByRole('button', { name: '清除所有本機資料' }).click()
  await page.getByRole('dialog').getByRole('button', { name: '確定清除' }).click()
  await page.getByLabel('選擇備份檔').setInputFiles({ name: 'ok.json', mimeType: 'application/json', buffer: Buffer.from(json) })
  await expect(page.getByTestId('import-preview')).toContainText('新增發票 1 張')
  await page.getByRole('button', { name: '確認匯入' }).click()
  await goto(page, '發票')
  await expect(page.getByTestId('invoice-row')).toHaveCount(1)
})

test('手動輸入獎號後該期可對獎；手機版面無橫向捲動', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 })
  await page.getByRole('navigation', { name: '主要導覽（行動版）' }).getByRole('button', { name: '設定' }).click()
  await page.getByRole('tab', { name: '手動輸入' }).click()
  await page.getByLabel('特別獎（8 位數）').fill('00000001')
  await page.getByLabel('特獎（8 位數）').fill('00000002')
  await page.getByLabel(/頭獎/).fill('12345678')
  await page.getByRole('button', { name: '儲存此期獎號' }).click()
  await expect(page.getByText('已儲存 115 年 09-10 月 獎號')).toBeVisible()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
  expect(overflow).toBe(false)
})

test('切換英文語系後介面為英文、重新整理後保留，並可新增發票對獎', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 800 })
  await page.getByRole('combobox', { name: '語言' }).selectOption('en')
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')

  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Invoices' }).click()
  await page.getByRole('button', { name: 'Add invoice' }).first().click()
  await page.getByLabel('Invoice number').fill('AB54348835')
  await page.getByLabel('Purchase date').fill('2026-07-20')
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(page.getByTestId('result-won')).toContainText('First Prize')
})
