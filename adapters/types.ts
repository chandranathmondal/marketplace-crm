import type { ListingData, ListingMountTarget } from '../types/listing';

export type MarketplaceAdapter = {
  platform: string;
  isDetailPage: (pathname: string) => boolean;
  isListPage: (pathname: string) => boolean;
  extractDetailListing: () => ListingData | null;
  findDetailMountTarget: () => ListingMountTarget | null;
  findListMountTargets: () => ListingMountTarget[];
};
