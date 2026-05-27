import assert from 'node:assert/strict';
import test from 'node:test';

import { isSupportedMarketplaceUrl, parseListingUrl } from '../utils/listing-url.ts';

test('detects supported marketplace URLs', () => {
  assert.equal(
    isSupportedMarketplaceUrl('https://www.olx.in/item/example-iid-12345'),
    true,
  );
});

test('parses OLX listing URLs', () => {
  const listing = parseListingUrl('https://www.olx.in/item/example-iid-12345');

  assert.equal(listing?.platform, 'olx');
  assert.match(listing?.listing_id ?? '', /\/item\//);
});
