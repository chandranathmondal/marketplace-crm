import type { ListingData, ListingMountTarget } from '../types/listing';
import type { MarketplaceAdapter } from './types.ts';
import {
  collectListTargets,
  findActionButton,
  findImageContainer,
  findShareButton,
  findShortlistButton,
} from './shared.ts';

export function extractOlxData(): ListingData | null {
  return extractOlxDetailListing();
}

export function extractOlxDetailListing(): ListingData | null {
  const title = document.querySelector('h1')?.textContent?.trim() ?? '';
  const price = document.body.innerText.match(/₹\s?[\d,]+(?:\.\d+)?(?:\s*(?:Lac|Cr|crore|lakh))?/i)?.[0] ?? '';

  if (!title) {
    return null;
  }

  return {
    platform: 'olx',
    listing_id: window.location.pathname,
    url: window.location.href,
    title,
    price,
  };
}

export function isOlxDetailPage(pathname: string) {
  return /\/item\//i.test(pathname) || /\/ad\//i.test(pathname);
}

export function isOlxListPage(pathname: string) {
  return !isOlxDetailPage(pathname);
}

function findOlxDetailInsertPoint() {
  const shortlist = findShortlistButton(document);
  if (shortlist) {
    return shortlist;
  }
  const share = findShareButton(document);
  if (share) {
    return share;
  }
  return findActionButton(document, ['chat', 'make an offer', 'contact']);
}

export function findOlxDetailMountTarget(): ListingMountTarget | null {
  const listing = extractOlxDetailListing();

  if (!listing) {
    return null;
  }

  const insertBefore = findOlxDetailInsertPoint();

  if (insertBefore) {
    return {
      listing,
      insertBefore,
      overlayContainer: null,
      slotClassName: 'mcrm-inline-slot--olx-detail',
      badgeClassName: 'mcrm-badge--rainbow',
    };
  }

  const imageContainer = findImageContainer(document.body);

  if (imageContainer) {
    return {
      listing,
      insertBefore: null,
      overlayContainer: imageContainer,
    };
  }

  const priceNode = Array.from(document.querySelectorAll<HTMLElement>('span, div, p')).find((node) =>
    /₹\s?[\d,]+/.test(node.textContent ?? ''),
  );

  if (priceNode?.parentElement) {
    return {
      listing,
      insertBefore: priceNode.parentElement.nextElementSibling as HTMLElement | null,
      overlayContainer: null,
    };
  }

  return null;
}

export function findOlxListMountTargets(): ListingMountTarget[] {
  const anchors = Array.from(
    document.querySelectorAll<HTMLAnchorElement>('a[href*="/item/"], a[href*="/ad/"]'),
  );

  const targets = collectListTargets(anchors, 'olx', new Set());

  return targets.map((target) => {
    const cardRoot =
      target.insertBefore?.closest<HTMLElement>(
        'article, li, [class*="card"], [class*="tuple"], [class*="item"]',
      ) ?? null;

    const shortlist = cardRoot ? findShortlistButton(cardRoot) : null;

    return {
      ...target,
      insertBefore: shortlist || target.insertBefore,
      overlayContainer: shortlist ? null : (cardRoot ? findImageContainer(cardRoot) : target.overlayContainer),
      slotClassName: shortlist ? 'mcrm-inline-slot--olx-list' : undefined,
    };
  }).filter((target) => target.insertBefore || target.overlayContainer);
}

export const olxAdapter: MarketplaceAdapter = {
  platform: 'olx',
  isDetailPage: isOlxDetailPage,
  isListPage: isOlxListPage,
  extractDetailListing: extractOlxDetailListing,
  findDetailMountTarget: findOlxDetailMountTarget,
  findListMountTargets: findOlxListMountTargets,
};
