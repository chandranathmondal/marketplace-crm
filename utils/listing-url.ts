import type { ListingData } from '../types/listing';

const SUPPORTED_HOSTS = ['olx.in', 'magicbricks.com', '99acres.com'];

export function isSupportedMarketplaceUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return SUPPORTED_HOSTS.some((host) => url.hostname.includes(host));
  } catch {
    return false;
  }
}

export function parseListingUrl(value: string): ListingData | null {
  try {
    const url = new URL(value.trim());
    const host = url.hostname;

    if (host.includes('olx') && (/\/item\//i.test(url.pathname) || /\/ad\//i.test(url.pathname))) {
      return {
        platform: 'olx',
        listing_id: url.pathname,
        url: url.href,
        title: 'OLX listing',
        price: '',
      };
    }

    if (host.includes('magicbricks') && /propertydetails|property-for-sale|\/prd\//i.test(url.pathname)) {
      return {
        platform: 'magicbricks',
        listing_id: url.pathname,
        url: url.href,
        title: 'MagicBricks listing',
        price: '',
      };
    }

    if (
      host.includes('99acres') &&
      /-spid-|-ffid-|npxid|property-details|\/property\//i.test(url.pathname)
    ) {
      return {
        platform: '99acres',
        listing_id: url.pathname,
        url: url.href,
        title: '99acres listing',
        price: '',
      };
    }

    return null;
  } catch {
    return null;
  }
}
