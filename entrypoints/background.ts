import { getSettings, saveSettings } from '../utils/settings';

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(async (details) => {
    // Initialize settings from environment variables if not already set
    await initializeSettingsFromEnv();
    
    if (details.reason === 'install') {
      browser.runtime.openOptionsPage();
    }
  });

  browser.runtime.onMessage.addListener(async (message) => {
    if (message?.type === 'marketplace-crm:open-options') {
      await browser.runtime.openOptionsPage();
      return { opened: true };
    }

    return undefined;
  });
});

async function initializeSettingsFromEnv() {
  const currentSettings = await getSettings();
  
  // Only initialize if settings are empty
  if (!currentSettings.apiUrl && !currentSettings.spreadsheetId) {
    const envApiUrl = import.meta.env.VITE_MARKETPLACE_CRM_APPS_SCRIPT_URL;
    const envSpreadsheetId = import.meta.env.VITE_MARKETPLACE_CRM_SPREADSHEET_ID;
    
    if (envApiUrl || envSpreadsheetId) {
      await saveSettings({
        apiUrl: envApiUrl || '',
        spreadsheetId: envSpreadsheetId || '',
      });
    }
  }
}
