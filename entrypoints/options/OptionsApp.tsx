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
  const [whatsappMode, setWhatsappMode] = useState<'web' | 'desktop'>('web');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getSettings().then((settings) => {
      setApiUrl(settings.apiUrl);
      setSpreadsheetId(settings.spreadsheetId);
      setWhatsappMode(settings.whatsappMode);
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
      whatsappMode,
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

      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
        <span>WhatsApp Integration</span>
        <div style={{ display: 'flex', alignItems: 'center', background: '#e5e7eb', borderRadius: '20px', padding: '2px', gap: '2px' }}>
          <button
            type="button"
            onClick={() => setWhatsappMode('web')}
            style={{
              padding: '8px 16px',
              borderRadius: '16px',
              border: 'none',
              background: whatsappMode === 'web' ? '#25d366' : 'transparent',
              color: whatsappMode === 'web' ? '#fff' : '#6b7280',
              fontWeight: whatsappMode === 'web' ? '600' : '500',
              cursor: 'pointer',
              fontSize: '12px',
              transition: 'all 0.2s ease',
            }}
          >
            Web
          </button>
          <button
            type="button"
            onClick={() => setWhatsappMode('desktop')}
            style={{
              padding: '8px 16px',
              borderRadius: '16px',
              border: 'none',
              background: whatsappMode === 'desktop' ? '#25d366' : 'transparent',
              color: whatsappMode === 'desktop' ? '#fff' : '#6b7280',
              fontWeight: whatsappMode === 'desktop' ? '600' : '500',
              cursor: 'pointer',
              fontSize: '12px',
              transition: 'all 0.2s ease',
            }}
          >
            Desktop
          </button>
        </div>
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
