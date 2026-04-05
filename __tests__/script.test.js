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

  test('extractCollectionIdFromUrl handles URLs without trailing slash', () => {
    const url = 'https://www.pexels.com/collections/wallpapers-vmnecek';
    expect(extractCollectionIdFromUrl(url)).toBe('vmnecek');
  });

  test('extractCollectionIdFromUrl handles www and non-www', () => {
    expect(extractCollectionIdFromUrl('https://pexels.com/collections/test-abc123/')).toBe(
      'abc123',
    );
    expect(extractCollectionIdFromUrl('https://www.pexels.com/collections/test-abc123/')).toBe(
      'abc123',
    );
  });

  test('extractCollectionIdFromUrl rejects invalid URLs', () => {
    expect(extractCollectionIdFromUrl('https://example.com/not-a-collection')).toBeNull();
    expect(extractCollectionIdFromUrl('https://www.pexels.com/collections/invalid')).toBeNull();
    expect(extractCollectionIdFromUrl('not-a-url')).toBeNull();
  });

  test('extractCollectionIdFromUrl rejects non-pexels hosts', () => {
    expect(
      extractCollectionIdFromUrl('https://evil.com/collections/wallpapers-vmnecek/'),
    ).toBeNull();
  });

  test('cachePhotoUrls stores data and honors expiration', () => {
    const urls = ['https://example.com/a.jpg'];
    cachePhotoUrls('active', urls);
    expect(getCachedPhotoUrls('active')).toEqual(urls);

    const expiredTimestamp = Date.now() - CACHE_DURATION_MS - 1000;
    localStorage.setItem(
      'pexelCache_expired',
      JSON.stringify({ timestamp: expiredTimestamp, urls: ['stale'] }),
    );
    expect(getCachedPhotoUrls('expired')).toBeNull();
  });

  test('getCachedPhotoUrls returns null for missing collection', () => {
    expect(getCachedPhotoUrls('nonexistent')).toBeNull();
  });

  test('getCachedPhotoUrls handles corrupted JSON gracefully', () => {
    localStorage.setItem('pexelCache_corrupt', 'not valid json{{{');
    expect(getCachedPhotoUrls('corrupt')).toBeNull();
  });

  test('cachePhotoUrls stores complex photo entry objects', () => {
    const entries = [
      { imageUrl: 'https://example.com/a.jpg', pageUrl: 'https://pexels.com/photo/1/', id: 1 },
      { imageUrl: 'https://example.com/b.jpg', pageUrl: 'https://pexels.com/photo/2/', id: 2 },
    ];
    cachePhotoUrls('complex', entries);
    expect(getCachedPhotoUrls('complex')).toEqual(entries);
  });
});

describe('extractPexelsId', () => {
  let extractPexelsId;

  beforeAll(async () => {
    ({ extractPexelsId } = await import('../docs/js/slideshow.mjs'));
  });

  test('extracts ID from photo URL slug', () => {
    expect(extractPexelsId('https://www.pexels.com/photo/some-title-12345/')).toBe('12345');
  });

  test('extracts ID from photo URL without title', () => {
    expect(extractPexelsId('https://www.pexels.com/photo/12345/')).toBe('12345');
  });

  test('extracts ID from photos path', () => {
    expect(extractPexelsId('https://images.pexels.com/photos/12345/pexels-photo.jpeg')).toBe(
      '12345',
    );
  });

  test('returns null for non-string input', () => {
    expect(extractPexelsId(null)).toBeNull();
    expect(extractPexelsId(undefined)).toBeNull();
    expect(extractPexelsId(42)).toBeNull();
  });

  test('returns null for URLs without photo IDs', () => {
    expect(extractPexelsId('https://www.pexels.com/collections/test/')).toBeNull();
    expect(extractPexelsId('https://example.com/')).toBeNull();
  });
});

describe('storage module', () => {
  let setStoredValue, getStoredValue, clearStoredValue;

  beforeAll(async () => {
    ({ setStoredValue, getStoredValue, clearStoredValue } = await import(
      '../docs/js/storage.mjs'
    ));
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

  test('setStoredValue and getStoredValue roundtrip', () => {
    setStoredValue('testKey', 'testValue');
    expect(getStoredValue('testKey')).toBe('testValue');
  });

  test('setStoredValue removes key when value is null/undefined/empty', () => {
    setStoredValue('testKey', 'value');
    expect(getStoredValue('testKey')).toBe('value');

    setStoredValue('testKey', null);
    expect(getStoredValue('testKey')).toBeNull();

    setStoredValue('testKey2', 'value');
    setStoredValue('testKey2', '');
    expect(getStoredValue('testKey2')).toBeNull();
  });

  test('clearStoredValue removes the key', () => {
    setStoredValue('testKey', 'value');
    clearStoredValue('testKey');
    expect(getStoredValue('testKey')).toBeNull();
  });

  test('getStoredValue returns null for missing keys', () => {
    expect(getStoredValue('nonexistent')).toBeNull();
  });
});

describe('sanitizeUrlInAddressBar', () => {
  let sanitizeUrlInAddressBar;

  beforeAll(async () => {
    ({ sanitizeUrlInAddressBar } = await import('../docs/js/storage.mjs'));
  });

  test('removes sensitive query params', () => {
    window.history.pushState({}, '', '/?apiKey=secret&collectionUrl=test&safe=keep');
    expect(window.location.search).toContain('apiKey');

    sanitizeUrlInAddressBar();

    expect(window.location.href).not.toContain('apiKey');
    expect(window.location.href).not.toContain('collectionUrl');
    expect(window.location.href).toContain('safe=keep');
  });

  test('does nothing when no sensitive params present', () => {
    window.history.pushState({}, '', '/?safe=keep');
    const urlBefore = window.location.href;

    sanitizeUrlInAddressBar();

    expect(window.location.href).toBe(urlBefore);
  });
});

describe('loadDefaultImageList', () => {
  let loadDefaultImageList;

  beforeAll(async () => {
    ({ loadDefaultImageList } = await import('../docs/js/slideshow.mjs'));
  });

  beforeEach(() => {
    global.fetch.mockReset();
  });

  test('parses text file into photo entries', async () => {
    const mockText =
      'https://images.pexels.com/photos/111/a.jpg\nhttps://images.pexels.com/photos/222/b.jpg\n';
    global.fetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(mockText),
    });

    const showStatus = jest.fn();
    const hideStatus = jest.fn();
    const translations = { statusLocalFileNotFound: 'Not found' };

    const result = await loadDefaultImageList({
      currentTranslations: translations,
      showStatus,
      hideStatus,
      localImageUrlsFile: 'test.txt',
    });

    expect(result).toHaveLength(2);
    expect(result[0].imageUrl).toBe('https://images.pexels.com/photos/111/a.jpg');
    expect(result[0].id).toBe('111');
    expect(result[1].id).toBe('222');
    expect(hideStatus).toHaveBeenCalled();
  });

  test('returns empty array on HTTP error', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const showStatus = jest.fn();
    const translations = { statusLocalFileNotFound: 'Not found' };

    const result = await loadDefaultImageList({
      currentTranslations: translations,
      showStatus,
      hideStatus: jest.fn(),
      localImageUrlsFile: 'test.txt',
    });

    expect(result).toEqual([]);
    expect(showStatus).toHaveBeenCalledWith(expect.stringContaining('404'), true, {
      persistent: true,
    });
  });

  test('returns empty array for empty file', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(''),
    });

    const showStatus = jest.fn();
    const translations = { statusLocalFileNotFound: 'Not found' };

    const result = await loadDefaultImageList({
      currentTranslations: translations,
      showStatus,
      hideStatus: jest.fn(),
      localImageUrlsFile: 'test.txt',
    });

    expect(result).toEqual([]);
    expect(showStatus).toHaveBeenCalled();
  });

  test('filters blank lines', async () => {
    const mockText = 'https://images.pexels.com/photos/111/a.jpg\n\n\n  \n';
    global.fetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(mockText),
    });

    const result = await loadDefaultImageList({
      currentTranslations: { statusLocalFileNotFound: 'Not found' },
      showStatus: jest.fn(),
      hideStatus: jest.fn(),
      localImageUrlsFile: 'test.txt',
    });

    expect(result).toHaveLength(1);
  });
});

describe('i18n module', () => {
  let initializeTranslations, getBrowserLanguage;

  beforeAll(async () => {
    ({ initializeTranslations, getBrowserLanguage } = await import('../docs/js/i18n.mjs'));
  });

  beforeEach(() => {
    global.fetch.mockReset();
    const dom = new JSDOM('<!doctype html><html><body></body></html>', {
      url: 'https://example.com/',
      pretendToBeVisual: true,
    });
    global.window = dom.window;
    global.document = dom.window.document;
    global.navigator = { language: 'en-US' };
  });

  afterEach(() => {
    delete global.window;
    delete global.document;
    delete global.navigator;
  });

  test('getBrowserLanguage returns language code', () => {
    global.navigator = { language: 'nl-NL' };
    expect(getBrowserLanguage()).toBe('nl');
  });

  test('initializeTranslations falls back on fetch failure', async () => {
    global.fetch.mockRejectedValueOnce(new Error('network error'));

    const result = await initializeTranslations();
    expect(result.currentTranslations).toBeDefined();
    expect(result.currentTranslations.formTitle).toBeDefined();
  });

  test('initializeTranslations uses loaded translations', async () => {
    const mockTranslations = {
      us: { formTitle: 'Test Title', settingsButtonTitle: 'Test' },
      en: { formTitle: 'English Title', settingsButtonTitle: 'Settings' },
    };
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockTranslations),
    });

    global.navigator = { language: 'en-US' };

    const result = await initializeTranslations();
    expect(result.currentTranslations).toBeDefined();
    expect(result.currentTranslations.formTitle).toBe('English Title');
  });
});
