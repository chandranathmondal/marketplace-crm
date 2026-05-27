import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canOpenWhatsApp,
  formatPhoneForForm,
  getWhatsAppUrl,
  isValidPhoneNumber,
  normalizePhoneNumber,
  phonesMatch,
  sanitizePhoneInput,
} from '../utils/phone.ts';

test('normalizes 10-digit Indian numbers with +91', () => {
  assert.equal(normalizePhoneNumber('9876543210'), '+919876543210');
});

test('preserves explicit country codes', () => {
  assert.equal(normalizePhoneNumber('+44 7911 123456'), '+447911123456');
});

test('matches normalized phone numbers', () => {
  assert.equal(phonesMatch('9876543210', '+919876543210'), true);
});

test('sanitizes phone input while typing', () => {
  assert.equal(sanitizePhoneInput('09876abc543210'), '9876543210');
  assert.equal(sanitizePhoneInput('++91 98765 43210 9999'), '+919876543210999');
  assert.equal(sanitizePhoneInput('+0+91 98765 43210'), '+919876543210');
});

test('validates local and international phone limits', () => {
  assert.equal(isValidPhoneNumber('9876543210'), true);
  assert.equal(isValidPhoneNumber('0876543210'), false);
  assert.equal(isValidPhoneNumber('98765432101'), false);
  assert.equal(isValidPhoneNumber('+919876543210'), true);
  assert.equal(isValidPhoneNumber('+0919876543210'), false);
  assert.equal(isValidPhoneNumber('+123456789012345'), true);
  assert.equal(isValidPhoneNumber('+1234567890123456'), false);
});

test('builds WhatsApp app URLs from local and international numbers', () => {
  assert.equal(getWhatsAppUrl('9876543210'), 'whatsapp://send?phone=919876543210');
  assert.equal(getWhatsAppUrl('+44 7911 123456'), 'whatsapp://send?phone=447911123456');
  assert.equal(getWhatsAppUrl(''), '');
});

test('formats stored phone numbers for editing forms', () => {
  assert.equal(formatPhoneForForm('+919876543210'), '9876543210');
  assert.equal(formatPhoneForForm('+447911123456'), '+447911123456');
  assert.equal(formatPhoneForForm('9876543210'), '9876543210');
});

test('controls WhatsApp button visibility from minimum digit rules', () => {
  assert.equal(canOpenWhatsApp('987654321'), false);
  assert.equal(canOpenWhatsApp('9876543210'), true);
  assert.equal(canOpenWhatsApp('+91987654321'), false);
  assert.equal(canOpenWhatsApp('+919876543210'), true);
  assert.equal(canOpenWhatsApp('+44791112'), false);
  assert.equal(canOpenWhatsApp('+447911123'), true);
});
