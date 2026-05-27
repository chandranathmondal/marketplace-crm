import { test, expect, chromium } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const extensionPath = path.resolve('.output/chrome-mv3');
const listingUrl = 'https://www.olx.in/item/test-listing-iid-12345';
const listingHtml = `
  <!doctype html>
  <html>
    <head>
      <meta charset="UTF-8">
      <title>OLX test listing</title>
    </head>
    <body>
      <main>
        <h1>2BHK apartment near metro</h1>
        <p>Posted today</p>
        <p>Rs fallback should not win</p>
        <p>₹ 45,00,000</p>
      </main>
    </body>
  </html>
`;

test.describe('Marketplace CRM extension', () => {
  test.skip(!fs.existsSync(extensionPath), `Build the extension first with: npm run build`);

  test('captures a listing from the page badge, shows it in popup, and saves it', async () => {
    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'marketplace-crm-e2e-'));

    const context = await chromium.launchPersistentContext(userDataDir, {
      channel: 'chromium',
      headless: true,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });

    try {
      await context.route(listingUrl, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'text/html; charset=utf-8',
          body: listingHtml,
        });
      });

      const saveRequests = [];
      await context.route('https://script.google.com/**', async (route, request) => {
        saveRequests.push(JSON.parse(request.postData() ?? '{}'));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      });

      const listingPage = await context.newPage();
      await listingPage.goto(listingUrl);

      const badge = listingPage.locator('#marketplace-crm-badge');
      await expect(badge).toHaveText('CRM');

      const extensionId = await getExtensionId(context);
      await setExtensionSettings(context, {
        apiUrl: 'https://script.google.com/macros/s/test-deployment/exec',
        spreadsheetId: 'test-spreadsheet-id',
      });
      await badge.click();

      const popup = await getPopupPage(context, extensionId);

      await expect(popup.getByText('Marketplace CRM')).toBeVisible();
      await expect(popup.getByText('olx')).toBeVisible();
      await expect(popup.getByText('2BHK apartment near metro')).toBeVisible();
      await expect(popup.getByText('₹ 45,00,000')).toBeVisible();

      await popup.getByPlaceholder('Seller Name').fill('Asha Seller');
      await popup.getByPlaceholder('10 digits (default +91) or +ISD code and no.').fill('9876543210');
      await popup.getByPlaceholder('Notes').fill('Interested, call tomorrow');
      await popup.locator('input[type="date"]').fill('2026-05-18');

      popup.once('dialog', async (dialog) => {
        expect(dialog.message()).toBe('Saved successfully');
        await dialog.accept();
      });
      await popup.getByRole('button', { name: 'Save' }).click();

      await expect.poll(() => saveRequests.length).toBe(1);
      expect(saveRequests[0]).toMatchObject({
        platform: 'olx',
        listing_id: '/item/test-listing-iid-12345',
        url: listingUrl,
        title: '2BHK apartment near metro',
        price: '₹ 45,00,000',
        name: 'Asha Seller',
        phone: '+919876543210',
        notes: 'Interested, call tomorrow',
        followup_date: '2026-05-18',
        spreadsheet_id: 'test-spreadsheet-id',
      });
    } finally {
      await context.close();
      fs.rmSync(userDataDir, { recursive: true, force: true });
    }
  });
});

async function getExtensionId(context) {
  let [serviceWorker] = context.serviceWorkers();

  if (!serviceWorker) {
    serviceWorker = await context.waitForEvent('serviceworker');
  }

  return serviceWorker.url().split('/')[2];
}

async function setExtensionSettings(context, settings) {
  let [serviceWorker] = context.serviceWorkers();

  if (!serviceWorker) {
    serviceWorker = await context.waitForEvent('serviceworker');
  }

  await serviceWorker.evaluate((value) => {
    return chrome.storage.local.set({
      marketplaceCrmSettings: value,
    });
  }, settings);
}

async function getPopupPage(context, extensionId) {
  const popupUrl = `chrome-extension://${extensionId}/popup.html`;
  const existingPopup = context.pages().find((page) => page.url() === popupUrl);

  if (existingPopup) {
    return existingPopup;
  }

  const popup = await context.newPage();
  await popup.goto(popupUrl);
  return popup;
}
