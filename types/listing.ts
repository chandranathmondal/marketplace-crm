export const LISTING_STATUSES = [
  'new',
  'shortlisted',
  'contacted',
  'follow_up',
  'rejected',
  'closed',
] as const;

export type ListingStatus = (typeof LISTING_STATUSES)[number];

export type ListingData = {
  platform: string;
  listing_id: string;
  url: string;
  title: string;
  price: string;
};

export type ListingRecord = ListingData & {
  status: ListingStatus;
  name: string;
  phone: string;
  notes: string;
  followup_date: string;
  related_keys: string[];
  updated_at: string;
};

export type ListingMountTarget = {
  listing: ListingData;
  insertBefore: HTMLElement | null;
  overlayContainer: HTMLElement | null;
  slotClassName?: string;
  badgeClassName?: string;
};
