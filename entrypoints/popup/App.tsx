import { useEffect, useMemo, useState } from 'react';
import type { ListingRecord, ListingStatus } from '../../types/listing';
import { LISTING_STATUSES } from '../../types/listing';
import {
  formatAppsScriptError,
  getSettings,
  isValidAppsScriptUrl,
  isValidSpreadsheetId,
  normalizeAppsScriptUrl,
  normalizeSpreadsheetId,
  parseAppsScriptResponse,
} from '../../utils/settings';
import { getAllListings, getListingsByPhone, upsertListingRecord } from '../../utils/listing-store';
import {
  PHONE_INPUT_PLACEHOLDER,
  canOpenWhatsApp,
  formatPhoneForForm,
  getWhatsAppUrl,
  normalizePhoneNumber,
  sanitizePhoneInput,
} from '../../utils/phone';
import { STATUS_CONFIG } from '../../utils/status';
import './App.css';

function GearIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.75.75 0 0 0 .18-.96l-1.92-3.32a.75.75 0 0 0-.9-.33l-2.39.96a7.07 7.07 0 0 0-1.63-.94l-.36-2.54A.75.75 0 0 0 14 2h-4a.75.75 0 0 0-.74.64l-.36 2.54c-.6.24-1.16.56-1.63.94l-2.39-.96a.75.75 0 0 0-.9.33L2.06 8.97a.75.75 0 0 0 .18.96l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.75.75 0 0 0-.18.96l1.92 3.32c.2.35.64.48.99.33l2.39-.96c.47.38 1.03.7 1.63.94l.36 2.54A.75.75 0 0 0 10 22h4c.37 0 .69-.27.74-.64l.36-2.54c.6-.24 1.16-.56 1.63-.94l2.39.96c.35.14.79.02.99-.33l1.92-3.32a.75.75 0 0 0-.18-.96l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z"
      />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16.02 4C9.4 4 4.03 9.32 4.03 15.88c0 2.1.56 4.15 1.61 5.95L4 28l6.34-1.65a12.08 12.08 0 0 0 5.68 1.43C22.63 27.78 28 22.45 28 15.88S22.63 4 16.02 4Zm0 21.78c-1.83 0-3.62-.49-5.18-1.42l-.37-.22-3.76.98 1-3.65-.24-.38a9.8 9.8 0 0 1-1.5-5.21c0-5.46 4.5-9.9 10.04-9.9 5.53 0 10.03 4.44 10.03 9.9s-4.5 9.9-10.03 9.9Zm5.5-7.42c-.3-.15-1.78-.87-2.06-.97-.28-.1-.48-.15-.68.15-.2.3-.78.97-.96 1.17-.18.2-.35.22-.65.07-.3-.15-1.27-.46-2.42-1.48-.9-.79-1.5-1.77-1.67-2.07-.18-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.68-1.62-.93-2.22-.24-.58-.5-.5-.68-.51h-.58c-.2 0-.52.07-.8.37-.28.3-1.05 1.02-1.05 2.5s1.08 2.9 1.23 3.1c.15.2 2.13 3.23 5.17 4.52.72.31 1.28.5 1.72.64.72.23 1.38.2 1.9.12.58-.08 1.78-.72 2.03-1.42.25-.7.25-1.3.18-1.42-.08-.13-.28-.2-.58-.35Z"
      />
    </svg>
  );
}

function getFormListing(record: ListingRecord): ListingRecord {
  return {
    ...record,
    phone: formatPhoneForForm(record.phone),
    related_keys: record.related_keys ?? [],
  };
}

export default function App() {
  const [listings, setListings] = useState<ListingRecord[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ListingStatus | 'all'>('all');
  const [draft, setDraft] = useState<ListingRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [sellerCount, setSellerCount] = useState(0);

  useEffect(() => {
    void loadListings();
    void getSettings().then((settings) => {
      setApiUrl(settings.apiUrl);
      setSpreadsheetId(settings.spreadsheetId);
    });

    const handleStorageChange = () => {
      void loadListings();
    };

    browser.storage.onChanged.addListener(handleStorageChange);

    return () => {
      browser.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  async function loadListings() {
    const records = await getAllListings();
    setListings(records);

    if (selectedKey) {
      const selected = records.find(
        (record) => `${record.platform}:${record.listing_id}` === selectedKey,
      );
      setDraft(selected ? getFormListing(selected) : null);
    }
  }

  const filteredListings = useMemo(() => {
    if (statusFilter === 'all') {
      return listings;
    }

    return listings.filter((listing) => listing.status === statusFilter);
  }, [listings, statusFilter]);

  function openListing(record: ListingRecord) {
    const key = `${record.platform}:${record.listing_id}`;
    setSelectedKey(key);
    setDraft(getFormListing(record));
    setMessage('');
    setError('');
  }

  useEffect(() => {
    if (!draft?.phone) {
      setSellerCount(0);
      return;
    }

    void getListingsByPhone(draft.phone).then((items) => {
      const count = items.filter(
        (item) =>
          `${item.platform}:${item.listing_id}` !== `${draft.platform}:${draft.listing_id}`,
      ).length;
      setSellerCount(count);
    });
  }, [draft?.phone, draft?.platform, draft?.listing_id]);

  async function saveDraft() {
    if (!draft) {
      return;
    }

    if (!isValidAppsScriptUrl(apiUrl) || !isValidSpreadsheetId(spreadsheetId)) {
      setError('Configure Apps Script URL and Google Sheet ID in Settings first.');
      return;
    }

    setIsSaving(true);
    setError('');
    setMessage('');

    try {
      const saved = await upsertListingRecord(draft, {
        ...draft,
        phone: draft.phone ? normalizePhoneNumber(draft.phone) : '',
        related_keys: draft.related_keys ?? [],
      });

      const response = await fetch(normalizeAppsScriptUrl(apiUrl), {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          ...saved,
          tags: saved.status,
          spreadsheet_id: normalizeSpreadsheetId(spreadsheetId),
        }),
      });

      const data = await parseAppsScriptResponse(response);

      if (!response.ok || !data.success) {
        throw new Error(
          formatAppsScriptError(
            data.error || `Save failed with HTTP ${response.status}`,
            data.apiVersion,
          ),
        );
      }

      setMessage('Saved successfully');
      await loadListings();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  }

  async function openSettings() {
    await browser.runtime.sendMessage({
      type: 'marketplace-crm:open-options',
    });
  }

  function openWhatsApp(phone: string) {
    const whatsappUrl = getWhatsAppUrl(phone);

    if (whatsappUrl) {
      window.open(whatsappUrl, '_blank');
    }
  }

  return (
    <div className="popup">
      <header className="popup__header">
        <div>
          <h2>Marketplace CRM</h2>
          <p>{listings.length} saved listing{listings.length === 1 ? '' : 's'} across marketplaces</p>
        </div>
        <button type="button" className="icon-button" onClick={openSettings} aria-label="Settings">
          <GearIcon />
        </button>
      </header>

      {!draft ? (
        <>
          <div className="popup__filters">
            <button
              type="button"
              className={`filter-pill ${statusFilter === 'all' ? 'is-active' : ''}`}
              style={{
                ['--pill-bg' as string]: '#f3f4f6',
                ['--pill-color' as string]: '#374151',
                ['--pill-border' as string]: '#d1d5db',
                ['--pill-color-dark' as string]: '#374151',
              }}
              onClick={() => setStatusFilter('all')}
            >
              All
            </button>
            {LISTING_STATUSES.map((status) => (
              <button
                key={status}
                type="button"
                className={`filter-pill ${statusFilter === status ? 'is-active' : ''}`}
                style={{
                  ['--pill-bg' as string]: STATUS_CONFIG[status].background,
                  ['--pill-color' as string]: STATUS_CONFIG[status].color,
                  ['--pill-border' as string]: STATUS_CONFIG[status].border,
                  ['--pill-color-dark' as string]: STATUS_CONFIG[status].colorDark,
                }}
                onClick={() => setStatusFilter(status)}
              >
                {STATUS_CONFIG[status].label}
              </button>
            ))}
          </div>

          {filteredListings.length === 0 ? (
            <p className="popup__empty">
              No listings saved yet. Browse OLX, MagicBricks, or 99acres and use the colored CRM
              badge on listing images to capture properties. Your Google Sheet remains the full
              export; this popup shows everything saved in the extension.
            </p>
          ) : (
            <div className="popup__list">
              {filteredListings.map((listing) => {
                const status = STATUS_CONFIG[listing.status];

                return (
                  <button
                    key={`${listing.platform}:${listing.listing_id}`}
                    type="button"
                    className="listing-card"
                    onClick={() => openListing(listing)}
                  >
                    <div className="listing-card__top">
                      <span>{listing.platform}</span>
                      <span
                        className="status-chip"
                        style={{
                          ['--chip-bg' as string]: status.background,
                          ['--chip-color' as string]: status.color,
                          ['--chip-border' as string]: status.border,
                        }}
                      >
                        {status.label}
                      </span>
                    </div>
                    <h3>{listing.title}</h3>
                    <p>{listing.price || 'Price not listed'}</p>
                  </button>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <section className="popup__editor">
          <h3>Edit listing</h3>
          <label className="popup__field">
            <span>Status</span>
            <select
              value={draft.status}
              onChange={(event) =>
                setDraft({ ...draft, status: event.target.value as ListingStatus })
              }
            >
              {LISTING_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_CONFIG[status].label}
                </option>
              ))}
            </select>
          </label>
          <label className="popup__field">
            <span>Seller name</span>
            <input
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            />
          </label>
          <label className="popup__field">
            <span>Phone number</span>
            <div className="popup__phone-row">
              <input
                value={draft.phone}
                placeholder={PHONE_INPUT_PLACEHOLDER}
                onChange={(event) =>
                  setDraft({ ...draft, phone: sanitizePhoneInput(event.target.value) })
                }
                onBlur={(event) =>
                  setDraft({
                    ...draft,
                    phone: event.target.value
                      ? formatPhoneForForm(sanitizePhoneInput(event.target.value))
                      : '',
                  })
                }
              />
              {canOpenWhatsApp(draft.phone) ? (
                <button
                  type="button"
                  className="popup__whatsapp-button"
                  aria-label="Open WhatsApp"
                  title="Open WhatsApp"
                  onClick={() => openWhatsApp(draft.phone)}
                >
                  <WhatsAppIcon />
                </button>
              ) : null}
            </div>
          </label>
          {draft.phone ? (
            <p className="popup__hint">
              {sellerCount} other listing{sellerCount === 1 ? '' : 's'} for this seller in CRM
            </p>
          ) : null}
          <label className="popup__field">
            <span>Notes</span>
            <textarea
              value={draft.notes}
              onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
            />
          </label>
          <label className="popup__field">
            <span>Follow-up date</span>
            <input
              type="date"
              value={draft.followup_date}
              onChange={(event) => setDraft({ ...draft, followup_date: event.target.value })}
            />
          </label>
          <div className="popup__actions">
            <button
              type="button"
              className="popup__button popup__button--primary"
              onClick={saveDraft}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              className="popup__button popup__button--secondary"
              onClick={() => {
                setDraft(null);
                setSelectedKey(null);
              }}
            >
              Back
            </button>
          </div>
          {message && <p className="popup__message popup__message--success">{message}</p>}
          {error && <p className="popup__message popup__message--error">{error}</p>}
        </section>
      )}
    </div>
  );
}
