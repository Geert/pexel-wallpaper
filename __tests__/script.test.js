const { JSDOM } = require('jsdom');

describe('utility functions', () => {
  let extractCollectionIdFromUrl;
  let cachePhotoUrls;
  let getCachedPhotoUrls;
  let CACHE_DURATION_MS;

  beforeAll(async () => {
    ({ extractCollectionIdFromUrl } = await import('../docs/js/main.mjs'));
    ({ cachePhotoUrls, getCachedPhotoUrls } = await import('../docs/js/storage.mjs'));
    ({ CACHE_DURATION_MS } = await import('../docs/js/config.mjs'));
  });

  beforeEach(() => {
    const dom = new JSDOM('<!doctype html><html><body></body></html>', {
      url: 'https://example.com/',
      pretendToBeVisual: true,
    });
    global.window = dom.window;
    global.document = dom.window.document;
    global.navigator = dom.window.navigator;
    global.localStorage = dom.window.localStorage;
    localStorage.clear();
  });

  afterEach(() => {
    delete global.window;
    delete global.document;
    delete global.navigator;
    delete global.localStorage;
  });

  test('extractCollectionIdFromUrl parses valid IDs', () => {
    const url = 'https://www.pexels.com/collections/wallpapers-vmnecek/';
    expect(extractCollectionIdFromUrl(url)).toBe('vmnecek');
  });

  test('extractCollectionIdFromUrl rejects invalid URLs', () => {
    expect(extractCollectionIdFromUrl('https://example.com/not-a-collection')).toBeNull();
    expect(extractCollectionIdFromUrl('https://www.pexels.com/collections/invalid')).toBeNull();
  });

  test('cachePhotoUrls stores data and honors expiration', () => {
    const urls = ['https://example.com/a.jpg'];
    cachePhotoUrls('active', urls);
    expect(getCachedPhotoUrls('active')).toEqual(urls);

    const expiredTimestamp = Date.now() - CACHE_DURATION_MS - 1000;
    localStorage.setItem(
      'pexelCache_expired',
      JSON.stringify({ timestamp: expiredTimestamp, urls: ['stale'] })
    );
    expect(getCachedPhotoUrls('expired')).toBeNull();
  });
});
