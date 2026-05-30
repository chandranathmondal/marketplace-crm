import type { ListingMountTarget } from '../types/listing';
import type { MarketplaceAdapter } from './types.ts';
import { collectListTargets, findImageContainer, findShortlistButton } from './shared.ts';

export function extract99AcresData() {
  return extract99AcresDetailListing();
}

export function extract99AcresDetailListing() {
  const title = document.querySelector('h1')?.textContent?.trim() ?? '';
  const price =
    document.body.innerText.match(/₹\s?[\d,.]+(?:\s*(?:Lac|Cr|crore|lakh))?/i)?.[0] ?? '';

  if (!title) {
    return null;
  }

  return {
    platform: '99acres',
    listing_id: window.location.pathname,
    url: window.location.href,
    title,
    price,
  };
}

export function is99AcresDetailPage(pathname: string) {
  return /-spid-|-ffid-|npxid|property-details|pdid|\/detail\//i.test(pathname);
}

export function is99AcresListPage(pathname: string) {
  return !is99AcresDetailPage(pathname);
}

export function find99AcresDetailMountTarget(): ListingMountTarget | null {
  const listing = extract99AcresDetailListing();

  if (!listing) {
    return null;
  }

  const insertBefore = findShortlistButton(document);

  return {
    listing,
    insertBefore,
    overlayContainer: insertBefore ? null : findImageContainer(document.body),
    slotClassName: insertBefore ? 'mcrm-inline-slot--99acres-detail' : undefined,
    badgeClassName: 'mcrm-badge--rainbow',
  };
}

export function find99AcresListMountTargets(): ListingMountTarget[] {
  const anchors = Array.from(
    document.querySelectorAll<HTMLAnchorElement>(
      'a[href*="-spid-"], a[href*="-ffid-"], a[href*="npxid"], a[href*="/property/"], a[href*="99acres.com"][href*="-"]',
    ),
  );

  const targets = collectListTargets(anchors, '99acres', new Set());

  return targets.map((target) => {
    const cardRoot =
      target.insertBefore?.closest<HTMLElement>(
        'article, li, [class*="card"], [class*="tuple"], [class*="srp"]',
      ) ?? null;

    const overlayContainer = cardRoot ? findImageContainer(cardRoot) : target.overlayContainer;

    return {
      ...target,
      insertBefore: null,
      overlayContainer,
      slotClassName: undefined,
      badgeClassName: 'mcrm-badge--rainbow',
    };
  }).filter((target) => target.insertBefore || target.overlayContainer);
}

export const acres99Adapter: MarketplaceAdapter = {
  platform: '99acres',
  isDetailPage: is99AcresDetailPage,
  isListPage: is99AcresListPage,
  extractDetailListing: extract99AcresDetailListing,
  findDetailMountTarget: find99AcresDetailMountTarget,
  findListMountTargets: find99AcresListMountTargets,
};
