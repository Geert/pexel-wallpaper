const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const htmlPath = path.resolve(__dirname, '../docs/index.html');
const scriptPath = path.resolve(__dirname, '../docs/js/script.js');
const translationsPath = path.resolve(__dirname, '../docs/js/translations.json');

const rawHtml = fs
  .readFileSync(htmlPath, 'utf-8')
  .replace(/<script[^>]+js\/script\.js[^>]*><\/script>/, '');
const scriptSource = fs.readFileSync(scriptPath, 'utf-8');
const translations = JSON.parse(fs.readFileSync(translationsPath, 'utf-8'));

let dom;
let testWindow;
let doc;

const setGlobalState = (name, value) => {
  const serialized = JSON.stringify(value);
  testWindow.eval(`${name} = ${serialized}`);
};

const getGlobalState = (name) => testWindow.eval(name);

describe('Pexel Wallpaper frontend logic', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    dom = new JSDOM(rawHtml, {
      url: 'https://localhost/',
      pretendToBeVisual: true,
      runScripts: 'dangerously',
    });

    testWindow = dom.window;
    doc = testWindow.document;
    global.HTMLElement = testWindow.HTMLElement;
    global.Node = testWindow.Node;

    global.fetch.mockReset();
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => translations,
      text: async () => '',
    });
    testWindow.fetch = global.fetch;

    Object.defineProperty(testWindow.navigator, 'language', {
      value: 'en-US',
      configurable: true,
    });
    Object.defineProperty(testWindow.navigator, 'userLanguage', {
      value: 'en-US',
      configurable: true,
    });

    const scriptEl = doc.createElement('script');
    scriptEl.textContent = scriptSource;
    doc.body.appendChild(scriptEl);

    testWindow.showStatus = jest.fn();
    testWindow.updateWallpaperAltText = jest.fn();

    testWindow.allTranslations = JSON.parse(JSON.stringify(translations));
    setGlobalState('currentTranslations', { ...translations.us });
    ['pexelApiKey', 'pexelCollectionId', 'lastPexelCollectionUrl'].forEach((name) =>
      testWindow.setCookie(name, '', -1)
    );
    testWindow.localStorage.clear();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
    testWindow.close();
  });

  test('getBrowserLanguage returns lowercased language code', () => {
    Object.defineProperty(testWindow.navigator, 'language', {
      value: 'nl-NL',
      configurable: true,
    });

    expect(testWindow.getBrowserLanguage()).toBe('nl');
  });

  test('setCookie and getCookie round-trip values', () => {
    testWindow.setCookie('pexelTest', 'value123', 1);
    expect(testWindow.getCookie('pexelTest')).toBe('value123');
  });

  test('extractCollectionIdFromUrl parses valid IDs and rejects invalid ones', () => {
    const valid = testWindow.extractCollectionIdFromUrl(
      'https://www.pexels.com/collections/wallpapers-vmnecek/'
    );
    const invalid = testWindow.extractCollectionIdFromUrl('https://example.com/not-a-collection');

    expect(valid).toBe('vmnecek');
    expect(invalid).toBeNull();
  });

  test('shuffleArray preserves elements', () => {
    const arr = [1, 2, 3, 4, 5];
    testWindow.shuffleArray(arr);
    expect(arr.slice().sort()).toEqual([1, 2, 3, 4, 5]);
  });

  test('cachePhotoUrls and getCachedPhotoUrls store and expire data', () => {
    const sample = ['https://example.com/a.jpg'];
    testWindow.cachePhotoUrls('abc', sample);
    expect(testWindow.getCachedPhotoUrls('abc')).toEqual(sample);

    const expiredTimestamp = Date.now() - testWindow.CACHE_DURATION_MS - 1000;
    testWindow.localStorage.setItem(
      'pexelCache_expired',
      JSON.stringify({ timestamp: expiredTimestamp, urls: ['stale'] })
    );
    expect(testWindow.getCachedPhotoUrls('expired')).toBeNull();
  });

  test('loadTranslations loads JSON and falls back on failure', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => translations,
    });

    await testWindow.loadTranslations();
    expect(global.fetch).toHaveBeenCalledWith('js/translations.json');
    expect(testWindow.allTranslations.us.formTitle).toBe(translations.us.formTitle);

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    await testWindow.loadTranslations();
    expect(testWindow.allTranslations.us.formTitle).toBeDefined();
  });

  test('translatePage updates DOM content with translations', () => {
    setGlobalState('currentTranslations', {
      ...translations.us,
      formTitle: 'Custom Title',
      settingsButtonTitle: 'Instellingen',
      closeFormButtonTitle: 'Sluit',
    });

    testWindow.translatePage();

    expect(doc.getElementById('settingsButton').title).toBe('Instellingen');
    expect(doc.querySelector('#input-container h2').textContent).toBe('Custom Title');
  });

  test('fetchPhotosFromPexelsAPI returns URLs and caches them', async () => {
    const apiResponse = {
      media: [
        { type: 'Photo', src: { original: 'https://images/1.jpg' } },
        { type: 'Photo', src: { original: 'https://images/2.jpg' } },
      ],
      next_page: null,
    };
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => apiResponse,
    });

    const urls = await testWindow.fetchPhotosFromPexelsAPI('api-key', 'collection1');

    expect(urls).toEqual([
      'https://images/1.jpg',
      'https://images/2.jpg',
    ]);
    expect(testWindow.localStorage.getItem('pexelCache_collection1')).toBeTruthy();
  });

  test('fetchPhotosFromPexelsAPI handles errors gracefully', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Unauthorized' }),
    });

    const urls = await testWindow.fetchPhotosFromPexelsAPI('bad-key', 'collection1');

    expect(urls).toEqual([]);
    expect(doc.getElementById('status-overlay').textContent).toContain('No photos');
  });

  test('setWallpaper rotates images and updates alt text', () => {
    setGlobalState('images', ['img1', 'img2']);
    setGlobalState('currentIndex', 0);

    testWindow.setWallpaper();
    const wallpaper = doc.getElementById('wallpaper');
    expect(wallpaper.src).toContain('img1');
    expect(getGlobalState('currentIndex')).toBe(1);
    expect(wallpaper.getAttribute('alt')).toContain('Wallpaper');
  });

  test('showSettingsForm reveals form and pre-fills values from cookies', () => {
    testWindow.setCookie('pexelApiKey', 'secret', 1);
    testWindow.setCookie(
      'lastPexelCollectionUrl',
      'https://www.pexels.com/collections/test-abc/',
      1
    );

    testWindow.showSettingsForm();

    expect(doc.getElementById('input-container').classList.contains('hidden')).toBe(false);
    expect(doc.getElementById('apiKeyInput').value).toBe('secret');
  });

  test('hideSettingsForm hides the form and resumes slideshow when images exist', () => {
    setGlobalState('images', ['img']);
    setGlobalState('slideshowIntervalId', null);

    testWindow.showSettingsForm();
    testWindow.hideSettingsForm();

    expect(doc.getElementById('input-container').classList.contains('hidden')).toBe(true);
    expect(getGlobalState('slideshowIntervalId')).not.toBeNull();
  });

  test('handleEscKey closes the form on Escape', () => {
    testWindow.showSettingsForm();
    testWindow.handleEscKey({ key: 'Escape' });

    expect(doc.getElementById('input-container').classList.contains('hidden')).toBe(true);
  });

  test('initializeSlideshow uses cached URLs when available', async () => {
    const cachedUrls = ['cached1', 'cached2'];
    jest.spyOn(testWindow, 'getCachedPhotoUrls').mockReturnValue(cachedUrls);
    jest.spyOn(testWindow, 'fetchPhotosFromPexelsAPI').mockResolvedValue([]);

    await testWindow.initializeSlideshow('key', 'collection1', 'https://example.com');

    expect(getGlobalState('images')).toEqual(expect.arrayContaining(cachedUrls));
    expect(getGlobalState('slideshowIntervalId')).not.toBeNull();
  });

  test('initializeSlideshow fetches URLs when cache empty', async () => {
    jest.spyOn(testWindow, 'getCachedPhotoUrls').mockReturnValue(null);
    jest.spyOn(testWindow, 'fetchPhotosFromPexelsAPI').mockResolvedValue(['remote']);

    await testWindow.initializeSlideshow('key', 'collection1', 'https://example.com');

    expect(getGlobalState('images')).toEqual(['remote']);
  });

  test('clearSettingsAndShowForm clears cookies and shows form', () => {
    testWindow.setCookie('pexelApiKey', 'secret', 30);
    testWindow.clearSettingsAndShowForm();

    expect(testWindow.getCookie('pexelApiKey')).toBeNull();
    expect(doc.getElementById('input-container').classList.contains('hidden')).toBe(false);
  });

  test('handleConfiguration respects query parameters', () => {
    testWindow.history.replaceState(
      {},
      '',
      'https://localhost/?apiKey=myKey&collectionUrl=https://www.pexels.com/collections/wallpapers-vmnecek/'
    );
    jest.spyOn(testWindow, 'initializeSlideshow').mockResolvedValue();

    testWindow.handleConfiguration();

    expect(testWindow.initializeSlideshow).toHaveBeenCalledWith(
      'myKey',
      'vmnecek',
      'https://www.pexels.com/collections/wallpapers-vmnecek/'
    );
  });

  test('handleConfiguration falls back to cookies when no params', () => {
    testWindow.history.replaceState({}, '', 'https://localhost/');
    testWindow.setCookie('pexelApiKey', 'cookieKey', 30);
    testWindow.setCookie('pexelCollectionId', 'cookieCollection', 30);
    jest.spyOn(testWindow, 'initializeSlideshow').mockResolvedValue();

    testWindow.handleConfiguration();

    expect(testWindow.initializeSlideshow).toHaveBeenCalledWith(
      'cookieKey',
      'cookieCollection',
      null
    );
  });

  test('start button validates inputs and starts slideshow', () => {
    const startButton = doc.getElementById('startButton');
    jest.spyOn(testWindow, 'initializeSlideshow').mockResolvedValue();

    startButton.click();
    expect(doc.getElementById('input-error').textContent).toContain(
      'Both API Key and Collection URL are required.'
    );

    doc.getElementById('apiKeyInput').value = 'abc123';
    doc.getElementById('collectionUrlInput').value =
      'https://www.pexels.com/collections/wallpapers-vmnecek/';

    startButton.click();
    expect(testWindow.initializeSlideshow).toHaveBeenLastCalledWith(
      'abc123',
      'vmnecek',
      'https://www.pexels.com/collections/wallpapers-vmnecek/'
    );
  });

  test('startDefaultSlideshowFromLocalFile loads fallback URLs', async () => {
    const textResponse = 'https://example.com/a.jpg\nhttps://example.com/b.jpg';
    global.fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => textResponse,
    });

    await testWindow.startDefaultSlideshowFromLocalFile();

    expect(getGlobalState('defaultImages').length).toBe(2);
    expect(getGlobalState('defaultSlideshowIntervalId')).not.toBeNull();
  });

  test('setDefaultWallpaper rotates default images', () => {
    setGlobalState('defaultImages', ['d1', 'd2']);
    setGlobalState('defaultCurrentIndex', 0);

    testWindow.setDefaultWallpaper();
    expect(doc.getElementById('wallpaper').getAttribute('src')).toBe('d1');
  });

  test('stopDefaultSlideshow clears interval and resets state', () => {
    testWindow.eval(
      'defaultImages = ["d"]; defaultSlideshowIntervalId = setInterval(() => {}, 1000); defaultCurrentIndex = 1;'
    );

    testWindow.stopDefaultSlideshow();

    expect(getGlobalState('defaultSlideshowIntervalId')).toBeNull();
    expect(getGlobalState('defaultImages').length).toBe(0);
    expect(getGlobalState('defaultCurrentIndex')).toBe(0);
  });
});
