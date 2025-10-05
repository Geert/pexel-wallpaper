'use strict';

// --- Global Configuration & State Variables ---
// Language and Translations
let currentLang = "us"; // Default language
let currentTranslations = {}; // This will be updated after fetching
let allTranslations = {}; // To store all loaded translations

// Local file and default slideshow
const localImageUrlsFile = "pexels_photo_urls.txt";
let defaultSlideshowIntervalId = null;
let defaultImages = [];
let defaultCurrentIndex = 0;

// Pexels API and Slideshow
const changeInterval = 300000; // Interval for changing wallpaper (5 minutes)
const PHOTO_SIZE_TO_DISPLAY = "original"; // Pexels photo size variant
const PEXELS_BASE_URL = "https://api.pexels.com/v1/";
const PHOTOS_PER_PAGE = 80; // Max photos per Pexels API page request (Pexels API max is 80)
let images = []; // Array to store fetched Pexels photo URLs
let currentIndex = 0; // Current index for Pexels slideshow
let slideshowIntervalId = null; // Interval ID for Pexels slideshow

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// --- DOM Element References ---
// These are assigned when the script parses these lines.
// This assumes the script tag is placed at the end of the <body>
// or that these DOM elements are guaranteed to exist at parse time.
const wallpaperElement = document.getElementById("wallpaper");
const statusOverlay = document.getElementById("status-overlay");
const inputContainer = document.getElementById("input-container");
const settingsButton = document.getElementById("settingsButton");
const apiKeyInput = document.getElementById("apiKeyInput");
const collectionUrlInput = document.getElementById("collectionUrlInput");
const startButton = document.getElementById("startButton");
const inputError = document.getElementById("input-error");
const closeFormButton = document.getElementById("closeFormButton");
const usageIndicator = document.getElementById("usage-indicator");

let settingsUIVisible = false;
const usageSourceState = { key: null, label: "", display: "" };

if (typeof window !== "undefined") {
    window.wallpaperUsageSource = usageSourceState;
}

// --- Functions ---
function getBrowserLanguage() {
    const lang = navigator.language || navigator.userLanguage || 'us';
    return lang.split('-')[0].toLowerCase(); // Return 'en' for 'en-US', 'nl' for 'nl-NL' etc.
}

async function loadTranslations() {
    try {
        const response = await fetch('js/translations.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        allTranslations = await response.json();
        console.log("Translations loaded successfully.");
    } catch (error) {
        console.error("Could not load translations:", error);
        // Fallback to English if translations can't be loaded
        allTranslations = { 
            "us": { 
                // Basic fallback for critical elements if JSON fails completely
                "settingsButtonTitle": "Settings",
                "closeFormButtonTitle": "Close",
                "formTitle": "Wallpapers",
                "apiKeyLabel": "API Key:",
                "collectionUrlLabel": "Collection URL:",
                "startButtonText": "Start",
                "statusLoading": "Loading...",
                "errorBothRequired": "API Key and Collection URL are required.",
                "errorInvalidPexelsUrl": "Invalid Collection URL.",
                "usageLabel": "Using",
                "usagePlashMac": "Plash on macOS",
                "usageLivelyWindows": "Lively on Windows",
                "usageBrowserMac": "Browser on macOS",
                "usageBrowserWindows": "Browser on Windows",
                "usageBrowserOther": "Browser"
                // Add more essential fallbacks if necessary
            }
        };
    }
}

async function setLanguage() {
    await loadTranslations(); // Ensure translations are loaded before setting language
    currentLang = getBrowserLanguage();
    currentTranslations = allTranslations[currentLang] || allTranslations.us; // Fallback to 'us' if detected lang not available
    translatePage();
}

function translatePage() {
    if (!currentTranslations) {
        console.error("Translations not loaded or current language not set.");
        return;
    }
    // Update DOM elements with translated text
    document.title = currentTranslations.formTitle || "Pexel Wallpaper"; // Fallback for title
    
    if (settingsButton) settingsButton.title = currentTranslations.settingsButtonTitle;

    const settingsButtonLabel = document.getElementById('settingsButtonLabel');
    if (settingsButtonLabel) settingsButtonLabel.textContent = currentTranslations.settingsButtonTitle; // Assuming label should also show this

    if (closeFormButton) closeFormButton.title = currentTranslations.closeFormButtonTitle;

    const formTitleElement = document.querySelector('#input-container h2');
    if (formTitleElement) formTitleElement.textContent = currentTranslations.formTitle;

    const instruction1Element = document.querySelector('#input-container ol li:nth-child(1)');
    if (instruction1Element) {
        const plashLink = instruction1Element.querySelector('a');
        instruction1Element.childNodes[0].nodeValue = currentTranslations.instruction1 + ' ';
        if (plashLink) plashLink.textContent = currentTranslations.plashButtonText;
    }

    const instruction2_1Element = document.querySelector('#input-container ol li:nth-child(2)');
    if (instruction2_1Element) {
        const codeElement = instruction2_1Element.querySelector('code');
        instruction2_1Element.childNodes[0].nodeValue = currentTranslations.instruction2_1 + ' ';
        if (codeElement) { /* Current URL is dynamic, no text to translate here via var */ }
    }

    const instruction2_2Element = document.querySelector('#input-container ol li:nth-child(3)');
    if (instruction2_2Element) instruction2_2Element.textContent = currentTranslations.instruction2_2;

    const instruction3Element = document.querySelector('#input-container ol li:nth-child(4)');
    if (instruction3Element) instruction3Element.textContent = currentTranslations.instruction3;

    const instruction4Element = document.querySelector('#input-container ol li:nth-child(5)');
    if (instruction4Element) instruction4Element.textContent = currentTranslations.instruction4;

    const apiKeyLabelElement = document.querySelector('label[for="apiKeyInput"]');
    if (apiKeyLabelElement) {
        apiKeyLabelElement.childNodes[0].nodeValue = currentTranslations.apiKeyLabel + ' ';
        const findLink = apiKeyLabelElement.querySelector('a');
        if (findLink) findLink.textContent = currentTranslations.findApiKeyLink;
    }

    if (apiKeyInput) apiKeyInput.placeholder = currentTranslations.apiKeyPlaceholder;

    const collectionUrlLabelElement = document.querySelector('label[for="collectionUrlInput"]');
    if (collectionUrlLabelElement) collectionUrlLabelElement.textContent = currentTranslations.collectionUrlLabel;

    if (collectionUrlInput) collectionUrlInput.placeholder = currentTranslations.collectionUrlPlaceholder;

    if (startButton) startButton.textContent = currentTranslations.startButtonText;

    // Translate alt texts for wallpaper (dynamic, set elsewhere via updateWallpaperAltText)
    // Translate status messages (dynamic, set via showStatus)
    updateUsageIndicator(true);
    observePlashClass();
}

let plashClassObserver = null;

function applyUsageIndicatorVisibility() {
    if (!usageIndicator) return;

    if (settingsUIVisible && usageIndicator.textContent.trim() !== "") {
        usageIndicator.classList.remove("hidden");
    } else {
        usageIndicator.classList.add("hidden");
    }
}

function detectUsageEnvironmentKey() {
    const ua = (navigator.userAgent || "").toLowerCase();
    const platform = (navigator.platform || "").toLowerCase();

    if (typeof window.livelyPropertyListener === "function" || (window.chrome && window.chrome.webview)) {
        return "usageLivelyWindows";
    }

    if (document.documentElement.classList.contains("is-plash-app") || ua.includes("plash")) {
        return "usagePlashMac";
    }

    if (ua.includes("livelywallpaper")) {
        return "usageLivelyWindows";
    }

    const isMac = platform.includes("mac") || ua.includes("mac os") || ua.includes("macintosh");
    const isWindows = platform.includes("win") || ua.includes("windows");

    if (isMac) {
        return "usageBrowserMac";
    }

    if (isWindows) {
        return "usageBrowserWindows";
    }

    return "usageBrowserOther";
}

function observePlashClass() {
    if (plashClassObserver || !("MutationObserver" in window)) {
        return;
    }

    plashClassObserver = new MutationObserver(() => {
        if (document.documentElement.classList.contains("is-plash-app")) {
            updateUsageIndicator();
            plashClassObserver.disconnect();
            plashClassObserver = null;
        }
    });

    plashClassObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
}

function updateUsageIndicator(forceUpdate = false) {
    if (!usageIndicator || !currentTranslations) return;

    const usageLabelKey = detectUsageEnvironmentKey();
    const labelPrefix = currentTranslations.usageLabel || "";
    const labelValue = currentTranslations[usageLabelKey] || currentTranslations.usageBrowserOther;

    if (!labelValue) return;

    const prefixText = labelPrefix ? `${labelPrefix.trim()}: ` : "";
    const newLabel = `${prefixText}${labelValue}`;

    if (forceUpdate || usageIndicator.textContent !== newLabel) {
        usageIndicator.textContent = newLabel;
    }

    usageSourceState.key = usageLabelKey;
    usageSourceState.label = labelValue;
    usageSourceState.display = newLabel;

    applyUsageIndicatorVisibility();
}

function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Lax";
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

function extractCollectionIdFromUrl(url) {
    try {
        const parsedUrl = new URL(url);
        if (parsedUrl.hostname !== 'www.pexels.com' && parsedUrl.hostname !== 'pexels.com') return null; 
        const pathSegments = parsedUrl.pathname.split('/').filter(segment => segment.length > 0);
        if (pathSegments.length < 2 || pathSegments[0] !== 'collections') return null;
        const slugWithId = pathSegments[1];
        const idParts = slugWithId.split('-');
        if (idParts.length < 2) return null;
        const potentialId = idParts.pop();
        return /^[a-zA-Z0-9]+$/.test(potentialId) ? potentialId : null;
    } catch (e) {
        console.error("Invalid URL for Collection ID extraction:", e);
        return null;
    }
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function cachePhotoUrls(collectionId, urls) {
    const cacheEntry = {
        timestamp: new Date().getTime(),
        urls: urls
    };
    try {
        localStorage.setItem(`pexelCache_${collectionId}`, JSON.stringify(cacheEntry));
        console.log(`Cached URLs for collection ${collectionId}`);
    } catch (e) {
        console.error("Error saving to localStorage:", e);
    }
}

function getCachedPhotoUrls(collectionId) {
    try {
        const cachedItem = localStorage.getItem(`pexelCache_${collectionId}`);
        if (!cachedItem) return null;

        const cacheEntry = JSON.parse(cachedItem);
        const now = new Date().getTime();

        if (now - cacheEntry.timestamp > CACHE_DURATION_MS) {
            console.log(`Cache for collection ${collectionId} expired.`);
            localStorage.removeItem(`pexelCache_${collectionId}`); // Remove expired item
            return null;
        }

        console.log(`Using cached URLs for collection ${collectionId}`);
        return cacheEntry.urls;
    } catch (e) {
        console.error("Error reading from localStorage or parsing JSON:", e);
        return null;
    }
}

async function fetchPhotosFromPexelsAPI(apiKey, collectionId) {
    statusOverlay.classList.remove("hidden");
    statusOverlay.textContent = currentTranslations.statusLoading;
    wallpaperElement.src = ""; 
    wallpaperElement.alt = currentTranslations.wallpaperAltFetching;
    let allPhotoUrls = [];
    let nextPageUrl = `${PEXELS_BASE_URL}collections/${collectionId}?type=photos&per_page=${PHOTOS_PER_PAGE}&page=1`;
    const headers = { "Authorization": apiKey, "User-Agent": "PexelWallpaperDynamic/1.4" }; 

    try {
        while (nextPageUrl) {
            const response = await fetch(nextPageUrl, { headers });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(`Pexels API error: ${response.status} - ${errorData.error || errorData.message || 'Unknown error'}`);
            }
            const data = await response.json();
            const mediaItems = data.media || [];
            mediaItems.forEach(photo => {
                if (photo.type === "Photo" && photo.src && photo.src[PHOTO_SIZE_TO_DISPLAY]) {
                    allPhotoUrls.push(photo.src[PHOTO_SIZE_TO_DISPLAY]);
                }
            });
            nextPageUrl = data.next_page || null;
            if (nextPageUrl) await new Promise(resolve => setTimeout(resolve, 200));
        }
        if (allPhotoUrls.length === 0) {
            statusOverlay.textContent = currentTranslations.statusNoPhotosFound;
            wallpaperElement.alt = currentTranslations.wallpaperAltConfigure;
        } else {
            statusOverlay.textContent = `${currentTranslations.statusLoading} ${allPhotoUrls.length} ${currentTranslations.wallpaperAltWallpaper}. ${currentTranslations.slideshowResumed}...`;
            setTimeout(() => { statusOverlay.classList.add("hidden"); }, 3000);
            cachePhotoUrls(collectionId, allPhotoUrls); // Cache the fetched URLs
        }
        return allPhotoUrls;
    } catch (error) {
        console.error("Error fetching Pexels photos:", error);
        statusOverlay.textContent = `${currentTranslations.statusNoPhotosFound}. ${currentTranslations.statusCheckDetails} ${error.message}.`;
        wallpaperElement.alt = currentTranslations.wallpaperAltConfigure;
        return [];
    }
}

function setWallpaper() {
    if (images.length === 0) return;
    wallpaperElement.src = images[currentIndex];
    wallpaperElement.alt = `${currentTranslations.wallpaperAltWallpaper} ${currentIndex + 1} ${currentTranslations.wallpaperAltOf} ${images.length}`;
    currentIndex = (currentIndex + 1) % images.length;
    if (currentIndex === 0) { 
        shuffleArray(images); 
    }
}
        
function showSettingsForm() {
    if (slideshowIntervalId) {
        clearInterval(slideshowIntervalId);
        slideshowIntervalId = null;
        console.log(currentTranslations.slideshowPaused);
    }
    apiKeyInput.value = getCookie("pexelApiKey") || "";
    collectionUrlInput.value = getCookie("lastPexelCollectionUrl") || "";
    inputError.textContent = "";
    inputContainer.classList.remove("hidden");
    statusOverlay.classList.add("hidden");
    wallpaperElement.alt = currentTranslations.wallpaperAltConfigure;
    document.addEventListener('keydown', handleEscKey); 
}

function hideSettingsForm() { 
    inputContainer.classList.add("hidden");
    document.removeEventListener('keydown', handleEscKey); 
    if (images.length > 0 && !slideshowIntervalId) { 
        slideshowIntervalId = setInterval(setWallpaper, changeInterval);
        console.log(currentTranslations.slideshowResumed);
    }
}

function handleEscKey(event) { 
    if (event.key === "Escape" && !inputContainer.classList.contains("hidden")) {
        hideSettingsForm();
    }
}

async function initializeSlideshow(apiKey, collectionId, collectionFullUrl) {
    stopDefaultSlideshow();
    statusOverlay.classList.remove("hidden");
    statusOverlay.textContent = currentTranslations.statusLoading;
    document.getElementById("current-url-display").textContent = window.location.href; // Display current URL

    let fetchedUrls = getCachedPhotoUrls(collectionId);

    if (!fetchedUrls) {
        fetchedUrls = await fetchPhotosFromPexelsAPI(apiKey, collectionId);
    } else {
        // If using cached URLs, briefly show a status that reflects this
        statusOverlay.textContent = `${fetchedUrls.length} ${currentTranslations.wallpaperAltWallpaper} (cached). ${currentTranslations.slideshowResumed}...`;
        setTimeout(() => { statusOverlay.classList.add("hidden"); }, 1500); 
    }

    if (fetchedUrls && fetchedUrls.length > 0) {
        images = fetchedUrls;
        shuffleArray(images);
        currentIndex = 0;
        setWallpaper();
        if (slideshowIntervalId) clearInterval(slideshowIntervalId);
        slideshowIntervalId = setInterval(setWallpaper, changeInterval);
        hideSettingsForm();
        updateWallpaperAltText(); // Ensure alt text is set correctly from the start
    } else {
        images = []; // Clear images if fetching failed or no photos found
        if (statusOverlay.textContent === currentTranslations.statusLoading) { // Only update if not already showing specific error
            statusOverlay.textContent = currentTranslations.statusNoPhotosFound;
        }
        wallpaperElement.alt = currentTranslations.wallpaperAltConfigure;
        // Do not hide settings form if there was an issue, so user can retry or change settings
    }
}

function clearSettingsAndShowForm() {
    if (slideshowIntervalId) {
        clearInterval(slideshowIntervalId);
        slideshowIntervalId = null;
    }
    setCookie("pexelApiKey", "", -1); 
    setCookie("pexelCollectionId", "", -1); 
    setCookie("lastPexelCollectionUrl", "", -1); 
    
    showSettingsForm(); 
}

function handleConfiguration() {
    const urlParams = new URLSearchParams(window.location.search);
    let apiKey = urlParams.get('apiKey');
    let collectionUrlParam = urlParams.get('collectionUrl');
    let collectionIdToUse = null;

    if (collectionUrlParam) {
        collectionIdToUse = extractCollectionIdFromUrl(collectionUrlParam);
        if (!collectionIdToUse) {
            console.warn("Could not extract Collection ID from URL parameter: " + collectionUrlParam);
        }
    }

    if (apiKey && collectionIdToUse) {
        console.log(`Using API Key from URL and extracted Collection ID: ${collectionIdToUse} from URL: ${collectionUrlParam}`);
        setCookie("pexelApiKey", apiKey, 30); 
        setCookie("pexelCollectionId", collectionIdToUse, 30);
        setCookie("lastPexelCollectionUrl", collectionUrlParam, 30); 
        initializeSlideshow(apiKey, collectionIdToUse, collectionUrlParam);
    } else {
        const cookieApiKey = getCookie("pexelApiKey");
        const cookieCollectionId = getCookie("pexelCollectionId"); 

        if (cookieApiKey && cookieCollectionId) {
            console.log(`Using API Key and Collection ID (${cookieCollectionId}) from cookies.`);
            initializeSlideshow(cookieApiKey, cookieCollectionId, getCookie("lastPexelCollectionUrl"));
        } else {
            console.log("No valid API Key/Collection info found.");
            wallpaperElement.alt = currentTranslations.wallpaperAltConfigure; 
            startDefaultSlideshowFromLocalFile(); 
        }
    }
}

settingsButton.addEventListener('click', showSettingsForm); 
closeFormButton.addEventListener('click', hideSettingsForm); 

startButton.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim();
    const collectionUrl = collectionUrlInput.value.trim();
    inputError.textContent = "";

    if (!apiKey || !collectionUrl) {
        inputError.textContent = currentTranslations.errorBothRequired;
        return;
    }

    const collectionId = extractCollectionIdFromUrl(collectionUrl);
    if (!collectionId) {
        inputError.textContent = currentTranslations.errorInvalidPexelsUrl;
        return;
    }

    console.log(`Using API Key from input and extracted Collection ID: ${collectionId} from URL: ${collectionUrl}`);
    setCookie("pexelApiKey", apiKey, 30);
    setCookie("pexelCollectionId", collectionId, 30); 
    setCookie("lastPexelCollectionUrl", collectionUrl, 30); 
    
    initializeSlideshow(apiKey, collectionId, collectionUrl);
});

async function startDefaultSlideshowFromLocalFile() {
    if (slideshowIntervalId) return; 
    if (defaultSlideshowIntervalId) return; 

    try {
        wallpaperElement.alt = currentTranslations.wallpaperAltLocalLoading;
        const response = await fetch(localImageUrlsFile);
        if (!response.ok) {
            console.error(`Error fetching ${localImageUrlsFile}: ${response.statusText}`);
            wallpaperElement.alt = currentTranslations.wallpaperAltLocalError;
            showStatus(currentTranslations.statusLocalFileNotFound, true);
            return;
        }
        const text = await response.text();
        defaultImages = text.split("\n").filter(url => url.trim() !== "");
        
        if (defaultImages.length === 0) {
            console.error("No image URLs found in the local file.");
            wallpaperElement.alt = currentTranslations.wallpaperAltLocalError;
            showStatus(currentTranslations.statusLocalFileNotFound, true);
            return;
        }
        
        shuffleArray(defaultImages);
        setDefaultWallpaper();
        defaultSlideshowIntervalId = setInterval(setDefaultWallpaper, changeInterval);
        console.log(currentTranslations.defaultSlideshowStarted);
        statusOverlay.classList.add("hidden"); 
    } catch (error) {
        console.error("Failed to load or process local image URLs:", error);
        wallpaperElement.alt = currentTranslations.wallpaperAltLocalError;
        showStatus(currentTranslations.statusLocalFileNotFound + " (" + error.message + ")", true);
    }
}

function setDefaultWallpaper() {
    if (defaultImages.length === 0) return;
    wallpaperElement.src = defaultImages[defaultCurrentIndex];
    wallpaperElement.alt = `${currentTranslations.wallpaperAltWallpaper} (Default) ${defaultCurrentIndex + 1} ${currentTranslations.wallpaperAltOf} ${defaultImages.length}`;
    defaultCurrentIndex = (defaultCurrentIndex + 1) % defaultImages.length;
    if (defaultCurrentIndex === 0) { 
        shuffleArray(defaultImages);
    }
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

document.addEventListener('DOMContentLoaded', async () => {
    await setLanguage(); // Ensure setLanguage completes before other initializations
    handleConfiguration(); 
    updateUsageIndicator(true);
    observePlashClass();

    // --- JavaScript voor muis inactiviteit detectie ---
    let inactivityMouseTimer;
    const settingsButtonForTimer = document.getElementById('settingsButton'); 
    const settingsButtonLabelForTimer = document.getElementById('settingsButtonLabel');
    const hoverTriggerForTimer = document.getElementById('settingsHoverTrigger');

    const showButtonAndLabelWithFeedback = () => {
        if (settingsButtonForTimer && settingsButtonLabelForTimer) {
            settingsButtonForTimer.style.opacity = '1';
            settingsButtonForTimer.style.visibility = 'visible';
            settingsButtonForTimer.style.pointerEvents = 'auto';

            settingsButtonLabelForTimer.style.opacity = '1';
            settingsButtonLabelForTimer.style.visibility = 'visible';
        }
        settingsUIVisible = true;
        applyUsageIndicatorVisibility();
    };

    const hideButtonAndLabelAfterInactivity = () => {
        if (settingsButtonForTimer && settingsButtonLabelForTimer) {
            settingsButtonForTimer.style.opacity = '0';
            settingsButtonForTimer.style.visibility = 'hidden';
            settingsButtonForTimer.style.pointerEvents = 'none';

            settingsButtonLabelForTimer.style.opacity = '0';
            settingsButtonLabelForTimer.style.visibility = 'hidden';
        }
        settingsUIVisible = false;
        applyUsageIndicatorVisibility();
    };

    const resetMouseInactivityTimer = () => {
        clearTimeout(inactivityMouseTimer);
        showButtonAndLabelWithFeedback();
        inactivityMouseTimer = setTimeout(hideButtonAndLabelAfterInactivity, 5000); 
    };

    if (hoverTriggerForTimer) {
        hoverTriggerForTimer.addEventListener('mousemove', resetMouseInactivityTimer);
        // Knop en label zijn initieel verborgen door CSS, dus geen actie hier nodig bij laden.
    } else {
        console.warn('Element settingsHoverTrigger niet gevonden. Muis inactiviteit feature is uitgeschakeld.');
    }
    // --- Einde JavaScript voor muis inactiviteit ---
});
