import type { ListingData } from '../types/listing';

export function getListingKey(listing: Pick<ListingData, 'platform' | 'listing_id'>) {
  return `${listing.platform}:${listing.listing_id}`;
}
