import assert from 'node:assert/strict';
import test from 'node:test';

import manifest from '../manifest.ts';

test('manifest has storage permissions required by the listing handoff flow', () => {
  assert.deepEqual(manifest.permissions, ['storage', 'activeTab']);
});

test('manifest grants supported marketplace and Apps Script hosts', () => {
  assert.deepEqual(manifest.host_permissions, [
    '*://*.olx.in/*',
    '*://*.magicbricks.com/*',
    '*://*.99acres.com/*',
    'https://script.google.com/*',
    'https://script.googleusercontent.com/*',
  ]);
});
