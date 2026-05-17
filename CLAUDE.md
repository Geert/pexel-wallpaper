# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pexels Dynamic Wallpaper — a static web app (hosted on GitHub Pages at `docs/`) that displays a rotating slideshow of Pexels collection photos. Designed to be used as a desktop wallpaper source via Plash (macOS) or Lively (Windows). A Node script fetches photo URLs from the Pexels API and writes them to a local text file used as the fallback image source.

## Commands

### Tests
```bash
npm test                    # Run Jest tests (uses --experimental-vm-modules for ESM)
```

### Linting
```bash
npm run lint                # Run all linters (ESLint + Prettier)
npm run lint:js             # ESLint only on docs/js/**/*.{js,mjs}
npm run format:js           # Prettier check on docs/js/**/*.{js,mjs}
```

### Photo URL fetcher (Node)
```bash
npm run fetch                              # node fetch_pexels_urls.mjs
node --env-file=.env fetch_pexels_urls.mjs # load .env automatically (Node 20.6+)
```
Requires `PEXELS_API_KEY` in `.env` (copy from `.env.example`) or as an environment variable. Zero npm dependencies — uses built-in `fetch` and `AbortController`.

## Architecture

### Frontend (`docs/`)
Static site served by GitHub Pages. All JS uses native ES modules (`.mjs`).

- **`main.mjs`** — App entry point. Handles DOM setup, settings form show/hide, slideshow lifecycle (start/stop/pause/resume), URL parameter parsing, and collection ID extraction from Pexels URLs. Exports `extractCollectionIdFromUrl`.
- **`slideshow.mjs`** — Pexels API fetching (paginated with 30s timeout), local fallback file loading, photo entry building with attribution links, and the shared `extractPexelsId` utility. Pure data-fetching logic separated from DOM.
- **`storage.mjs`** — localStorage wrapper with in-memory fallback. Handles API key/collection persistence, URL cache with TTL (`CACHE_DURATION_MS = 24h`), and address bar sanitization (strips sensitive query params via `history.replaceState`).
- **`config.mjs`** — All constants: API URLs, storage keys, timing, sensitive param list.
- **`i18n.mjs`** — Loads `translations.json` at runtime; falls back to hardcoded English. Language auto-detected from browser.
- **`status.mjs`** — Status overlay management (show/hide with auto-dismiss timers, `aria-live="assertive"` for errors).

### Data flow
1. On load: check URL params → check localStorage → if no API key, start default slideshow from `pexels_photo_urls.txt`
2. With API key: fetch from Pexels API → cache in localStorage (24h TTL) → shuffle → rotate every 5 min
3. Settings stored in localStorage (not cookies) to avoid sending keys to server
4. Settings dialog is hidden by default; only shown when user clicks the settings button

### Backend (`fetch_pexels_urls.mjs`)
Standalone Node ESM script (zero deps) that fetches all photos from a hardcoded Pexels collection (`COLLECTION_ID = "vmnecek"`) with retry logic and rate limit (429) handling, writes URLs to `docs/pexels_photo_urls.txt` and metadata to `docs/pexels_photo_data.json`. Runs daily via GitHub Actions (`.github/workflows/update_photos.yml`).

### Tests (`__tests__/script.test.js`)
Jest with jsdom. Tests import directly from the ESM modules. `jest.setup.js` provides `fetch`, `TextEncoder`, and `matchMedia` mocks.

## Code Style

- **JavaScript**: ESLint (recommended + prettier config), Prettier (single quotes, 100 char width, ES5 trailing commas). Browser ES2022, ESM modules. Unused vars prefixed with `_` are allowed.
- Tests are excluded from ESLint (`ignorePatterns: ['__tests__/**']`).

## Notes

- The app detects its environment (Plash, Lively, browser) via user-agent sniffing and adjusts setup instructions accordingly.
- `node_modules` and local Node binaries are gitignored via the `node*` pattern in `.gitignore`.
- CSS includes dark mode support via `prefers-color-scheme: dark` for the settings form.
