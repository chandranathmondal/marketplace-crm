import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EXPECTED_APPS_SCRIPT_API_VERSION,
  formatAppsScriptError,
  isValidAppsScriptUrl,
  isValidSpreadsheetId,
  normalizeAppsScriptUrl,
  normalizeSpreadsheetId,
  parseAppsScriptResponse,
} from '../utils/settings.ts';

test('accepts Apps Script web app exec URLs', () => {
  assert.equal(
    isValidAppsScriptUrl('https://script.google.com/macros/s/DEPLOYMENT_ID/exec'),
    true,
  );
});

test('extracts spreadsheet IDs from Google Sheets URLs', () => {
  assert.equal(
    normalizeSpreadsheetId(
      'https://docs.google.com/spreadsheets/d/abc123XYZ-_/edit#gid=0',
    ),
    'abc123XYZ-_',
  );
});

test('extracts spreadsheet IDs embedded in partial pasted values', () => {
  assert.equal(
    normalizeSpreadsheetId('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit'),
    '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
  );
});

test('accepts raw spreadsheet IDs', () => {
  assert.equal(isValidSpreadsheetId('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'), true);
});

test('rejects Apps Script deployment URLs as spreadsheet IDs', () => {
  assert.equal(
    isValidSpreadsheetId('https://script.google.com/macros/s/DEPLOYMENT_ID/exec'),
    false,
  );
});

test('strips query parameters from Apps Script URLs', () => {
  assert.equal(
    normalizeAppsScriptUrl(
      'https://script.google.com/macros/s/DEPLOYMENT_ID/exec?spreadsheet_id=abc',
    ),
    'https://script.google.com/macros/s/DEPLOYMENT_ID/exec',
  );
});

test('rejects non-Apps Script backend URLs', () => {
  assert.equal(isValidAppsScriptUrl('https://example.com/macros/s/DEPLOYMENT_ID/exec'), false);
  assert.equal(isValidAppsScriptUrl('http://script.google.com/macros/s/DEPLOYMENT_ID/exec'), false);
  assert.equal(isValidAppsScriptUrl('https://script.google.com/macros/s/DEPLOYMENT_ID/dev'), false);
});

test('parses JSON Apps Script responses', async () => {
  const response = new Response(JSON.stringify({ success: true }));

  assert.deepEqual(await parseAppsScriptResponse(response), { success: true });
});

test('shows the real server error when API v3 is deployed', () => {
  assert.equal(
    formatAppsScriptError('Could not open spreadsheet "abc"', EXPECTED_APPS_SCRIPT_API_VERSION),
    'Could not open spreadsheet "abc"',
  );
});

test('detects legacy getActiveSpreadsheet failures', () => {
  const message = formatAppsScriptError(
    "TypeError: Cannot read properties of null (reading 'getSheetByName')",
  );

  assert.match(message, /outdated/i);
  assert.match(message, /getActiveSpreadsheet/i);
});

test('returns a helpful error when Apps Script responds with HTML', async () => {
  const response = new Response('<!DOCTYPE html><html><body>Login</body></html>');

  await assert.rejects(
    () => parseAppsScriptResponse(response),
    /returned an HTML page instead of JSON/,
  );
});
