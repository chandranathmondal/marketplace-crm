import type { ListingData, ListingMountTarget } from '../types/listing';

export function findImageContainer(root: HTMLElement): HTMLElement | null {
  const image = root.querySelector<HTMLImageElement>(
    'img[src]:not([src^="data:"]), picture img[src]',
  );

  if (!image) {
    return null;
  }

  const container =
    image.closest<HTMLElement>('picture, figure, [class*="image"], [class*="gallery"], [class*="photo"]') ??
    image.parentElement;

  if (!container) {
    return null;
  }

  const rect = container.getBoundingClientRect();

  if (rect.width < 80 || rect.height < 80) {
    return image.parentElement;
  }

  return container;
}

export function findActionButton(
  root: ParentNode,
  matchers: string[],
): HTMLElement | null {
  const nodes = root.querySelectorAll<HTMLElement>('button, a, [role="button"], span[role="button"]');

  for (const node of nodes) {
    const text = (node.textContent ?? '').trim().toLowerCase();
    const aria = (node.getAttribute('aria-label') ?? '').toLowerCase();
    const title = (node.getAttribute('title') ?? '').toLowerCase();
    const combined = `${text} ${aria} ${title}`;

    if (matchers.some((matcher) => combined.includes(matcher))) {
      return node;
    }
  }

  return null;
}

export function findShortlistButton(root: ParentNode) {
  return findActionButton(root, ['shortlist', 'short-list', 'save property']);
}

export function findShareButton(root: ParentNode) {
  return findActionButton(root, ['share']);
}

export function buildListingFromAnchor(
  anchor: HTMLAnchorElement,
  platform: string,
  titleSelector = 'h2, h3, [class*="title"], [class*="name"]',
): ListingData | null {
  const href = anchor.href;

  if (!href || href === window.location.href) {
    return null;
  }

  const url = new URL(href, window.location.origin);
  const card =
    anchor.closest<HTMLElement>(
      'article, li, [class*="card"], [class*="tuple"], [class*="item"], [data-cy="listing-card"], [class*="srpCard"]',
    ) ?? anchor.parentElement;

  const titleNode =
    card?.querySelector<HTMLElement>(titleSelector) ??
    anchor.querySelector<HTMLElement>(titleSelector);

  const title = (titleNode?.textContent ?? anchor.textContent ?? '').trim().replace(/\s+/g, ' ');

  if (!title || title.length < 4) {
    return null;
  }

  const cardText = card?.textContent ?? '';
  const price = cardText.match(/₹\s?[\d,]+(?:\.\d+)?(?:\s*(?:Lac|Cr|crore|lakh))?/i)?.[0] ?? '';

  return {
    platform,
    listing_id: url.pathname,
    url: url.href,
    title: title.slice(0, 180),
    price,
  };
}

export function createMountTarget(
  listing: ListingData,
  cardRoot: HTMLElement,
  insertBefore?: HTMLElement | null,
): ListingMountTarget | null {
  const anchor = insertBefore ?? findShortlistButton(cardRoot) ?? findShareButton(cardRoot);

  return {
    listing,
    insertBefore: anchor,
    overlayContainer: anchor ? null : findImageContainer(cardRoot),
  };
}

export function collectListTargets(
  anchors: HTMLAnchorElement[],
  platform: string,
  seen: Set<string>,
): ListingMountTarget[] {
  const targets: ListingMountTarget[] = [];

  for (const anchor of anchors) {
    const listing = buildListingFromAnchor(anchor, platform);

    if (!listing) {
      continue;
    }

    const key = `${listing.platform}:${listing.listing_id}`;

    if (seen.has(key)) {
      continue;
    }

    const cardRoot =
      anchor.closest<HTMLElement>(
        'article, li, [class*="card"], [class*="tuple"], [class*="item"], [data-cy="listing-card"], [class*="srpCard"], [class*="mb-srp__card"]',
      ) ?? anchor;

    const target = createMountTarget(listing, cardRoot);

    if (!target || (!target.insertBefore && !target.overlayContainer)) {
      continue;
    }

    seen.add(key);
    targets.push(target);
  }

  return targets;
}
