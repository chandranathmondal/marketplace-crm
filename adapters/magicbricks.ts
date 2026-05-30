import type { ListingData, ListingMountTarget } from '../types/listing';
import type { MarketplaceAdapter } from './types.ts';
import {
  collectListTargets,
  findActionButton,
  findImageContainer,
  findShortlistButton,
} from './shared.ts';

export function extractMagicBricksData(): ListingData | null {
  return extractMagicBricksDetailListing();
}

export function extractMagicBricksDetailListing(): ListingData | null {
  const title =
    document.querySelector('h1')?.textContent?.trim() ??
    document.querySelector('[class*="pdp"] h1, [class*="detail"] h1')?.textContent?.trim() ??
    '';

  const price =
    document.body.innerText.match(/₹\s?[\d,.]+(?:\s*(?:Lac|Cr|crore|lakh))?/i)?.[0] ?? '';

  if (!title) {
    return null;
  }

  return {
    platform: 'magicbricks',
    listing_id: window.location.pathname,
    url: window.location.href,
    title,
    price,
  };
}

export function isMagicBricksDetailPage(pathname: string) {
  if (/propertydetails|\/prd\/|property-for-sale\/.*\/\d+/i.test(pathname)) {
    return true;
  }

  return Boolean(
    document.querySelector('h1') &&
      findActionButton(document, ['contact owner', 'contact seller', 'view number', 'get phone']),
  );
}

export function isMagicBricksListPage(pathname: string) {
  return !isMagicBricksDetailPage(pathname);
}

export function findMagicBricksDetailMountTarget(): ListingMountTarget | null {
  const listing = extractMagicBricksDetailListing();

  if (!listing) {
    return null;
  }

  const insertBefore =
    findShortlistButton(document) ??
    findActionButton(document, ['share', 'contact owner', 'contact seller', 'save', 'enquire']);

  if (insertBefore) {
    return { listing, insertBefore, overlayContainer: null };
  }

  // Try to find image container in various locations
  const imageSearchRoot =
    document.querySelector<HTMLElement>(
      '[class*="pdp"], [class*="photo"], [class*="gallery"], main, [class*="detail"], [class*="hero"]',
    ) ?? document.querySelector<HTMLElement>('section') ?? document.body;

  const imageContainer = findImageContainer(imageSearchRoot);

  if (imageContainer && imageContainer !== document.body) {
    return {
      listing,
      insertBefore: null,
      overlayContainer: imageContainer,
    };
  }

  // Fallback: look for any prominent image on the page
  const img = document.querySelector<HTMLImageElement>('img[src]:not([src^="data:"])');
  if (img?.parentElement && img.parentElement !== document.body) {
    return {
      listing,
      insertBefore: null,
      overlayContainer: img.parentElement,
    };
  }

  return null;
}

export function findMagicBricksListMountTargets(): ListingMountTarget[] {
  const anchors = Array.from(
    document.querySelectorAll<HTMLAnchorElement>(
      'a[href*="propertyDetails"], a[href*="propertydetails"], a[href*="/property-for-sale/"], a[href*="/prd/"], a[href*="magicbricks.com/"][href*="id"]',
    ),
  );

  const targets = collectListTargets(anchors, 'magicbricks', new Set());

  if (targets.length > 0) {
    return targets;
  }

  const cards = Array.from(
    document.querySelectorAll<HTMLElement>(
      '.mb-srp__card, [class*="srpCard"], [class*="card-container"], article',
    ),
  );

  const seen = new Set<string>();
  const fallbackTargets: ListingMountTarget[] = [];

  for (const card of cards) {
    const anchor = card.querySelector<HTMLAnchorElement>('a[href]');

    if (!anchor?.href) {
      continue;
    }

    const listing = {
      platform: 'magicbricks',
      listing_id: new URL(anchor.href).pathname,
      url: anchor.href,
      title: (card.querySelector('h2, h3')?.textContent ?? anchor.textContent ?? '').trim(),
      price: (card.textContent ?? '').match(/₹\s?[\d,.]+(?:\s*(?:Lac|Cr))?/i)?.[0] ?? '',
    };

    if (!listing.title) {
      continue;
    }

    const key = `${listing.platform}:${listing.listing_id}`;

    if (seen.has(key)) {
      continue;
    }

    const insertBefore =
      findShortlistButton(card) ?? findActionButton(card, ['contact', 'save', 'view']);

    if (!insertBefore && !findImageContainer(card)) {
      continue;
    }

    seen.add(key);
    fallbackTargets.push({
      listing,
      insertBefore,
      overlayContainer: insertBefore ? null : findImageContainer(card),
    });
  }

  return fallbackTargets;
}

export const magicBricksAdapter: MarketplaceAdapter = {
  platform: 'magicbricks',
  isDetailPage: isMagicBricksDetailPage,
  isListPage: isMagicBricksListPage,
  extractDetailListing: extractMagicBricksDetailListing,
  findDetailMountTarget: findMagicBricksDetailMountTarget,
  findListMountTargets: findMagicBricksListMountTargets,
};
