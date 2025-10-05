import {
  LOCAL_IMAGE_URLS_FILE,
  CHANGE_INTERVAL_MS,
  STORAGE_KEYS,
  PEXELS_PAGE_BASE_URL,
} from './config.mjs';
import {
  setStoredValue,
  getStoredValue,
  clearStoredValue,
  getDisplayUrl,
  sanitizeUrlInAddressBar,
} from './storage.mjs';
import { initStatusOverlay, showStatus, hideStatus } from './status.mjs';
import { initializeTranslations } from './i18n.mjs';
import {
  fetchPhotosFromPexelsAPI,
  loadDefaultImageList,
  getCachedRemoteUrls,
} from './slideshow.mjs';

document.documentElement.classList.add('js-enabled');

// --- DOM Element References ---
const wallpaperElement = document.getElementById('wallpaper');
const statusOverlay = document.getElementById('status-overlay');
const inputContainer = document.getElementById('input-container');
const settingsButton = document.getElementById('settingsButton');
const settingsButtonLabel = document.getElementById('settingsButtonLabel');
const apiKeyInput = document.getElementById('apiKeyInput');
const collectionUrlInput = document.getElementById('collectionUrlInput');
const startButton = document.getElementById('startButton');
const resetButton = document.getElementById('resetButton');
const inputError = document.getElementById('input-error');
const closeFormButton = document.getElementById('closeFormButton');
const usageIndicator = document.getElementById('usage-indicator');

initStatusOverlay(statusOverlay);

// --- Global State ---
let currentTranslations = {};

let images = [];
let currentIndex = 0;
let slideshowIntervalId = null;

let defaultImages = [];
let defaultCurrentIndex = 0;
let defaultSlideshowIntervalId = null;

const usageSourceState = { key: null, label: '', display: '' };
const SETUP_SEEN_PREFIX = 'pexelWallpaperSetupSeen_';
const firstVisitHandledKeys = new Set();
let settingsUIVisible = false;
let plashClassObserver = null;
let currentPhotoAttribution = null;

if (typeof window !== 'undefined') {
  window.wallpaperUsageSource = usageSourceState;
}

function extractPexelsIdFromText(text) {
  if (typeof text !== 'string') return null;
  const slug = text.trim().replace(/\/$/, '');
  const photoSlugMatch = slug.match(/\/photo\/(?:[^/]*-)?(\d+)(?:\/)?$/i);
  if (photoSlugMatch && photoSlugMatch[1]) {
    return photoSlugMatch[1];
  }

  const imagePathMatch = slug.match(/\/photos\/(\d+)(?:\/|$)/i);
  if (imagePathMatch && imagePathMatch[1]) {
    return imagePathMatch[1];
  }

  return null;
}

function updateCurrentUrlDisplay() {
  const urlDisplay = document.getElementById('current-url-display');
  if (!urlDisplay) return;

  const currentUrl = getDisplayUrl();
  if (urlDisplay.textContent !== currentUrl) {
    urlDisplay.textContent = currentUrl;
  }
}

function applyUsageIndicatorVisibility() {
  if (!usageIndicator) return;

  if (settingsUIVisible && usageIndicator.textContent.trim() !== '') {
    usageIndicator.classList.remove('hidden');
  } else {
    usageIndicator.classList.add('hidden');
  }
}

function normalizePhotoEntry(entry) {
  if (!entry) return null;
  if (typeof entry === 'string') {
    const trimmed = entry.trim();
    if (!trimmed) return null;
    const derivedId = extractPexelsIdFromText(trimmed);
    return {
      imageUrl: trimmed,
      pageUrl: derivedId
        ? `${PEXELS_PAGE_BASE_URL}${derivedId}/`
        : trimmed.includes('pexels.com')
          ? trimmed
          : null,
      photographerUrl: null,
    };
  }

  if (typeof entry === 'object') {
    const imageUrl = entry.imageUrl || entry.src || entry.url;
    if (!imageUrl) return null;
    const derivedId =
      entry.id ||
      extractPexelsIdFromText(entry.pageUrl || '') ||
      extractPexelsIdFromText(imageUrl || '');
    return {
      imageUrl,
      pageUrl: entry.pageUrl || (derivedId ? `${PEXELS_PAGE_BASE_URL}${derivedId}/` : null),
      photographerUrl: entry.photographerUrl || null,
    };
  }

  return null;
}

function normalizePhotoEntryList(list) {
  return (Array.isArray(list) ? list : []).map((item) => normalizePhotoEntry(item)).filter(Boolean);
}

function detectUsageEnvironmentKey() {
  const ua = (navigator.userAgent || '').toLowerCase();
  const platform = (navigator.platform || '').toLowerCase();

  if (
    typeof window.livelyPropertyListener === 'function' ||
    (window.chrome && window.chrome.webview)
  ) {
    return 'usageLivelyWindows';
  }

  if (document.documentElement.classList.contains('is-plash-app') || ua.includes('plash')) {
    return 'usagePlashMac';
  }

  if (ua.includes('livelywallpaper')) {
    return 'usageLivelyWindows';
  }

  const isMac = platform.includes('mac') || ua.includes('mac os') || ua.includes('macintosh');
  const isWindows = platform.includes('win') || ua.includes('windows');

  if (isMac) {
    return 'usageBrowserMac';
  }

  if (isWindows) {
    return 'usageBrowserWindows';
  }

  return 'usageBrowserOther';
}

function observePlashClass() {
  if (plashClassObserver || !('MutationObserver' in window)) {
    return;
  }

  plashClassObserver = new MutationObserver(() => {
    if (document.documentElement.classList.contains('is-plash-app')) {
      updateUsageIndicator();
      plashClassObserver.disconnect();
      plashClassObserver = null;
    }
  });

  plashClassObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });
}

function mapUsageKeyToInstructionGroup(usageKey) {
  switch (usageKey) {
    case 'usagePlashMac':
    case 'usageBrowserMac':
      return 'mac';
    case 'usageLivelyWindows':
    case 'usageBrowserWindows':
      return 'windows';
    default:
      return 'other';
  }
}

function applyInstructionsForUsage() {
  if (!currentTranslations) return;

  const instructionsByUsage = currentTranslations.instructions;
  if (!instructionsByUsage) return;

  const usageKey = usageSourceState.key || detectUsageEnvironmentKey();
  const instructionGroupKey = mapUsageKeyToInstructionGroup(usageKey);
  const instructions =
    instructionsByUsage[instructionGroupKey] ||
    instructionsByUsage.other ||
    instructionsByUsage.mac;
  if (!instructions) return;

  const step1Element = document.querySelector('#input-container ol li:nth-child(1)');
  if (step1Element) {
    const existingLink = step1Element.querySelector('a') || document.createElement('a');
    step1Element.textContent = '';

    if (instructions.step1Prefix) {
      step1Element.appendChild(document.createTextNode(`${instructions.step1Prefix} `));
    }

    existingLink.textContent = instructions.step1LinkText || '';
    if (instructions.step1LinkHref) {
      existingLink.href = instructions.step1LinkHref;
    }
    existingLink.target = instructions.step1LinkTarget || '_blank';
    existingLink.rel = instructions.step1LinkRel || 'noopener noreferrer';

    if (instructions.step1LinkClass) {
      existingLink.className = instructions.step1LinkClass;
    } else if (!existingLink.className) {
      existingLink.className = 'plash-button';
    }

    step1Element.appendChild(existingLink);
  }

  const step2Element = document.querySelector('#input-container ol li:nth-child(2)');
  const urlCodeElement = document.getElementById('current-url-display');
  if (step2Element && urlCodeElement) {
    step2Element.textContent = '';
    if (instructions.step2Prefix) {
      step2Element.appendChild(document.createTextNode(`${instructions.step2Prefix} `));
    }
    updateCurrentUrlDisplay();
    step2Element.appendChild(urlCodeElement);
    if (instructions.step2Suffix) {
      step2Element.appendChild(document.createTextNode(` ${instructions.step2Suffix}`));
    }
  }

  const step3Element = document.querySelector('#input-container ol li:nth-child(3)');
  if (step3Element && instructions.step3) {
    step3Element.textContent = instructions.step3;
  }

  const step4Element = document.querySelector('#input-container ol li:nth-child(4)');
  if (step4Element) {
    step4Element.textContent = '';
    if (instructions.step4LinkHref) {
      if (instructions.step4Prefix) {
        step4Element.appendChild(document.createTextNode(instructions.step4Prefix));
      }
      const link = document.createElement('a');
      link.href = instructions.step4LinkHref;
      link.textContent = instructions.step4LinkText || instructions.step4LinkHref;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      if (instructions.step4LinkClass) {
        link.className = instructions.step4LinkClass;
      }
      step4Element.appendChild(link);
      if (instructions.step4Suffix) {
        step4Element.appendChild(document.createTextNode(instructions.step4Suffix));
      }
    } else if (instructions.step4) {
      step4Element.textContent = instructions.step4;
    }
  }

  const step5Element = document.querySelector('#input-container ol li:nth-child(5)');
  if (step5Element && instructions.step5) {
    step5Element.textContent = instructions.step5;
  }
}

function updateUsageIndicator(forceUpdate = false) {
  if (!usageIndicator) return;

  const usageKey = detectUsageEnvironmentKey();
  const linkLabel = 'Photos provided by Pexels';
  const fallbackLink = 'https://www.pexels.com';
  const linkTarget =
    (currentPhotoAttribution &&
      (currentPhotoAttribution.pageUrl || currentPhotoAttribution.imageUrl)) ||
    fallbackLink;
  const currentHref = usageIndicator.getAttribute('href') || '';

  if (
    !forceUpdate &&
    usageIndicator.textContent === linkLabel &&
    currentHref === linkTarget &&
    !usageIndicator.classList.contains('hidden')
  ) {
    usageSourceState.key = usageKey;
  } else {
    usageIndicator.textContent = linkLabel;
    usageIndicator.setAttribute('href', linkTarget);
    usageIndicator.setAttribute('target', '_blank');
    usageIndicator.setAttribute('rel', 'noopener noreferrer');

    usageSourceState.key = usageKey;
    usageSourceState.label = linkLabel;
    usageSourceState.display = linkLabel;
  }

  applyInstructionsForUsage();
  handleFirstVisitFlow();
  applyUsageIndicatorVisibility();
}

function updateWallpaperAltText() {
  if (!wallpaperElement || !currentTranslations) {
    return;
  }

  if (images.length > 0) {
    const displayedIndex = currentIndex === 0 ? images.length : currentIndex;
    wallpaperElement.alt = `${currentTranslations.wallpaperAltWallpaper} ${displayedIndex} ${currentTranslations.wallpaperAltOf} ${images.length}`;
    return;
  }

  if (defaultImages.length > 0) {
    const displayedIndex = defaultCurrentIndex === 0 ? defaultImages.length : defaultCurrentIndex;
    wallpaperElement.alt = `${currentTranslations.wallpaperAltWallpaper} (Default) ${displayedIndex} ${currentTranslations.wallpaperAltOf} ${defaultImages.length}`;
    return;
  }

  wallpaperElement.alt =
    currentTranslations.wallpaperAltConfigure || 'Configure API Key and Collection URL.';
}

function getSetupStorageKey(usageKey) {
  return `${SETUP_SEEN_PREFIX}${usageKey || 'unknown'}`;
}

function handleFirstVisitFlow() {
  const usageKey = usageSourceState.key;
  if (!usageKey || firstVisitHandledKeys.has(usageKey)) {
    return;
  }

  firstVisitHandledKeys.add(usageKey);

  const storageKey = getSetupStorageKey(usageKey);
  let hasSeenSetup = false;

  try {
    hasSeenSetup = localStorage.getItem(storageKey) === 'true';
  } catch (error) {
    console.warn('Unable to access localStorage for setup tracking:', error);
  }

  if (!hasSeenSetup) {
    showSettingsForm();
    try {
      localStorage.setItem(storageKey, 'true');
    } catch (error) {
      console.warn('Unable to persist setup tracking flag:', error);
    }
  }
}

function showSettingsForm() {
  if (slideshowIntervalId) {
    clearInterval(slideshowIntervalId);
    slideshowIntervalId = null;
    console.log(currentTranslations.slideshowPaused);
  }
  apiKeyInput.value = getStoredValue(STORAGE_KEYS.apiKey) || '';
  collectionUrlInput.value = getStoredValue(STORAGE_KEYS.lastCollectionUrl) || '';
  inputError.textContent = '';
  inputContainer.classList.remove('hidden');
  hideStatus();
  wallpaperElement.alt = currentTranslations.wallpaperAltConfigure;
  document.addEventListener('keydown', handleEscKey);
}

function hideSettingsForm() {
  inputContainer.classList.add('hidden');
  document.removeEventListener('keydown', handleEscKey);
  if (images.length > 0 && !slideshowIntervalId) {
    slideshowIntervalId = setInterval(setWallpaper, CHANGE_INTERVAL_MS);
    console.log(currentTranslations.slideshowResumed);
  }
}

function handleEscKey(event) {
  if (event.key === 'Escape' && !inputContainer.classList.contains('hidden')) {
    hideSettingsForm();
  }
}

function setWallpaper() {
  if (images.length === 0) return;
  const entry = normalizePhotoEntry(images[currentIndex]);
  if (!entry) return;

  wallpaperElement.src = entry.imageUrl;
  wallpaperElement.alt = `${currentTranslations.wallpaperAltWallpaper} ${currentIndex + 1} ${currentTranslations.wallpaperAltOf} ${images.length}`;
  currentPhotoAttribution = entry;
  currentIndex = (currentIndex + 1) % images.length;
  if (currentIndex === 0) {
    shuffleArray(images);
  }
  updateUsageIndicator(true);
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

async function initializeSlideshow(apiKey, collectionId) {
  stopDefaultSlideshow();
  updateCurrentUrlDisplay();

  let fetchedUrls = getCachedRemoteUrls(collectionId);

  if (!fetchedUrls) {
    fetchedUrls = await fetchPhotosFromPexelsAPI({
      apiKey,
      collectionId,
      currentTranslations,
      wallpaperElement,
      showStatus,
    });
  } else {
    const cachedMessage = `${fetchedUrls.length} ${currentTranslations.wallpaperAltWallpaper} (cached). ${currentTranslations.slideshowResumed}...`;
    showStatus(cachedMessage, false, { duration: 1500 });
  }

  const normalizedEntries = normalizePhotoEntryList(fetchedUrls);

  if (normalizedEntries.length > 0) {
    images = normalizedEntries;
    shuffleArray(images);
    currentIndex = 0;
    setWallpaper();
    if (slideshowIntervalId) clearInterval(slideshowIntervalId);
    slideshowIntervalId = setInterval(setWallpaper, CHANGE_INTERVAL_MS);
    hideSettingsForm();
    updateWallpaperAltText();
  } else {
    images = [];
    currentPhotoAttribution = null;
    showStatus(currentTranslations.statusNoPhotosFound, true, { persistent: true });
    wallpaperElement.alt = currentTranslations.wallpaperAltConfigure;
    updateUsageIndicator(true);
  }
}

async function startDefaultSlideshowFromLocalFile() {
  if (slideshowIntervalId) return;
  if (defaultSlideshowIntervalId) return;

  try {
    wallpaperElement.alt = currentTranslations.wallpaperAltLocalLoading;
    const loadedImages = await loadDefaultImageList({
      currentTranslations,
      showStatus,
      hideStatus,
      localImageUrlsFile: LOCAL_IMAGE_URLS_FILE,
    });

    if (loadedImages.length === 0) {
      wallpaperElement.alt = currentTranslations.wallpaperAltLocalError;
      currentPhotoAttribution = null;
      updateUsageIndicator(true);
      return;
    }

    defaultImages = normalizePhotoEntryList(loadedImages);
    shuffleArray(defaultImages);
    setDefaultWallpaper();
    defaultSlideshowIntervalId = setInterval(setDefaultWallpaper, CHANGE_INTERVAL_MS);
    console.log(currentTranslations.defaultSlideshowStarted);
    hideStatus();
  } catch (error) {
    console.error('Failed to load or process local image URLs:', error);
    wallpaperElement.alt = currentTranslations.wallpaperAltLocalError;
    showStatus(`${currentTranslations.statusLocalFileNotFound} (${error.message})`, true, {
      persistent: true,
    });
    currentPhotoAttribution = null;
    updateUsageIndicator(true);
  }
}

function setDefaultWallpaper() {
  if (defaultImages.length === 0) return;
  const entry = normalizePhotoEntry(defaultImages[defaultCurrentIndex]);
  if (!entry) return;

  wallpaperElement.src = entry.imageUrl;
  wallpaperElement.alt = `${currentTranslations.wallpaperAltWallpaper} (Default) ${defaultCurrentIndex + 1} ${currentTranslations.wallpaperAltOf} ${defaultImages.length}`;
  currentPhotoAttribution = entry;
  defaultCurrentIndex = (defaultCurrentIndex + 1) % defaultImages.length;
  if (defaultCurrentIndex === 0) {
    shuffleArray(defaultImages);
  }
  updateUsageIndicator(true);
}

function stopDefaultSlideshow() {
  if (defaultSlideshowIntervalId) {
    clearInterval(defaultSlideshowIntervalId);
    defaultSlideshowIntervalId = null;
    defaultImages = [];
    defaultCurrentIndex = 0;
    console.log(currentTranslations.defaultSlideshowStopped);
  }
}

function clearSettingsAndShowForm() {
  if (slideshowIntervalId) {
    clearInterval(slideshowIntervalId);
    slideshowIntervalId = null;
  }
  clearStoredValue(STORAGE_KEYS.apiKey);
  clearStoredValue(STORAGE_KEYS.collectionId);
  clearStoredValue(STORAGE_KEYS.lastCollectionUrl);
  currentPhotoAttribution = null;
  updateUsageIndicator(true);
  showSettingsForm();
}

function getPexelsConfigFromInputs() {
  return {
    apiKey: apiKeyInput.value.trim(),
    collectionUrl: collectionUrlInput.value.trim(),
  };
}

function handleConfiguration() {
  const urlParams = new URLSearchParams(window.location.search);
  let apiKey = urlParams.get('apiKey');
  let collectionUrlParam = urlParams.get('collectionUrl');
  let collectionIdToUse = null;

  if (collectionUrlParam) {
    collectionIdToUse = extractCollectionIdFromUrl(collectionUrlParam);
    if (!collectionIdToUse) {
      console.warn('Could not extract Collection ID from URL parameter:', collectionUrlParam);
    }
  }

  if (apiKey && collectionIdToUse) {
    console.log(
      `Using API Key from URL and extracted Collection ID: ${collectionIdToUse} from URL: ${collectionUrlParam}`
    );
    setStoredValue(STORAGE_KEYS.apiKey, apiKey);
    setStoredValue(STORAGE_KEYS.collectionId, collectionIdToUse);
    setStoredValue(STORAGE_KEYS.lastCollectionUrl, collectionUrlParam);
    initializeSlideshow(apiKey, collectionIdToUse);
  } else {
    const storedApiKey = getStoredValue(STORAGE_KEYS.apiKey);
    const storedCollectionId = getStoredValue(STORAGE_KEYS.collectionId);

    if (storedApiKey && storedCollectionId) {
      console.log(`Using API Key and Collection ID (${storedCollectionId}) from stored settings.`);
      initializeSlideshow(storedApiKey, storedCollectionId);
    } else {
      console.log('No valid API Key/Collection info found.');
      wallpaperElement.alt = currentTranslations.wallpaperAltConfigure;
      startDefaultSlideshowFromLocalFile();
    }
  }

  sanitizeUrlInAddressBar();
  updateCurrentUrlDisplay();
}

function extractCollectionIdFromUrl(url) {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname !== 'www.pexels.com' && parsedUrl.hostname !== 'pexels.com') return null;
    const pathSegments = parsedUrl.pathname.split('/').filter((segment) => segment.length > 0);
    if (pathSegments.length < 2 || pathSegments[0] !== 'collections') return null;
    const slugWithId = pathSegments[1];
    const idParts = slugWithId.split('-');
    if (idParts.length < 2) return null;
    const potentialId = idParts.pop();
    return /^[a-zA-Z0-9]+$/.test(potentialId) ? potentialId : null;
  } catch (error) {
    console.error('Invalid URL for Collection ID extraction:', error);
    return null;
  }
}

function initSettingsButtonAutoHide() {
  let inactivityMouseTimer;

  const showButtonAndLabel = () => {
    if (settingsButton) {
      settingsButton.classList.add('settings-visible');
    }
    if (settingsButtonLabel) {
      settingsButtonLabel.classList.add('settings-visible');
    }
    settingsUIVisible = true;
    applyUsageIndicatorVisibility();
  };

  const hideButtonAndLabel = () => {
    if (settingsButton && document.activeElement === settingsButton) {
      return;
    }
    if (settingsButton) {
      settingsButton.classList.remove('settings-visible');
    }
    if (settingsButtonLabel) {
      settingsButtonLabel.classList.remove('settings-visible');
    }
    settingsUIVisible = false;
    applyUsageIndicatorVisibility();
  };

  const queueHideAfterDelay = () => {
    clearTimeout(inactivityMouseTimer);
    inactivityMouseTimer = setTimeout(hideButtonAndLabel, 5000);
  };

  const resetMouseInactivityTimer = () => {
    showButtonAndLabel();
    queueHideAfterDelay();
  };

  if (settingsButton) {
    settingsButton.addEventListener('focus', () => {
      showButtonAndLabel();
      clearTimeout(inactivityMouseTimer);
    });
    settingsButton.addEventListener('blur', queueHideAfterDelay);
    settingsButton.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        showButtonAndLabel();
      }
    });
  }

  document.addEventListener('pointermove', resetMouseInactivityTimer, { passive: true });
  document.addEventListener('touchstart', resetMouseInactivityTimer, { passive: true });
  document.addEventListener(
    'keydown',
    (event) => {
      if (['Tab', 'Shift', 'Enter', ' '].includes(event.key)) {
        resetMouseInactivityTimer();
      }
    },
    { passive: false }
  );

  resetMouseInactivityTimer();
}

function attachEventListeners() {
  settingsButton.addEventListener('click', showSettingsForm);
  closeFormButton.addEventListener('click', hideSettingsForm);

  startButton.addEventListener('click', () => {
    const { apiKey, collectionUrl } = getPexelsConfigFromInputs();
    inputError.textContent = '';

    if (!apiKey || !collectionUrl) {
      inputError.textContent = currentTranslations.errorBothRequired;
      return;
    }

    const collectionId = extractCollectionIdFromUrl(collectionUrl);
    if (!collectionId) {
      inputError.textContent = currentTranslations.errorInvalidPexelsUrl;
      return;
    }

    console.log(
      `Using API Key from input and extracted Collection ID: ${collectionId} from URL: ${collectionUrl}`
    );
    setStoredValue(STORAGE_KEYS.apiKey, apiKey);
    setStoredValue(STORAGE_KEYS.collectionId, collectionId);
    setStoredValue(STORAGE_KEYS.lastCollectionUrl, collectionUrl);

    initializeSlideshow(apiKey, collectionId);
  });

  if (resetButton) {
    resetButton.addEventListener('click', () => {
      clearSettingsAndShowForm();
      apiKeyInput.value = '';
      collectionUrlInput.value = '';
      inputError.textContent = '';
      showStatus(currentTranslations.statusSettingsCleared, false, { duration: 4000 });
    });
  }
}

async function initializeApp() {
  const { currentTranslations: translations } = await initializeTranslations();
  currentTranslations = translations;

  translatePage();
  handleConfiguration();
  updateUsageIndicator(true);
  observePlashClass();
  initSettingsButtonAutoHide();
}

function translatePage() {
  if (!currentTranslations) {
    console.error('Translations not loaded or current language not set.');
    return;
  }

  document.title = currentTranslations.formTitle || 'Pexel Wallpaper';

  if (settingsButton) settingsButton.title = currentTranslations.settingsButtonTitle;
  if (settingsButtonLabel)
    settingsButtonLabel.textContent = currentTranslations.settingsButtonTitle;
  if (closeFormButton) closeFormButton.title = currentTranslations.closeFormButtonTitle;

  const formTitleElement = document.querySelector('#input-container h2');
  if (formTitleElement) formTitleElement.textContent = currentTranslations.formTitle;

  const apiKeyLabelElement = document.querySelector('label[for="apiKeyInput"]');
  if (apiKeyLabelElement) {
    apiKeyLabelElement.childNodes[0].nodeValue = `${currentTranslations.apiKeyLabel} `;
    const findLink = apiKeyLabelElement.querySelector('a');
    if (findLink) findLink.textContent = currentTranslations.findApiKeyLink;
  }

  if (apiKeyInput) apiKeyInput.placeholder = currentTranslations.apiKeyPlaceholder;

  const collectionUrlLabelElement = document.querySelector('label[for="collectionUrlInput"]');
  if (collectionUrlLabelElement)
    collectionUrlLabelElement.textContent = currentTranslations.collectionUrlLabel;

  if (collectionUrlInput)
    collectionUrlInput.placeholder = currentTranslations.collectionUrlPlaceholder;

  if (startButton) startButton.textContent = currentTranslations.startButtonText;
  if (resetButton) resetButton.textContent = currentTranslations.resetButtonText;

  updateCurrentUrlDisplay();
  applyInstructionsForUsage();
  updateUsageIndicator(true);
}

document.addEventListener('DOMContentLoaded', async () => {
  attachEventListeners();
  await initializeApp();
});

export { extractCollectionIdFromUrl };
