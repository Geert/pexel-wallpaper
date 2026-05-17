#!/usr/bin/env node
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import process from 'node:process';

const COLLECTION_ID = 'vmnecek';
const PHOTO_SIZE = 'original';
const PHOTOS_PER_PAGE = 80;
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 3;
const RETRY_DELAY_SECONDS = 2;

const OUTPUT_FILE = 'docs/pexels_photo_urls.txt';
const OUTPUT_JSON_FILE = 'docs/pexels_photo_data.json';

const BASE_URL = 'https://api.pexels.com/v1/';
const USER_AGENT = 'PexelWallpaperDynamic/1.4 (github.com/geert/pexel-wallpaper)';

const API_KEY = process.env.PEXELS_API_KEY;
if (!API_KEY) {
  console.error('Pexels API key not found. Set the PEXELS_API_KEY environment variable.');
  process.exit(1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        headers: { Authorization: API_KEY, 'User-Agent': USER_AGENT },
        signal: controller.signal,
      });

      if (response.status === 429) {
        const retryAfter = Number(response.headers.get('Retry-After'));
        const waitSeconds = Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter
          : RETRY_DELAY_SECONDS * attempt * 2;
        console.log(`Rate limited (429). Waiting ${waitSeconds}s before retry (${attempt}/${MAX_RETRIES})...`);
        if (attempt === MAX_RETRIES) {
          throw new Error(`Rate limited after ${MAX_RETRIES} attempts`);
        }
        await sleep(waitSeconds * 1000);
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      return await response.json();
    } catch (err) {
      if (attempt === MAX_RETRIES) {
        console.error(`Request failed after ${MAX_RETRIES} attempts: ${err.message}`);
        throw err;
      }
      const wait = RETRY_DELAY_SECONDS * 2 ** (attempt - 1);
      console.log(`Request error: ${err.message}. Retrying in ${wait}s (${attempt}/${MAX_RETRIES})...`);
      await sleep(wait * 1000);
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error('Unreachable');
}

async function fetchPhotosFromCollection(collectionId) {
  console.log(`\nFetching photos from collection ID: ${collectionId}`);
  const photoUrls = [];
  const photoData = [];
  let nextUrl = `${BASE_URL}collections/${collectionId}?per_page=${PHOTOS_PER_PAGE}`;

  while (nextUrl) {
    console.log(`\nFetching data from URL: ${nextUrl}`);
    const data = await fetchWithRetry(nextUrl);

    console.log(`API Response - Page: ${data.page}, Total Results: ${data.total_results}`);
    const mediaItems = data.media ?? [];
    console.log(`API Response - Media items on this page: ${mediaItems.length}`);
    if (data.next_page) {
      console.log(`API Response - Next page URL: ${data.next_page}`);
    } else {
      console.log('API Response - No next page indicated.');
    }

    for (const item of mediaItems) {
      if (item.type !== 'Photo') continue;
      const photoSrc = item.src?.[PHOTO_SIZE];
      if (!photoSrc) {
        console.log(
          `Warning: Photo with ID ${item.id} does not have size '${PHOTO_SIZE}'. ` +
            `Available sizes: ${Object.keys(item.src ?? {}).join(', ')}`
        );
        continue;
      }
      photoUrls.push(photoSrc);
      photoData.push({
        id: item.id,
        imageUrl: photoSrc,
        alt: item.alt || null,
        photographer: item.photographer || null,
        photographerUrl: item.photographer_url || null,
        pageUrl: item.url || `https://www.pexels.com/photo/${item.id}/`,
        width: item.width,
        height: item.height,
        avgColor: item.avg_color || null,
      });
    }

    nextUrl = data.next_page ? data.next_page.replace('/v1/v1/', '/v1/') : null;
  }

  console.log(`Finished fetching. Total photos collected: ${photoUrls.length}`);
  return { photoUrls, photoData };
}

async function writeOutput(path, contents) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents);
}

console.log('Starting Pexels photo fetcher...');
console.log(`Using API Key ending with: ...${API_KEY.slice(-4)}`);
console.log(`Automated run: Using predefined COLLECTION_ID: ${COLLECTION_ID}`);

const { photoUrls, photoData } = await fetchPhotosFromCollection(COLLECTION_ID);

if (photoUrls.length === 0) {
  console.log('No photo URLs were fetched.');
  process.exit(0);
}

await writeOutput(OUTPUT_FILE, photoUrls.join('\n') + '\n');
console.log(`\nSuccessfully fetched ${photoUrls.length} photo URLs.`);
console.log(`Saved to: ${OUTPUT_FILE}`);

const jsonOutput = {
  updatedAt: new Date().toISOString(),
  collectionId: COLLECTION_ID,
  totalPhotos: photoData.length,
  photos: photoData,
};
await writeOutput(OUTPUT_JSON_FILE, JSON.stringify(jsonOutput, null, 2) + '\n');
console.log(`Saved metadata to: ${OUTPUT_JSON_FILE}`);
