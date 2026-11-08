# InvoiceLucky 台灣發票幸運兌獎平台

**繁體中文** | [English](README.en.md)

純前端、RWD、支援繁體中文與英文介面的台灣統一發票對獎網站。無需註冊或登入，發票資料只存在您的瀏覽器。

> **非官方聲明**：本專案為民間輔助查詢工具，不是財政部官方服務，不提供實際兌領、載具歸戶、銀行帳戶設定或雲端載具發票讀取。對獎結果僅為號碼比對，是否中獎及可否領獎請以官方公告與兌獎單位為準。

## 功能

- 發票新增／編輯／刪除（刪除需二次確認）、批次輸入（`AB12345678` 或 `日期,號碼,金額,備註`）、依期別篩選／搜尋／排序、同期重複防護
- 對獎中心：特別獎、特獎、頭獎、二至六獎；單張快速對獎與已登錄發票批次對獎；每張只計最高單一獎項
- 總覽：本期張數、中獎張數、預估中獎總額、領獎期限提示（可領／已逾期分開統計）
- 開獎紀錄：依年度瀏覽，顯示來源狀態、領獎期間、取得時間
- 備份：JSON 全量匯出／匯入（先預覽、驗證後才一次提交，失敗不動原資料）、CSV 匯出
- 獎號資料：貼上官方頁面 HTML 解析、匯入 JSON、手動輸入
- 介面語言切換：繁體中文／English（桌面側邊欄、手機頂部皆可切換；偏好存於本機，重新整理後保留）
- 手機底部導覽／桌面側邊導覽、離線提示、`prefers-reduced-motion`

## 技術架構

React 19 + TypeScript、Vite、Tailwind CSS 3、Zustand、Zod、lucide-react；測試：Vitest + Testing Library、Playwright。

```
src/
├─ domain/          # 無 UI 依賴的純邏輯
│  ├─ models/       # 型別、Zod schema、與語言無關的訊息代碼（Msg）
│  ├─ period/       # 期別計算（民國年、跨年、閏年）
│  └─ prize-engine/ # 唯一的對獎實作（資料驅動的獎項規則）
├─ services/
│  ├─ prize-data/   # 內建官方快照、官方 HTML parser
│  ├─ import-export/# CSV、批次輸入、備份 JSON 驗證與預覽
│  └─ storage/      # localStorage（版本化、損毀復原）
├─ i18n/            # 語系：翻譯核心、語言狀態、React hook、zh-TW／en 字典
├─ stores/          # Zustand store 與 hooks
├─ features/        # 五個頁面（invoices、settings 依職責再拆成多個元件）
├─ components/      # 共用 UI 元件
├─ lib/             # 與框架無關的小工具（下載、讀檔）
└─ app/             # 頁面路由型別
e2e/                # Playwright 核心流程
```

設計重點：發票號碼全程以字串處理（保留前導零）；獎項、獎金、期別、領獎日期皆來自資料（`PrizePeriod.tiers` 可覆寫預設規則）；UI 不自行比對；domain／services 只回傳訊息代碼（`Msg`），由 UI 依目前語言翻譯，因此核心邏輯不依賴任何語系。

## 本機啟動

需要 Node.js 20+。

```bash
npm install
npm run dev        # 開發伺服器
npm run build      # 產生 dist/
npm run preview    # 預覽 production build
```

## 多語系（i18n）

- 字典位於 `src/i18n/messages/`：`zh-TW.ts` 是鍵的來源，`en.ts` 以型別強制提供完全相同的鍵（漏翻譯會在 `typecheck` 失敗，並有單元測試檢查參數佔位符一致）。
- 元件以 `useT()` 取得翻譯函式、`useFormat()` 取得金額／期別／日期格式化；切換語言時有用到的元件會自動重新渲染。
- 新增語言：在 `core.ts` 的 `Lang` 與 `LANGS` 加入代碼、新增字典檔並註冊到 `messages/index.ts` 即可。
- 預設為繁體中文；選擇的語言存於 `localStorage`（key：`invoice-lucky:lang`）。

## 測試

```bash
npm run lint
npm run typecheck
npm test                          # 單元／元件測試（Vitest）
npx playwright install chromium   # 首次需安裝瀏覽器
npm run e2e                       # E2E（會自動 build 並啟動 preview）
npx vitest run src/domain/prize-engine/engine.test.ts   # 單一測試檔
```

## 部署

本專案已附 GitHub Actions 流程（`.github/workflows/deploy.yml`）：push 到 `master`／`main` 時會自動執行 lint、typecheck、測試與 build，並發佈到 GitHub Pages。首次使用請到 repo 的 **Settings → Pages → Build and deployment → Source** 選擇 **GitHub Actions**。網址為 `https://<帳號>.github.io/<repo 名稱>/`。

`vite.config.ts` 使用 `base: './'`，且為單頁、無前端路由，產出的 `dist/` 可直接放到任何靜態主機：

- **Cloudflare Pages / Vercel / Netlify**：Build command `npm run build`，Output directory `dist`。
- **GitHub Pages**：將 `dist/` 內容發佈到 Pages 分支或使用 Actions 上傳 `dist/`。

不需要環境變數，因此沒有 `.env.example`。

## 本機資料與備份

- 資料存於瀏覽器 `localStorage`（key：`invoice-lucky:v1`；語言偏好為 `invoice-lucky:lang`），**不會上傳到任何伺服器**，專案也不含任何 API 金鑰。
- 清除瀏覽器資料、無痕模式或換裝置都會失去資料，請定期於「設定」匯出 JSON 備份。
- 本機資料損毀時，原始內容會另存到 `invoice-lucky:corrupt-backup`，並以空資料啟動、顯示警告。
- 備份 JSON 內的獎號一律視為「使用者匯入」，不會被當成官方資料。

## 官方獎號來源、同步限制與更新流程

官方來源：

- 財政部稅務入口網中獎號碼：<https://invoice.etax.nat.gov.tw/lastNumber.html>
- 雲端發票專屬獎：<https://invoice.etax.nat.gov.tw/cloudNowNumber.html>
- 電子發票整合服務平台：<https://www.einvoice.nat.gov.tw/>

**實測結果（2026-11-08）**：

- 上述頁面可正常取得（HTTP 200，靜態 HTML），但回應**沒有 `Access-Control-Allow-Origin`**，瀏覽器端的跨網域請求會被擋下，因此網站**無法自動同步**。本專案不使用任何第三方 CORS proxy 或來源不明的 API，也未假設電子發票開放資料 API 含有中獎號碼。
- 內建 115 年 05-06 月、07-08 月兩期為當日直接讀取官方頁面的**靜態快照**（標示「官方來源（內建快照）」及取得時間），不是即時同步。
- 雲端專屬獎號碼僅以 PDF 清單公布（五百元、八百元、兩千元、百萬元），無可機器讀取的資料，故**不內建**。

**新期別的更新方式**（設定頁 →「獎號資料」）：

1. 貼上官方頁面 HTML：在官方「中獎號碼單」頁按右鍵檢視原始碼、全選複製、貼上並解析。parser 會檢查期別、各獎號為 8 位數字、領獎期間；結構變更時會明確報錯，不會回退到舊資料。
2. 匯入 JSON：格式見設定頁的「下載範例格式」，範例號碼只是格式示意。可用 `tiers` 覆寫獎項規則、用 `cloudPrizes` 提供雲端專屬獎資料。
3. 手動輸入該期特別獎、特獎、頭獎與領獎期間。

匯入的資料一律標示為「使用者匯入」，請與官方網站核對。沒有獎號的期別，發票會顯示「尚無獎號，未對獎」，**不會被判為未中獎**，也不會用其他期別代替。

## 雲端發票專屬獎的限制

雲端專屬獎以獨立資料模型（`PrizePeriod.cloudPrizes`）表示，只有資料存在、且該發票被使用者標示為「雲端發票」時才會比對；紙本發票永遠不適用。與一般獎同時命中時只計金額最高者。由於官方只提供 PDF，目前版本沒有任何內建雲端獎號，UI 會明示「尚未取得可驗證的雲端專屬獎資料」。

## 已知限制與後續方向

- 無法自動同步官方獎號（見上）；新期別需手動匯入。
- 不判斷領獎資格（買受人身分、是否載明金額、雲端發票是否於開獎前列印等），也不計算所得稅／印花稅。
- 未提供開獎日期（官方頁面未載明，不推測）。
- 後續可考慮：PWA 離線安裝、相機掃描發票 QR Code、雲端專屬獎 PDF 解析匯入。
