# Marketplace CRM

A Chrome extension that captures property listings from Indian marketplace sites and saves seller contact details to a Google Sheet via Google Apps Script.

**Supported sites:** OLX (`olx.in`), MagicBricks, 99acres

## How it works

1. Open a listing page on a supported site.
2. Click the floating **CRM** badge on the page to scrape listing data into extension storage.
3. Open the extension popup, fill in seller name, phone, notes, and follow-up date.
4. Click **Save** to append rows to your Google Sheet (Contacts, Listings, and Interactions tabs).

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- Google Chrome (or Chromium)
- A Google account with access to Google Sheets and Apps Script

## 1. Set up Google Sheets

Create a new spreadsheet. The Apps Script will automatically create the required tabs and header rows the first time you test the connection or save a listing.

The generated tabs are:

| Sheet name     | Purpose                          |
|----------------|----------------------------------|
| `Contacts`     | Seller contact and follow-up info |
| `Listings`     | Scraped listing metadata         |
| `Interactions` | Notes tied to a listing/contact  |

Generated header rows:

**Contacts**

| phone | name | notes | followup_date | tags | timestamp |
|-------|------|-------|---------------|------|-----------|

**Listings**

| id | platform | listing_id | url | title | price | phone | timestamp |
|----|----------|------------|-----|-------|-------|-------|-----------|

**Interactions**

| id | phone | listing_id | notes | timestamp |
|----|-------|------------|-------|-----------|

## 2. Deploy Google Apps Script

Each extension user should deploy their own Apps Script web app from their own Google account. That keeps saves going to their own Google Sheet and avoids sharing one person’s backend URL or Drive permissions.

1. In your spreadsheet, go to **Extensions → Apps Script**.
2. Replace the default code with the contents of [`apps-scriptapps-script/Code.gs`](apps-scriptapps-script/Code.gs).
3. In Apps Script, open **Project Settings → Script properties**.
4. Optionally add a property named `MARKETPLACE_CRM_SPREADSHEET_ID`.
5. Set its value to your Google Sheet ID. The Sheet ID is the long value in the URL between `/d/` and `/edit`. This is optional because the extension also sends the configured Sheet ID with each save.
6. Click **Deploy → New deployment**.
7. Type: **Web app**
8. Execute as: **Me**
9. Who has access: **Anyone** (required for the extension to POST without OAuth)
10. Deploy and copy the **Web app URL** (ends with `/exec`).

After changing Apps Script code:

1. **Delete any other `.gs` files** in the Apps Script project (only one `Code.gs` should define `doPost`).
2. Paste the full contents of [`apps-scriptapps-script/Code.gs`](apps-scriptapps-script/Code.gs).
3. **Deploy → Manage deployments → Edit (pencil) → Version: New version → Deploy.**

The extension **Test Connection** must report **API v3**. If you still see `getSheetByName` errors, the old deployment is still live.

Optional editor check: set script property `MARKETPLACE_CRM_SPREADSHEET_ID` to your sheet ID, then run `runMarketplaceCrmSelfTest` from the Apps Script editor.

## 3. Configure the extension

### Extension settings

The settings page opens automatically the first time the extension is installed. You can also open the extension popup and click **Settings**, or open the extension details page in `chrome://extensions` and click **Extension options**.

Set:

| Setting | Value |
|---------|-------|
| Apps Script web app URL | Your deployed web app URL ending in `/exec` |
| Google Sheet ID | The long ID in your Google Sheet URL between `/d/` and `/edit` |

Click **Test Connection** to confirm the URL and Sheet ID point to a reachable backend, then click **Save**.

For another person to use the extension with their own Google Drive, they only need to:

1. Create their own Google Sheet with the required tabs.
2. Deploy their own copy of the Apps Script as a web app.
3. Paste their own web app URL and Sheet ID into extension Settings.

### Host permissions (required for Save)

In [`wxt.config.ts`](wxt.config.ts), add permission for Google Apps Script so the popup can POST data:

```ts
host_permissions: [
  '*://*.olx.in/*',
  '*://*.magicbricks.com/*',
  '*://*.99acres.com/*',
  'https://script.google.com/*',
],
```

### Content script matches (required for CRM badge)

In [`entrypoints/content.ts`](entrypoints/content.ts), the content script must run on marketplace URLs—not only `google.com`. Use a single `defineContentScript` with matches like:

```ts
matches: [
  '*://*.olx.in/*',
  '*://*.magicbricks.com/*',
  '*://*.99acres.com/*',
],
```

Move `injectBadge()` and related logic inside `main()` so the badge appears on listing pages.

## 4. Install and run locally

```bash
cd marketplace-crm
npm install
npm run dev
```

`npm run dev` starts the WXT dev server and watches for file changes. Reload the extension in Chrome when you change code.

### Load the extension in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `.output/chrome-mv3-dev` folder (created after `npm run dev`)

For a production build:

```bash
npm run build
```

Then load `.output/chrome-mv3` instead.

## 5. Automated tests

Run the fast unit tests:

```bash
npm test
```

Run the browser-based extension test:

```bash
npm install
npx playwright install chromium
npm run build
npm run test:e2e
```

The Playwright test launches Chromium in headless mode, loads `.output/chrome-mv3`, opens a mocked OLX listing page, clicks the floating **CRM** badge, opens the extension popup, fills the form, and verifies the Apps Script save payload without calling the real Google endpoint.

## 6. Daily usage

1. Navigate to a property **listing detail page** on OLX, MagicBricks, or 99acres.
2. Click the black **CRM** badge (top-right of the page).
3. The extension popup opens with the scraped listing details.
4. Review the scraped platform, title, and price.
5. Enter seller name, phone, notes, and follow-up date.
6. Click **Save**.

Each save appends one row to **Contacts**, **Listings**, and **Interactions** in your sheet.

## Project structure

```text
marketplace-crm/
├── adapters/              # Per-site DOM scraping (OLX, MagicBricks, 99acres)
├── apps-scriptapps-script/
│   └── Code.gs            # Google Apps Script backend (doPost / doGet)
├── entrypoints/
│   ├── content.ts         # Injects CRM badge, scrapes listing into storage
│   ├── background.ts      # Extension background service worker
│   └── popup/             # React popup UI (form + save to sheet)
├── wxt.config.ts          # Extension manifest and permissions
└── package.json
```

## Scripts

| Command            | Description                          |
|--------------------|--------------------------------------|
| `npm run dev`      | Dev build with hot reload            |
| `npm run build`    | Production build to `.output/chrome-mv3` |
| `npm run compile`  | TypeScript check (`tsc --noEmit`)    |
| `npm test`         | Fast unit tests for adapters and manifest permissions |
| `npm run test:e2e` | Headless Playwright test for the built extension |
| `npm run zip`      | Package extension as `.zip`          |

## Troubleshooting

| Problem | What to check |
|---------|----------------|
| CRM badge never appears | Content script `matches` in `content.ts` must include the marketplace domain. Reload the extension after changes. |
| Popup shows no listing | Click the **CRM** badge on the listing page before opening the popup. |
| Save asks for configuration | Open **Settings** from the popup and set the Apps Script web app URL plus Google Sheet ID. |
| Test Connection says HTML instead of JSON | Deploy with **Who has access: Anyone** (not “Anyone with Google account”). Use the `/exec` URL from **Deploy → Manage deployments**, not `/dev`. Open that `/exec` URL once in Chrome while logged in as the deployer to authorize the script. Redeploy after updating [`Code.gs`](apps-scriptapps-script/Code.gs), then reload the extension. |
| Save fails / network error | Confirm the configured Apps Script URL is correct. Host permissions must include both `https://script.google.com/*` and `https://script.googleusercontent.com/*`. |
| Apps Script returns header error | An existing tab has different headers than expected. Rename the tab or adjust its first row. Redeploy the web app after Apps Script changes. |
| Error says no spreadsheet found | Configure the Google Sheet ID in extension Settings, or set script property `MARKETPLACE_CRM_SPREADSHEET_ID`, then redeploy. |
| `getSheetByName` / spreadsheet is null | **Outdated Apps Script deployment.** Delete all code in the Apps Script editor, paste the full [`Code.gs`](apps-scriptapps-script/Code.gs), deploy a **new version**, then Test Connection must show **API v3**. Use the Sheet ID from `/d/THIS_PART/edit`, not the `/exec` URL. |
| Wrong or empty title/price | Adapters use generic selectors; update [`adapters/`](adapters/) for each site’s HTML. |

## Privacy and security

- Listing and contact data are sent only to **your** Google Apps Script deployment and spreadsheet.
- The web app is deployed with “Anyone” access so the extension can POST without Google sign-in. Do not share your deployment URL publicly if the script writes to a sensitive sheet.
- Configure your own Apps Script URL and Sheet ID in extension **Settings** before use.

## Tech stack

- [WXT](https://wxt.dev/) — browser extension framework
- [React](https://react.dev/) — popup UI
- Google Apps Script — serverless backend to Google Sheets
