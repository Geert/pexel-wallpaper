# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pexels Dynamic Wallpaper — a static web app (hosted on GitHub Pages at `docs/`) that displays a rotating slideshow of Pexels collection photos. Powers two frontends: Plash (macOS) and Lively (Windows). A Python sync script (`frame/frame_sync.py`) puts the same collection in the Art Mode of a Samsung The Frame TV. A Node script fetches photo URLs from the Pexels API and writes them to a local text/JSON file used as the fallback source.

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

### Samsung The Frame TV (`frame/`)
Public, user-facing docs are in `frame/README.md`; keep them in sync with the script.
- `frame/frame_sync.py` is a single `uv` script (PEP 723 inline deps: `samsungtvws`), modelled on [drnic/samsung-tv-art](https://github.com/drnic/samsung-tv-art). There is no app on the TV: the script uploads photos to Art Mode over the TV's local WebSocket API (port 8002, self-signed cert) and turns on the slideshow on `MY-C0002` (My Photos). Commands: `sync` (default), `pair`, `info`, `discover`.
- Photo source: without settings the published `pexels_photo_data.json` on GitHub Pages (no API key); with `--collection`/`PEXELS_COLLECTION` plus `PEXELS_API_KEY` any collection via the Pexels API (`fetch_collection()`). Portrait photos are skipped; the CDN delivers a 3840x2160 crop (`?cs=srgb&fm=jpg&fit=crop&w=3840&h=2160`; `fm=jpg` also turns PNG originals into JPG).
- Firmware: API 0.97 only knows `set_auto_rotation_status`; Geert's 2024 Frame (QE65LS03D, Art API 5.0.1.0) only answers `set_slideshow_status`, so `start_slideshow()` picks by API version. Favourites (`change_favorite`) fail with error -7 for own photos, and the slideshow ignores a `content_list`, so it always covers all of My Photos.
- samsungtvws waits forever for a request the TV does not answer: every TV call goes through `tv_call()` (SIGALRM, or a worker thread on Windows / outside the main thread).
- Pairing: the Allow prompt (about 30 s) only appears on the remote-control channel (`pair()`); without a token the Art channel hangs silently. `connect()` pairs when the token file is missing. Never print the token: the TV echoes it in the `clients` list of `ms.channel.connect`.
- Default: the whole collection (`--photos 0`, `--replace 0`): each run uploads new photos and deletes those that left the collection. A failed upload is treated as a full TV and stops the uploads.
- `plan()` is pure. Tests: `python3 -m unittest discover frame` (stdlib only; `samsungtvws` is imported lazily). CI: `.github/workflows/frame.yml` (ruff, unit tests, dry runs; the Pexels API dry run uses the `PEXELS_API_KEY` secret).
- State in `~/.config/pexel-frame/state.json`: `uploaded` maps content id → Pexels id + upload date; `lastOnTv` drives a rotating set. The script only deletes content ids in `uploaded`; if the state file is lost, the next run uploads everything again (duplicates).
- Geert's TV is synced from rzdm5 (same LAN) by the systemd user timer in `frame/systemd/`; settings in `~/.config/pexel-frame/env` there (`FRAME_MINUTES=3`). The service does `git pull` in `~/pexel-wallpaper` first, so merging to `main` is the deploy.

### Tests (`__tests__/script.test.js`)
Jest with jsdom. Tests import directly from the ESM modules. `jest.setup.js` provides `fetch`, `TextEncoder`, and `matchMedia` mocks.

## Code Style

- **JavaScript**: ESLint (recommended + prettier config), Prettier (single quotes, 100 char width, ES5 trailing commas). Browser ES2022, ESM modules. Unused vars prefixed with `_` are allowed.
- Tests are excluded from ESLint (`ignorePatterns: ['__tests__/**']`).

## Notes

- The app detects its environment (Plash, Lively, browser) via user-agent sniffing and adjusts setup instructions accordingly.
- `node_modules` and local Node binaries are gitignored via the `node*` pattern in `.gitignore`.
- CSS includes dark mode support via `prefers-color-scheme: dark` for the settings form.
