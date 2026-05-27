import { useEffect, useState } from 'react';
import {
  getSettings,
  isValidAppsScriptUrl,
  isValidSpreadsheetId,
  normalizeAppsScriptUrl,
  saveSettings,
  testAppsScriptConnection,
} from '../../utils/settings';

export default function OptionsApp() {
  const [apiUrl, setApiUrl] = useState('');
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getSettings().then((settings) => {
      setApiUrl(settings.apiUrl);
      setSpreadsheetId(settings.spreadsheetId);
    });
  }, []);

  async function save() {
    setStatus('');
    setError('');

    if (!isValidAppsScriptUrl(apiUrl)) {
      setError('Enter a valid Google Apps Script web app URL ending in /exec.');
      return;
    }

    if (!isValidSpreadsheetId(spreadsheetId)) {
      setError(
        'Enter a valid Google Sheet ID (from the URL between /d/ and /edit), not the Apps Script URL.',
      );
      return;
    }

    await saveSettings({
      apiUrl: normalizeAppsScriptUrl(apiUrl),
      spreadsheetId,
    });

    setStatus('Settings saved');

    window.setTimeout(() => {
      window.close();
    }, 500);
  }

  async function testConnection() {
    setStatus('');
    setError('');

    if (!isValidAppsScriptUrl(apiUrl)) {
      setError('Enter a valid Google Apps Script web app URL ending in /exec.');
      return;
    }

    if (!isValidSpreadsheetId(spreadsheetId)) {
      setError(
        'Enter a valid Google Sheet ID (from the URL between /d/ and /edit), not the Apps Script URL.',
      );
      return;
    }

    try {
      const data = await testAppsScriptConnection(apiUrl, spreadsheetId);
      setStatus(
        `Connected to ${data.spreadsheet || 'Apps Script backend'} (API v${data.apiVersion})`,
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Connection failed');
    }
  }

  return (
    <main>
      <label>
        Apps Script web app URL
        <input
          placeholder="https://script.google.com/macros/s/.../exec"
          value={apiUrl}
          onChange={(event) => setApiUrl(event.target.value)}
        />
      </label>

      <label>
        Google Sheet ID
        <input
          placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
          value={spreadsheetId}
          onChange={(event) => setSpreadsheetId(event.target.value)}
        />
      </label>

      <div className="actions">
        <button type="button" onClick={save}>
          Save
        </button>
        <button type="button" onClick={testConnection}>
          Test Connection
        </button>
      </div>

      {status && <p className="status">{status}</p>}
      {error && <p className="error">{error}</p>}
    </main>
  );
}
