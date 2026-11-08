# InvoiceLucky — Taiwan Receipt Lottery Checker

[繁體中文](README.md) | **English**

A front-end-only, responsive web app for checking Taiwan's uniform invoice (receipt) lottery. The interface is available in Traditional Chinese and English. No sign-up or login; your invoice data stays in your browser.

> **Disclaimer**: This is an independent helper tool, not an official service of Taiwan's Ministry of Finance. It does not handle prize redemption, carrier linking, bank-account setup or cloud-invoice retrieval. Results are plain number comparisons; always rely on official announcements and the redemption authority to confirm whether an invoice wins and can be claimed.

## Features

- Add / edit / delete invoices (deletion needs confirmation), batch input (`AB12345678` or `date,number,amount,note`), filter / search / sort by period, duplicate protection within a period
- Camera scanning: open the camera on a phone or computer and scan the QR code on the left of an e-invoice (number, date and amount are filled in automatically) or the Code 39 barcode at the top (number only); review the list, then add everything at once
- Prize check: Special, Grand, First, and Second–Sixth prizes; quick single-number check and batch check of recorded invoices; only the single highest prize is counted per invoice
- Overview: invoices this period, winning count, estimated winnings, claim-deadline reminders (claimable vs. expired are totalled separately)
- Draw history: browse by year, with source status, claim window and fetch time
- Backup: full JSON export / import (previewed and validated first, committed in one step; a failure never touches existing data), CSV export
- Winning-number data: paste the official page HTML to parse it, import JSON, or enter numbers manually
- Interface language switch: Traditional Chinese / English (available in the desktop sidebar and the mobile header; the choice is stored locally and survives reloads)
- Bottom navigation on mobile / sidebar on desktop, offline notice, `prefers-reduced-motion`

## Architecture

React 19 + TypeScript, Vite, Tailwind CSS 3, Zustand, Zod, lucide-react; tests with Vitest + Testing Library and Playwright.

```
src/
├─ domain/          # UI-independent pure logic
│  ├─ models/       # types, Zod schemas, language-neutral message codes (Msg)
│  ├─ period/       # period math (ROC years, year boundaries, leap years)
│  └─ prize-engine/ # the single prize-matching implementation (data-driven rules)
├─ services/
│  ├─ prize-data/   # bundled official snapshot, official-page HTML parser
│  ├─ import-export/# CSV, batch input, backup JSON validation and preview
│  └─ storage/      # localStorage (versioned, corruption recovery)
├─ i18n/            # translation core, language state, React hooks, zh-TW / en dictionaries
├─ stores/          # Zustand store and hooks
├─ features/        # the five pages (invoices and settings are split into focused components)
├─ components/      # shared UI components
├─ lib/             # framework-agnostic helpers (download, file reading)
└─ app/             # page navigation types
e2e/                # Playwright core flows
```

Design notes: invoice numbers are handled as strings throughout (leading zeros preserved); prizes, amounts, periods and claim dates all come from data (`PrizePeriod.tiers` can override the default rules); the UI never matches numbers itself. `domain` and `services` return message codes (`Msg`) instead of text, and the UI translates them into the current language, so the core logic does not depend on any locale.

## Run locally

Requires Node.js 20+.

```bash
npm install
npm run dev        # development server
npm run build      # produce dist/
npm run preview    # preview the production build
```

## Scanning invoices with the camera

On the Invoices page, press "Scan invoice". Supported:

- **Left QR code**: parses the invoice number, issue date (ROC → Gregorian), period and total amount.
- **Top Code 39 barcode**: contains only year-month and the number, so the date is set to the 1st of that month (still inside the same period) and the amount is unknown.
- The right-hand QR code (starting with `**`) and anything else are ignored with a hint.

Notes:

- Browsers only allow camera access on **HTTPS or localhost**, and the camera permission must be granted on first use; if it is denied, an explanation and a retry button are shown. Phones use the rear camera by default.
- Video is processed only on your device and is never uploaded; closing the dialog releases the camera.
- Scanned invoices are listed first and added only after you confirm; the same number in the same period is never overwritten and is reported as skipped.
- The QR code on receipts is dense: hold the phone close, keep it in focus and well lit.
- Decoding uses `@zxing/browser`, split into a separate chunk and loaded dynamically, so it is only downloaded when you press Scan.
- Layering: `domain/invoice-scan` (pure parser), `services/scanner` (scanner interface and zxing implementation), `features/invoices/ScanDialog` (UI; a fake scanner can be injected for tests).

## Internationalization (i18n)

- Dictionaries live in `src/i18n/messages/`. `zh-TW.ts` is the source of keys; `en.ts` is typed to require exactly the same keys, so a missing translation fails `typecheck`, and a unit test also checks that `{placeholder}` parameters match.
- Components get a translate function from `useT()` and money / period / date formatting from `useFormat()`; components that use them re-render automatically when the language changes.
- To add a language: add its code to `Lang` and `LANGS` in `core.ts`, create a dictionary file, and register it in `messages/index.ts`.
- The default is Traditional Chinese. The chosen language is stored in `localStorage` (key: `invoice-lucky:lang`).

## Testing

```bash
npm run lint
npm run typecheck
npm test                          # unit / component tests (Vitest)
npx playwright install chromium   # first run only
npm run e2e                       # E2E (builds and starts the preview server automatically)
npx vitest run src/domain/prize-engine/engine.test.ts   # a single test file
```

## Deployment

A GitHub Actions workflow (`.github/workflows/deploy.yml`) is included: on every push to `master` / `main`, on manual dispatch and **on a daily schedule** it first syncs the official prize numbers, then runs lint, typecheck, tests and the build, and publishes to GitHub Pages. On first use, go to the repo's **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**. The site is served at `https://<user>.github.io/<repo>/`.

`vite.config.ts` uses `base: './'` and the app is a single page with no client-side routing, so the generated `dist/` can be served from any static host:

- **Cloudflare Pages / Vercel / Netlify**: build command `npm run build`, output directory `dist`.
- **GitHub Pages**: publish the contents of `dist/` to a Pages branch or upload `dist/` with Actions.

No environment variables are needed, so there is no `.env.example`.

## Local data and backups

- Data is stored in the browser's `localStorage` (key: `invoice-lucky:v1`; language preference: `invoice-lucky:lang`) and is **never uploaded to any server**. The project contains no API keys.
- Clearing browser data, private browsing or switching devices loses the data, so export a JSON backup from Settings regularly.
- If local data is corrupted, the original content is saved to `invoice-lucky:corrupt-backup`, the app starts empty and a warning is shown.
- Winning numbers inside a backup JSON are always treated as "User import", never as official data.

## Official number sources, sync limits and update flow

Official sources:

- MOF e-Invoice portal, winning numbers: <https://invoice.etax.nat.gov.tw/lastNumber.html>
- Cloud-invoice exclusive prizes: <https://invoice.etax.nat.gov.tw/cloudNowNumber.html>
- E-Invoice Platform: <https://www.einvoice.nat.gov.tw/>

**Tested findings (2026-11-08)**:

- The official pages load normally (HTTP 200, static HTML) but carry **no `Access-Control-Allow-Origin` header**, so **browsers cannot read them directly**. This project does not use any third-party CORS proxy or unverified API.
- The E-Invoice Platform open-data API (`openapi.json`, 28 endpoints) only offers **statistics** (issuance / donation counts, prize and redemption statistics, etc.) and **no winning numbers**; its API domain also answers browser requests from a website origin with 403 (no CORS headers), so it cannot be used to update the prize numbers.
- The solution is a **server-side schedule** that fetches the official page (below); the web app only reads a JSON file from its own site.
- Cloud-invoice exclusive prize numbers are published only as PDF lists (NT$500 / 800 / 2,000 / 1,000,000) with no machine-readable data, so they are **not bundled**.

**Automatic sync (default)**:

- `.github/workflows/deploy.yml` runs `npm run prizes:update` (`scripts/update-prizes.ts`) daily (10:17 Taiwan time): it fetches the official winning-numbers pages (latest period and the previous one), parses them with the same parser the app uses, and merges them into the existing `public/data/prize-periods.json` (older periods accumulate). It commits only when something changed and then redeploys automatically.
- On startup the app loads `data/prize-periods.json` from its own site (same origin, no CORS), validates it and merges it with the bundled snapshot and user imports; priority is **user import > auto-sync > bundled snapshot**. When a new period appears and you were on the previous latest one, the app follows to the new period.
- If syncing or parsing fails, the workflow only shows a warning and keeps the existing data (nothing guessed is written, and deployment is not blocked); if the page cannot load the file, Settings says so clearly and the bundled and manually imported data stay usable.
- You can also run `npm run prizes:update` locally.
- Note: GitHub disables scheduled workflows in repositories with no activity for 60 days; if updates stop, re-enable the workflow in the Actions tab or trigger it manually once.

**Manual update** (when the schedule has not caught up yet, or you want it sooner; Settings → "Winning-number data"):

1. Paste the official page HTML: on the official winning-numbers page, right-click to view the page source, select all, copy, paste and parse. The parser checks the period, that each prize number is 8 digits, and the claim window; if the structure changes it fails with a clear error and never falls back to old data.
2. Import JSON: see "Download example format" in Settings (the example numbers only illustrate the format). `tiers` can override the prize rules and `cloudPrizes` can supply cloud-exclusive prize data.
3. Enter the period's Special, Grand and First prize numbers and claim window manually.

Imported data is always labelled "User import"; please verify it against the official site. For a period without numbers, invoices show "No numbers yet, not checked", are **never judged as lost**, and numbers from other periods are never substituted.

## Cloud-invoice exclusive prizes

Cloud-exclusive prizes use a separate data model (`PrizePeriod.cloudPrizes`). They are only matched when the data exists **and** the user has marked the invoice as a "cloud invoice"; paper invoices are never eligible. When an invoice also wins a regular prize, only the highest amount counts. Because the official source is PDF-only, this version bundles no cloud prize numbers, and the UI states that no verifiable cloud-exclusive prize data is available.

## Known limitations and future directions

- Auto-sync depends on the official page structure; if it is redesigned and parsing fails, a warning is shown and numbers must be imported manually until the parser is updated. The schedule runs daily, so data can lag by about a day.
- Claim eligibility (buyer identity, whether an amount is stated, whether a cloud invoice was printed before the draw, etc.) is not evaluated, and income / stamp tax is not calculated.
- Draw dates are not provided (the official page does not state them, and none are guessed).
- Possible next steps: installable offline PWA, importing cloud-exclusive prize PDFs.
