import assert from 'node:assert/strict';
import test from 'node:test';

import { extract99AcresData } from '../adapters/99acres.ts';
import { extractMagicBricksData } from '../adapters/magicbricks.ts';
import { extractOlxData } from '../adapters/olx.ts';

type ListingExtractor = () => {
  platform: string;
  listing_id: string;
  url: string;
  title: string;
  price: string;
};

function installListingPage({
  href,
  pathname,
  title,
  bodyText = '',
}: {
  href: string;
  pathname: string;
  title: string;
  bodyText?: string;
}) {
  const documentStub = {
    body: {
      innerText: bodyText,
    },
    querySelector(selector: string) {
      if (selector !== 'h1') return null;

      return {
        textContent: title,
      };
    },
  };

  const windowStub = {
    location: {
      href,
      pathname,
    },
  };

  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: documentStub,
  });
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: windowStub,
  });
}

function assertCommonListingData(
  extractor: ListingExtractor,
  expected: {
    platform: string;
    href: string;
    pathname: string;
    title: string;
    price: string;
  },
) {
  assert.deepEqual(extractor(), {
    platform: expected.platform,
    listing_id: expected.pathname,
    url: expected.href,
    title: expected.title,
    price: expected.price,
  });
}

test('OLX adapter extracts title, URL details, and rupee price', () => {
  installListingPage({
    href: 'https://www.olx.in/item/2bhk-apartment-iid-12345',
    pathname: '/item/2bhk-apartment-iid-12345',
    title: '2BHK apartment near metro',
    bodyText: 'Posted today\n₹ 45,00,000\nSeller verified',
  });

  assertCommonListingData(extractOlxData, {
    platform: 'olx',
    href: 'https://www.olx.in/item/2bhk-apartment-iid-12345',
    pathname: '/item/2bhk-apartment-iid-12345',
    title: '2BHK apartment near metro',
    price: '₹ 45,00,000',
  });
});

test('OLX adapter returns an empty price when no rupee price is present', () => {
  installListingPage({
    href: 'https://www.olx.in/item/plot-iid-67890',
    pathname: '/item/plot-iid-67890',
    title: 'Residential plot',
    bodyText: 'Contact seller for price',
  });

  assert.equal(extractOlxData().price, '');
});

test('MagicBricks adapter extracts common listing fields', () => {
  installListingPage({
    href: 'https://www.magicbricks.com/propertyDetails/flat-for-sale-XYZ',
    pathname: '/propertyDetails/flat-for-sale-XYZ',
    title: 'Flat for sale in Pune',
  });

  assertCommonListingData(extractMagicBricksData, {
    platform: 'magicbricks',
    href: 'https://www.magicbricks.com/propertyDetails/flat-for-sale-XYZ',
    pathname: '/propertyDetails/flat-for-sale-XYZ',
    title: 'Flat for sale in Pune',
    price: '',
  });
});

test('99acres adapter extracts common listing fields', () => {
  installListingPage({
    href: 'https://www.99acres.com/3-bhk-residential-apartment-npxid',
    pathname: '/3-bhk-residential-apartment-npxid',
    title: '3 BHK residential apartment',
  });

  assertCommonListingData(extract99AcresData, {
    platform: '99acres',
    href: 'https://www.99acres.com/3-bhk-residential-apartment-npxid',
    pathname: '/3-bhk-residential-apartment-npxid',
    title: '3 BHK residential apartment',
    price: '',
  });
});
