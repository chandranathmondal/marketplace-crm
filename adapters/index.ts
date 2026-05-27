import { acres99Adapter } from './99acres.ts';
import { magicBricksAdapter } from './magicbricks.ts';
import { olxAdapter } from './olx.ts';
import type { MarketplaceAdapter } from './types.ts';

export function getAdapterForHost(hostname: string): MarketplaceAdapter | null {
  if (hostname.includes('olx')) {
    return olxAdapter;
  }

  if (hostname.includes('magicbricks')) {
    return magicBricksAdapter;
  }

  if (hostname.includes('99acres')) {
    return acres99Adapter;
  }

  return null;
}

export function getAdapterForCurrentPage() {
  return getAdapterForHost(window.location.hostname);
}
