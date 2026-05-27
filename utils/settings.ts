export type ExtensionSettings = {
  apiUrl: string;
  spreadsheetId: string;
};

export const SETTINGS_STORAGE_KEY = 'marketplaceCrmSettings';

export const DEFAULT_SETTINGS: ExtensionSettings = {
  apiUrl: '',
  spreadsheetId: '',
};

/** Must match MARKETPLACE_CRM_API_VERSION in apps-scriptapps-script/Code.gs */
export const EXPECTED_APPS_SCRIPT_API_VERSION = 3;

export async function getSettings(): Promise<ExtensionSettings> {
  const result = await browser.storage.local.get(SETTINGS_STORAGE_KEY);
  const settings = result[SETTINGS_STORAGE_KEY] as Partial<ExtensionSettings> | undefined;

  return {
    ...DEFAULT_SETTINGS,
    ...settings,
  };
}

export async function saveSettings(settings: ExtensionSettings) {
  await browser.storage.local.set({
    [SETTINGS_STORAGE_KEY]: {
      apiUrl: normalizeAppsScriptUrl(settings.apiUrl),
      spreadsheetId: normalizeSpreadsheetId(settings.spreadsheetId),
    },
  });
}

export function normalizeSpreadsheetId(value: string) {
  const trimmed = value.trim();
  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);

  if (urlMatch) {
    return urlMatch[1];
  }

  const idMatch = trimmed.match(/([a-zA-Z0-9-_]{20,})/);

  return idMatch ? idMatch[1] : trimmed;
}

export function formatAppsScriptError(error: string, apiVersion?: number) {
  if (apiVersion === EXPECTED_APPS_SCRIPT_API_VERSION) {
    return error;
  }

  const isLegacyNullSpreadsheetError =
    /Cannot read properties of null \(reading 'getSheetByName'\)/.test(error) ||
    (error.includes('getActiveSpreadsheet') && error.includes('getSheetByName'));

  if (isLegacyNullSpreadsheetError) {
    return (
      'The deployed Apps Script is outdated (it still uses getActiveSpreadsheet). ' +
      'Replace all code in Apps Script with apps-scriptapps-script/Code.gs, deploy a new version, ' +
      'then confirm Test Connection reports API v3. ' +
      `Server error: ${error}`
    );
  }

  return error;
}

export function isValidSpreadsheetId(value: string) {
  const id = normalizeSpreadsheetId(value);
  return /^[a-zA-Z0-9-_]{20,}$/.test(id);
}

export function normalizeAppsScriptUrl(value: string) {
  const url = new URL(value.trim());
  url.search = '';
  url.hash = '';
  return url.toString();
}

export function isValidAppsScriptUrl(value: string) {
  try {
    const url = new URL(value.trim());

    return (
      url.protocol === 'https:' &&
      url.hostname === 'script.google.com' &&
      url.pathname.startsWith('/macros/s/') &&
      url.pathname.endsWith('/exec')
    );
  } catch {
    return false;
  }
}

export async function testAppsScriptConnection(apiUrl: string, spreadsheetId: string) {
  const response = await fetch(normalizeAppsScriptUrl(apiUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify({
      action: 'ping',
      spreadsheet_id: normalizeSpreadsheetId(spreadsheetId),
    }),
  });

  const data = await parseAppsScriptResponse(response);

  if (!response.ok || !data.success) {
    throw new Error(
      formatAppsScriptError(
        data.error || `Connection failed with HTTP ${response.status}`,
        data.apiVersion,
      ),
    );
  }

  if (data.apiVersion !== EXPECTED_APPS_SCRIPT_API_VERSION) {
    throw new Error(
      `Apps Script API v${data.apiVersion ?? '?'} is deployed; v${EXPECTED_APPS_SCRIPT_API_VERSION} is required. ` +
        'Paste the latest Code.gs, deploy → Manage deployments → Edit → New version → Deploy.',
    );
  }

  return data as {
    success: true;
    apiVersion: number;
    spreadsheet?: string;
    message?: string;
  };
}

export async function parseAppsScriptResponse(response: Response) {
  const text = await response.text();
  const trimmedText = text.trim();

  if (trimmedText.startsWith('<!DOCTYPE') || trimmedText.startsWith('<html')) {
    const lowerHtml = trimmedText.toLowerCase();

    if (lowerHtml.includes('accounts.google.com') || lowerHtml.includes('sign in')) {
      throw new Error(
        'Google returned a sign-in page. Deploy the web app with access "Anyone" (not "Anyone with Google account"), then open the /exec URL once in Chrome while logged in as the deployer to authorize the script.',
      );
    }

    if (lowerHtml.includes('page not found') || lowerHtml.includes('unable to open the file')) {
      throw new Error(
        'The deployment URL was not found. Copy the Web app URL from Deploy → Manage deployments (must end in /exec, not /dev).',
      );
    }

    throw new Error(
      'The Apps Script URL returned an HTML page instead of JSON. Use the /exec URL from Deploy → Manage deployments, set access to "Anyone", redeploy the latest version, then open that URL once in your browser to authorize the script.',
    );
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`The Apps Script response was not valid JSON: ${text.slice(0, 120)}`);
  }
}
