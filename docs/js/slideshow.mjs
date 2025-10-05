import {
  PEXELS_BASE_URL,
  PHOTOS_PER_PAGE,
  PHOTO_SIZE_TO_DISPLAY,
  FETCH_USER_AGENT,
  LOCAL_IMAGE_URLS_FILE,
  PEXELS_PAGE_BASE_URL,
} from './config.mjs';
import { cachePhotoUrls, getCachedPhotoUrls } from './storage.mjs';

function extractPexelsId(text) {
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

function buildPexelsPageUrlFromPhoto(photo) {
  if (photo && photo.id) {
    return `${PEXELS_PAGE_BASE_URL}${photo.id}/`;
  }
  if (photo && typeof photo.url === 'string') {
    const derivedId = extractPexelsId(photo.url);
    if (derivedId) {
      return `${PEXELS_PAGE_BASE_URL}${derivedId}/`;
    }
  }

  if (photo && photo.src) {
    const derivedId = extractPexelsId(photo.src[PHOTO_SIZE_TO_DISPLAY] || '');
    if (derivedId) {
      return `${PEXELS_PAGE_BASE_URL}${derivedId}/`;
    }
  }
  return null;
}

function buildHeaders(apiKey) {
  return {
    Authorization: apiKey,
    'User-Agent': FETCH_USER_AGENT,
  };
}

function getPexelsErrorMessage(translations, error) {
  if (!translations) {
    return `Error fetching wallpapers${error && error.status ? ` (HTTP ${error.status})` : ''}.`;
  }

  if (error && error.isNetworkError) {
    return (
      translations.statusErrorNetwork ||
      'Network error while fetching wallpapers. Please check your connection and retry.'
    );
  }

  const status = error && typeof error.status === 'number' ? error.status : null;
  if (status === 401) {
    return translations.statusError401;
  }
  if (status === 429) {
    return translations.statusError429;
  }

  if (status) {
    const template =
      translations.statusErrorGeneric ||
      'Something went wrong (HTTP {status}). Please try again later.';
    return template.replace('{status}', status);
  }

  return translations.statusNoPhotosFound;
}

export async function fetchPhotosFromPexelsAPI({
  apiKey,
  collectionId,
  currentTranslations,
  wallpaperElement,
  showStatus,
}) {
  showStatus(currentTranslations.statusLoading, false, { persistent: true });
  wallpaperElement.src = '';
  wallpaperElement.alt = currentTranslations.wallpaperAltFetching;

  const allPhotoEntries = [];
  let nextPageUrl = `${PEXELS_BASE_URL}collections/${collectionId}?type=photos&per_page=${PHOTOS_PER_PAGE}&page=1`;
  const headers = buildHeaders(apiKey);

  try {
    while (nextPageUrl) {
      let response;
      try {
        response = await fetch(nextPageUrl, { headers });
      } catch (networkError) {
        networkError.isNetworkError = true;
        throw networkError;
      }

      if (!response.ok) {
        let errorData = null;
        try {
          errorData = await response.json();
        } catch (parseError) {
          // Ignore
        }
        const error = new Error('Pexels API error');
        error.status = response.status;
        error.details = errorData;
        throw error;
      }

      const data = await response.json();
      const mediaItems = data.media || [];
      mediaItems.forEach((photo) => {
        if (photo.type === 'Photo' && photo.src && photo.src[PHOTO_SIZE_TO_DISPLAY]) {
          const photoId = photo.id || null;
          const pageUrl = buildPexelsPageUrlFromPhoto(photo);
          allPhotoEntries.push({
            imageUrl: photo.src[PHOTO_SIZE_TO_DISPLAY],
            pageUrl,
            photographerUrl: photo.photographer_url || null,
            id: photoId,
          });
        }
      });
      nextPageUrl = data.next_page || null;
      if (nextPageUrl) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    if (allPhotoEntries.length === 0) {
      showStatus(currentTranslations.statusNoPhotosFound, true, { persistent: true });
      wallpaperElement.alt = currentTranslations.wallpaperAltConfigure;
    } else {
      const successMessage = `${currentTranslations.statusLoading} ${allPhotoEntries.length} ${currentTranslations.wallpaperAltWallpaper}. ${currentTranslations.slideshowResumed}...`;
      showStatus(successMessage, false, { duration: 3000 });
      cachePhotoUrls(collectionId, allPhotoEntries);
    }

    return allPhotoEntries;
  } catch (error) {
    console.error('Error fetching Pexels photos:', error);
    const friendlyMessage = getPexelsErrorMessage(currentTranslations, error);
    showStatus(friendlyMessage, true, { persistent: true });
    wallpaperElement.alt = currentTranslations.wallpaperAltConfigure;
    return [];
  }
}

export function getCachedRemoteUrls(collectionId) {
  return getCachedPhotoUrls(collectionId);
}

export async function loadDefaultImageList({
  currentTranslations,
  showStatus,
  hideStatus,
  localImageUrlsFile = LOCAL_IMAGE_URLS_FILE,
}) {
  const response = await fetch(localImageUrlsFile);
  if (!response.ok) {
    const message = `${currentTranslations.statusLocalFileNotFound} (HTTP ${response.status})`;
    showStatus(message, true, { persistent: true });
    return [];
  }
  const text = await response.text();
  const defaultImages = text
    .split('\n')
    .map((url) => url.trim())
    .filter(Boolean)
    .map((url) => {
      const derivedId = extractPexelsId(url);
      const pageUrl = derivedId
        ? `${PEXELS_PAGE_BASE_URL}${derivedId}/`
        : url.includes('pexels.com')
          ? url
          : null;
      return {
        imageUrl: url,
        pageUrl,
        photographerUrl: null,
        id: derivedId,
      };
    });

  if (defaultImages.length === 0) {
    showStatus(currentTranslations.statusLocalFileNotFound, true, { persistent: true });
    return [];
  }

  if (hideStatus) {
    hideStatus();
  }
  return defaultImages;
}
