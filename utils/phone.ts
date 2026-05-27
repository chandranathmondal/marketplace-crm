const DEFAULT_COUNTRY_CODE = '+91';
export const PHONE_INPUT_PLACEHOLDER = '10 digits (default +91) or +ISD code and no.';

export function sanitizePhoneInput(value: string) {
  const trimmed = value.trim();
  const hasCountryCode = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '').replace(/^0+/, '');
  const maxDigits = hasCountryCode ? 15 : 10;

  return `${hasCountryCode ? '+' : ''}${digits.slice(0, maxDigits)}`;
}

export function getWhatsAppUrl(value: string) {
  const sanitized = sanitizePhoneInput(value);

  if (!sanitized) {
    return '';
  }

  const digits = normalizePhoneNumber(sanitized).replace(/\D/g, '');

  return digits ? `whatsapp://send?phone=${digits}` : '';
}

export function formatPhoneForForm(value: string) {
  const normalized = normalizePhoneNumber(value);

  if (/^\+91[1-9]\d{9}$/.test(normalized)) {
    return normalized.slice(3);
  }

  return normalized;
}

export function canOpenWhatsApp(value: string) {
  const sanitized = sanitizePhoneInput(value);

  if (!sanitized) {
    return false;
  }

  if (!sanitized.startsWith('+')) {
    return /^\d{10}$/.test(sanitized);
  }

  const digits = sanitized.slice(1);

  if (digits.startsWith('91')) {
    return digits.length === 12;
  }

  return /^[1-9]\d{8,14}$/.test(digits);
}

export function normalizePhoneNumber(value: string, defaultCode = DEFAULT_COUNTRY_CODE) {
  const trimmed = value.trim();

  if (!trimmed) {
    return '';
  }

  if (trimmed.startsWith('+')) {
    return `+${trimmed.slice(1).replace(/\D/g, '')}`;
  }

  const digits = trimmed.replace(/\D/g, '');

  if (digits.length === 10) {
    return `${defaultCode}${digits}`;
  }

  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }

  if (digits.length > 10) {
    return `+${digits}`;
  }

  return `${defaultCode}${digits}`;
}

export function isValidPhoneNumber(value: string): boolean {
  const trimmed = value.trim();

  if (!trimmed) {
    return false;
  }

  if (trimmed.startsWith('+')) {
    return /^\+[1-9]\d{1,14}$/.test(trimmed);
  }

  return /^[1-9]\d{9}$/.test(trimmed);
}

export function phonesMatch(left: string, right: string) {
  const a = normalizePhoneNumber(left);
  const b = normalizePhoneNumber(right);

  return Boolean(a && b && a === b);
}
