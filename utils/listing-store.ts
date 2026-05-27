import type { ListingData, ListingRecord, ListingStatus } from '../types/listing';
import { getListingKey } from './listing-key';
import { phonesMatch } from './phone';

export const LISTINGS_STORAGE_KEY = 'marketplaceCrmListings';
export const CURRENT_LISTING_STORAGE_KEY = 'currentListing';

type ListingMap = Record<string, ListingRecord>;

export function createListingRecord(
  listing: ListingData,
  partial: Partial<ListingRecord> = {},
): ListingRecord {
  const now = new Date().toISOString();

  return {
    ...listing,
    status: partial.status ?? 'new',
    name: partial.name ?? '',
    phone: partial.phone ?? '',
    notes: partial.notes ?? '',
    followup_date: partial.followup_date ?? '',
    related_keys: partial.related_keys ?? [],
    updated_at: partial.updated_at ?? now,
  };
}

export async function getAllListings(): Promise<ListingRecord[]> {
  const result = await browser.storage.local.get(LISTINGS_STORAGE_KEY);
  const listings = (result[LISTINGS_STORAGE_KEY] as ListingMap | undefined) ?? {};

  return Object.values(listings).sort(
    (left, right) => right.updated_at.localeCompare(left.updated_at),
  );
}

export async function getListingRecord(
  listing: Pick<ListingData, 'platform' | 'listing_id'>,
): Promise<ListingRecord | null> {
  const result = await browser.storage.local.get(LISTINGS_STORAGE_KEY);
  const listings = (result[LISTINGS_STORAGE_KEY] as ListingMap | undefined) ?? {};
  return listings[getListingKey(listing)] ?? null;
}

export async function upsertListingRecord(
  listing: ListingData,
  updates: Partial<ListingRecord> = {},
): Promise<ListingRecord> {
  const existing = await getListingRecord(listing);
  const record = createListingRecord(listing, {
    ...existing,
    ...updates,
    updated_at: new Date().toISOString(),
  });

  const result = await browser.storage.local.get(LISTINGS_STORAGE_KEY);
  const listings = (result[LISTINGS_STORAGE_KEY] as ListingMap | undefined) ?? {};

  listings[getListingKey(listing)] = record;

  await browser.storage.local.set({
    [LISTINGS_STORAGE_KEY]: listings,
    [CURRENT_LISTING_STORAGE_KEY]: listing,
  });

  return record;
}

export async function getListingsByPhone(phone: string): Promise<ListingRecord[]> {
  const listings = await getAllListings();
  return listings.filter((listing) => phonesMatch(listing.phone, phone));
}

export async function getRelatedListings(record: ListingRecord): Promise<ListingRecord[]> {
  const listings = await getAllListings();
  const listingMap = new Map(listings.map((item) => [getListingKey(item), item]));

  return record.related_keys
    .map((key) => listingMap.get(key))
    .filter((item): item is ListingRecord => Boolean(item));
}

export async function linkRelatedListing(
  parent: ListingRecord,
  related: ListingData,
): Promise<ListingRecord> {
  const relatedKey = getListingKey(related);
  const parentKey = getListingKey(parent);
  const relatedKeys = Array.from(new Set([...(parent.related_keys ?? []), relatedKey]));

  await upsertListingRecord(related, {
    status: parent.status,
    name: parent.name,
    phone: parent.phone,
    notes: parent.notes,
    followup_date: parent.followup_date,
    related_keys: Array.from(new Set([...relatedKeys, parentKey])),
  });

  return upsertListingRecord(parent, { related_keys: relatedKeys });
}

export async function updateListingStatus(
  listing: Pick<ListingData, 'platform' | 'listing_id'>,
  status: ListingStatus,
) {
  const existing = await getListingRecord(listing);

  if (!existing) {
    throw new Error('Listing not found in local CRM storage');
  }

  return upsertListingRecord(existing, { status });
}
