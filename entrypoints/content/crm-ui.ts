import type { ListingData, ListingMountTarget, ListingRecord, ListingStatus } from '../../types/listing';
import { LISTING_STATUSES } from '../../types/listing';
import { getListingKey } from '../../utils/listing-key';
import {
  getListingRecord,
  getListingsByPhone,
  getRelatedListings,
  linkRelatedListing,
  upsertListingRecord,
} from '../../utils/listing-store';
import { isSupportedMarketplaceUrl, parseListingUrl } from '../../utils/listing-url';
import {
  PHONE_INPUT_PLACEHOLDER,
  canOpenWhatsApp,
  formatPhoneForForm,
  getWhatsAppUrl,
  isValidPhoneNumber,
  normalizePhoneNumber,
  sanitizePhoneInput,
} from '../../utils/phone';
import {
  formatAppsScriptError,
  getSettings,
  isValidAppsScriptUrl,
  isValidSpreadsheetId,
  normalizeAppsScriptUrl,
  normalizeSpreadsheetId,
  parseAppsScriptResponse,
} from '../../utils/settings';
import { STATUS_CONFIG } from '../../utils/status';
import './crm.css';

const BADGE_SELECTOR = '.mcrm-badge';
const SLOT_SELECTOR = '.mcrm-inline-slot';
const MOUNT_ATTR = 'data-mcrm-key';
const OVERLAY_ID = 'marketplace-crm-overlay';

let activeOverlay: HTMLElement | null = null;

export function clearCrmUi() {
  document.querySelectorAll(BADGE_SELECTOR).forEach((node) => node.remove());
  document.querySelectorAll(SLOT_SELECTOR).forEach((node) => node.remove());
  document.querySelectorAll(`[${MOUNT_ATTR}]`).forEach((host) => {
    host.classList.remove('mcrm-badge-host');
    host.removeAttribute(MOUNT_ATTR);
  });
  closeModal();
}

export async function mountCrmButton(
  target: ListingMountTarget,
  onOpen: (record: ListingRecord) => void,
) {
  const hostKey = getListingKey(target.listing);

  if (document.querySelector(`[${MOUNT_ATTR}="${hostKey}"]`)) {
    return;
  }

  const existing = await getListingRecord(target.listing);
  const record = existing ?? {
    ...target.listing,
    status: 'new' as ListingStatus,
    name: '',
    phone: '',
    notes: '',
    followup_date: '',
    related_keys: [],
    updated_at: new Date().toISOString(),
  };

  const status = STATUS_CONFIG[record.status];
  const badge = document.createElement('button');
  badge.type = 'button';
  badge.className = 'mcrm-badge';
  badge.style.setProperty('--mcrm-bg', status.background);
  badge.style.setProperty('--mcrm-color', status.color);
  badge.style.setProperty('--mcrm-border', status.border);
  badge.textContent = status.label;
  badge.title = `${status.label} · ${record.title}`;
  badge.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    void onOpen(record);
  });

  if (target.insertBefore?.parentElement) {
    const slot = document.createElement('span');
    slot.className = ['mcrm-inline-slot', target.slotClassName].filter(Boolean).join(' ');
    slot.setAttribute(MOUNT_ATTR, hostKey);
    badge.classList.add('mcrm-badge--inline');
    if (target.badgeClassName) {
      badge.classList.add(...target.badgeClassName.split(/\s+/).filter(Boolean));
    }
    slot.appendChild(badge);
    target.insertBefore.parentElement.insertBefore(slot, target.insertBefore);
    return;
  }

  if (target.overlayContainer) {
    target.overlayContainer.classList.add('mcrm-badge-host');
    target.overlayContainer.setAttribute(MOUNT_ATTR, hostKey);
    badge.classList.add('mcrm-badge--overlay');
    if (target.badgeClassName) {
      badge.classList.add(...target.badgeClassName.split(/\s+/).filter(Boolean));
    }
    target.overlayContainer.appendChild(badge);
  }
}

export async function openListingModal(
  record: ListingRecord,
  onSaved: (record: ListingRecord) => void,
) {
  closeModal();

  const related = await getRelatedListings(record);
  const sellerListings = record.phone
    ? (await getListingsByPhone(record.phone)).filter(
        (item) => getListingKey(item) !== getListingKey(record),
      )
    : [];

  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.className = 'mcrm-overlay';
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      closeModal();
    }
  });

  const modal = document.createElement('div');
  modal.className = 'mcrm-modal';
  modal.innerHTML = buildModalMarkup(record, related, sellerListings);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  activeOverlay = overlay;

  const state: ListingRecord = {
    ...record,
    related_keys: [...(record.related_keys ?? [])],
  };

  overlay.querySelector<HTMLButtonElement>('.mcrm-close')?.addEventListener('click', closeModal);
  overlay.querySelector<HTMLButtonElement>('[data-action="cancel"]')?.addEventListener('click', closeModal);

  overlay.querySelectorAll<HTMLButtonElement>('.mcrm-status-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      state.status = pill.dataset.status as ListingStatus;
      overlay.querySelectorAll('.mcrm-status-pill').forEach((node) => {
        node.classList.toggle('is-active', node === pill);
      });
    });
  });

  const nameInput = overlay.querySelector<HTMLInputElement>('[name="name"]');
  const phoneInput = overlay.querySelector<HTMLInputElement>('[name="phone"]');
  const whatsappButton = overlay.querySelector<HTMLButtonElement>('[data-action="whatsapp"]');
  const notesInput = overlay.querySelector<HTMLTextAreaElement>('[name="notes"]');
  const followupInput = overlay.querySelector<HTMLInputElement>('[name="followup_date"]');
  const relatedUrlInput = overlay.querySelector<HTMLInputElement>('[name="related_url"]');
  const saveButton = overlay.querySelector<HTMLButtonElement>('[data-action="save"]');
  const toast = overlay.querySelector<HTMLElement>('.mcrm-toast');

  const syncWhatsAppButton = () => {
    if (whatsappButton && phoneInput) {
      whatsappButton.hidden = !canOpenWhatsApp(phoneInput.value);
    }
  };

  phoneInput?.addEventListener('blur', () => {
    if (phoneInput.value.trim()) {
      phoneInput.value = formatPhoneForForm(sanitizePhoneInput(phoneInput.value));
    }
    syncWhatsAppButton();
  });

  phoneInput?.addEventListener('input', () => {
    const sanitized = sanitizePhoneInput(phoneInput.value);
    if (phoneInput.value !== sanitized) {
      phoneInput.value = sanitized;
    }
    syncWhatsAppButton();
  });

  whatsappButton?.addEventListener('click', async () => {
    const settings = await getSettings();
    const phone = phoneInput?.value ?? '';
    
    if (!phone) return;
    
    const normalized = normalizePhoneNumber(phone).replace(/\D/g, '');
    
    if (!normalized) return;
    
    let url: string;
    if (settings.whatsappMode === 'desktop') {
      url = `whatsapp://send?phone=${normalized}`;
    } else {
      url = `https://web.whatsapp.com/send?phone=${normalized}`;
    }
    
    window.open(url, '_blank');
  });

  syncWhatsAppButton();

  overlay.querySelector<HTMLButtonElement>('[data-action="add-related"]')?.addEventListener('click', async () => {
    if (!relatedUrlInput || !toast) {
      return;
    }

    const url = relatedUrlInput.value.trim();

    if (!isSupportedMarketplaceUrl(url)) {
      toast.className = 'mcrm-toast mcrm-toast--error';
      toast.textContent = 'Enter a valid OLX, MagicBricks, or 99acres listing URL.';
      return;
    }

    const parsed = parseListingUrl(url);

    if (!parsed) {
      toast.className = 'mcrm-toast mcrm-toast--error';
      toast.textContent = 'Could not parse that listing URL.';
      return;
    }

    try {
      const updated = await linkRelatedListing(state, parsed);
      Object.assign(state, updated);
      relatedUrlInput.value = '';
      toast.className = 'mcrm-toast mcrm-toast--success';
      toast.textContent = 'Related listing linked.';
      reopenModal(state, onSaved);
    } catch (error) {
      toast.className = 'mcrm-toast mcrm-toast--error';
      toast.textContent = error instanceof Error ? error.message : 'Could not link listing';
    }
  });

  saveButton?.addEventListener('click', async () => {
    if (!saveButton || !toast) {
      return;
    }

    saveButton.disabled = true;
    saveButton.textContent = 'Saving...';
    toast.className = 'mcrm-toast';
    toast.textContent = '';

    state.name = nameInput?.value.trim() ?? '';
    const rawPhone = phoneInput?.value.trim() ?? '';
    if (rawPhone && !isValidPhoneNumber(rawPhone)) {
      toast.className = 'mcrm-toast mcrm-toast--error';
      toast.textContent = `Invalid phone: ${PHONE_INPUT_PLACEHOLDER}`;
      saveButton.disabled = false;
      saveButton.textContent = 'Save';
      return;
    }
    state.phone = rawPhone ? normalizePhoneNumber(rawPhone) : '';
    state.notes = notesInput?.value.trim() ?? '';
    state.followup_date = followupInput?.value ?? '';

    try {
      const saved = await upsertListingRecord(state, state);
      await syncListingToSheet(saved);
      onSaved(saved);
      toast.className = 'mcrm-toast mcrm-toast--success';
      toast.textContent = 'Saved and synced with your sheet.';
      window.setTimeout(() => closeModal(), 700);
    } catch (error) {
      toast.className = 'mcrm-toast mcrm-toast--error';
      toast.textContent = error instanceof Error ? error.message : 'Save failed';
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = 'Save';
    }
  });
}

function reopenModal(record: ListingRecord, onSaved: (record: ListingRecord) => void) {
  closeModal();
  void openListingModal(record, onSaved);
}

export function closeModal() {
  activeOverlay?.remove();
  activeOverlay = null;
}

function buildAggregatedNotes(
  record: ListingRecord,
  related: ListingRecord[],
  sellerListings: ListingRecord[],
) {
  const blocks: string[] = [];

  for (const item of related) {
    if (item.notes.trim()) {
      blocks.push(`[Related · ${item.platform}] ${item.title}\n${item.notes.trim()}`);
    }
  }

  for (const item of sellerListings) {
    if (item.notes.trim()) {
      blocks.push(`[Same seller · ${item.platform}] ${item.title}\n${item.notes.trim()}`);
    }
  }

  if (!blocks.length) {
    return '';
  }

  return blocks.join('\n\n---\n\n');
}

function buildModalMarkup(
  record: ListingRecord,
  related: ListingRecord[],
  sellerListings: ListingRecord[],
) {
  const statusPills = LISTING_STATUSES.map((status) => {
    const config = STATUS_CONFIG[status];
    const activeClass = record.status === status ? 'is-active' : '';

    return `
      <button
        type="button"
        class="mcrm-status-pill ${activeClass}"
        data-status="${status}"
        style="--pill-bg:${config.background};--pill-color:${config.color};--pill-border:${config.border};--pill-color-dark:${config.colorDark}"
      >
        ${config.label}
      </button>
    `;
  }).join('');

  const aggregatedNotes = buildAggregatedNotes(record, related, sellerListings);
  const notesPreview = aggregatedNotes
    ? `<div class="mcrm-notes-preview">${escapeHtml(aggregatedNotes)}</div>`
    : '';

  const relatedList = related
    .map(
      (item) => `
        <li>
          <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a>
          <span>${escapeHtml(STATUS_CONFIG[item.status].label)}</span>
        </li>
      `,
    )
    .join('');

  const sellerList = sellerListings
    .map(
      (item) => `
        <li>
          <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a>
          <span>${escapeHtml(item.phone)}</span>
        </li>
      `,
    )
    .join('');

  return `
    <div class="mcrm-modal__header">
      <div>
        <h2 class="mcrm-modal__title">${escapeHtml(record.title)}</h2>
        <p class="mcrm-modal__subtitle">${escapeHtml(record.platform)} · ${escapeHtml(record.price || 'Price not listed')}</p>
      </div>
      <button type="button" class="mcrm-close" aria-label="Close">×</button>
    </div>
    <div class="mcrm-modal__body">
      <div class="mcrm-meta">
        <div class="mcrm-meta-card">
          <strong>Platform</strong>
          <span>${escapeHtml(record.platform)}</span>
        </div>
        <div class="mcrm-meta-card">
          <strong>Status</strong>
          <span>${escapeHtml(STATUS_CONFIG[record.status].label)}</span>
        </div>
      </div>
      <div class="mcrm-status-grid">${statusPills}</div>
      <label class="mcrm-field">
        <span>Seller name</span>
        <input name="name" value="${escapeHtml(record.name)}" placeholder="Seller name" />
      </label>
      <label class="mcrm-field">
        <span>Phone number</span>
        <div class="mcrm-phone-row">
          <input name="phone" value="${escapeHtml(formatPhoneForForm(record.phone))}" placeholder="${PHONE_INPUT_PLACEHOLDER}" />
          <button type="button" class="mcrm-whatsapp-button" data-action="whatsapp" aria-label="Open WhatsApp" title="Open WhatsApp"${canOpenWhatsApp(record.phone) ? '' : ' hidden'}>
            <svg viewBox="0 0 32 32" aria-hidden="true">
              <path fill="currentColor" d="M16.02 4C9.4 4 4.03 9.32 4.03 15.88c0 2.1.56 4.15 1.61 5.95L4 28l6.34-1.65a12.08 12.08 0 0 0 5.68 1.43C22.63 27.78 28 22.45 28 15.88S22.63 4 16.02 4Zm0 21.78c-1.83 0-3.62-.49-5.18-1.42l-.37-.22-3.76.98 1-3.65-.24-.38a9.8 9.8 0 0 1-1.5-5.21c0-5.46 4.5-9.9 10.04-9.9 5.53 0 10.03 4.44 10.03 9.9s-4.5 9.9-10.03 9.9Zm5.5-7.42c-.3-.15-1.78-.87-2.06-.97-.28-.1-.48-.15-.68.15-.2.3-.78.97-.96 1.17-.18.2-.35.22-.65.07-.3-.15-1.27-.46-2.42-1.48-.9-.79-1.5-1.77-1.67-2.07-.18-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.68-1.62-.93-2.22-.24-.58-.5-.5-.68-.51h-.58c-.2 0-.52.07-.8.37-.28.3-1.05 1.02-1.05 2.5s1.08 2.9 1.23 3.1c.15.2 2.13 3.23 5.17 4.52.72.31 1.28.5 1.72.64.72.23 1.38.2 1.9.12.58-.08 1.78-.72 2.03-1.42.25-.7.25-1.3.18-1.42-.08-.13-.28-.2-.58-.35Z" />
            </svg>
          </button>
        </div>
      </label>
      <section class="mcrm-section">
        <h3>Related listing (duplicate post)</h3>
        <div class="mcrm-section-row">
          <input name="related_url" placeholder="Paste listing URL from any marketplace" />
          <button type="button" class="mcrm-button mcrm-button--secondary mcrm-button--small" data-action="add-related">Add</button>
        </div>
        ${related.length ? `<ul class="mcrm-link-list">${relatedList}</ul>` : '<p style="margin:8px 0 0;font-size:12px;color:#6b7280">No related listings linked yet.</p>'}
      </section>
      <section class="mcrm-section">
        <h3>Same seller (${sellerListings.length} other listing${sellerListings.length === 1 ? '' : 's'})</h3>
        ${sellerListings.length ? `<ul class="mcrm-link-list">${sellerList}</ul>` : '<p style="margin:0;font-size:12px;color:#6b7280">Save a phone number to see other listings for this seller.</p>'}
      </section>
      <label class="mcrm-field">
        <span>Notes</span>
        ${notesPreview}
        <textarea name="notes" placeholder="Your notes for this listing">${escapeHtml(record.notes)}</textarea>
      </label>
      <label class="mcrm-field">
        <span>Follow-up date</span>
        <input type="date" name="followup_date" value="${escapeHtml(record.followup_date)}" />
      </label>
      <div class="mcrm-actions">
        <button type="button" class="mcrm-button mcrm-button--primary" data-action="save">Save</button>
        <button type="button" class="mcrm-button mcrm-button--secondary" data-action="cancel">Cancel</button>
      </div>
      <div class="mcrm-toast"></div>
    </div>
  `;
}

async function syncListingToSheet(record: ListingRecord) {
  const settings = await getSettings();

  if (!isValidAppsScriptUrl(settings.apiUrl) || !isValidSpreadsheetId(settings.spreadsheetId)) {
    return;
  }

  const response = await fetch(normalizeAppsScriptUrl(settings.apiUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify({
      ...record,
      tags: record.status,
      followup_date: record.followup_date,
      spreadsheet_id: normalizeSpreadsheetId(settings.spreadsheetId),
    }),
  });

  const data = await parseAppsScriptResponse(response);

  if (!response.ok || !data.success) {
    throw new Error(
      formatAppsScriptError(
        data.error || `Sync failed with HTTP ${response.status}`,
        data.apiVersion,
      ),
    );
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
