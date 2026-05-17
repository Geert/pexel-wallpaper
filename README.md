# Pexels Dynamic Wallpaper

Set your desktop or TV to a dynamic slideshow of beautiful images from your favorite Pexels collections. The same web app powers three frontends:

- **macOS** via [Plash](https://apps.apple.com/us/app/plash/id1494023538) — hosts the live URL as a desktop background
- **Windows** via [Lively](https://apps.microsoft.com/detail/9NTM2QC6QWS7) — same idea on Windows
- **Samsung Smart TV** via a Tizen `.wgt` built from this repo — bundles the app locally, fetches photo metadata from GitHub Pages at runtime

[Live Demo](https://geert.github.io/pexel-wallpaper/)

## How to Use

To get started, follow these steps which are also displayed in the settings form of the application:

### Mac OS
1.  **Install Plash:**
    *   Download and install Plash from the [Mac App Store](https://apps.apple.com/us/app/plash/id1494023538).
2.  **Add Web App to Plash:**
    *   In Plash preferences, under 'Websites', add this URL: `https://geert.github.io/pexel-wallpaper/`
3.  **Enable Browsing Mode:**
    *   Ensure 'Browsing Mode' is enabled in Plash for the URL above. This allows you to interact with the settings form directly on your desktop.

### Windows
1. **Install Lively:**
   *  Download and install from the [Microsoft Store](https://apps.microsoft.com/detail/9NTM2QC6QWS7)
2. **Add Web App to Lively:**
   *  In Lively, choose the + button, add this URL: `https://geert.github.io/pexel-wallpaper/`

### Samsung Smart TV (Tizen)

The TV build runs entirely from the bundled `.wgt`; it does not contact the Pexels API and shows no settings UI. Only the photo metadata JSON and the photo images themselves are fetched at runtime (allowed by the Samsung Store CSP).

1. **Enable Developer Mode** on the TV (Apps screen → `12345` on the remote, set the Host PC IP, reboot the TV).
2. **Package** `docs/` with Tizen Studio's CLI: `cd docs && tizen package -t wgt -s <profile> -- .` (or build via the Tizen Studio GUI).
3. **Install** via `sdb connect <tv-ip>` → `tizen install -n "Pexel Wallpaper.wgt" -t <device>`.

Full instructions, the Jellyfin2Samsung sideload variant, and common troubleshooting live in [`docs/DEPLOY-TIZEN.md`](docs/DEPLOY-TIZEN.md).

Remote control:

| Button | Action |
|---|---|
| OK / Enter / Play | Toggle photo info overlay (bottom-right) |
| Right arrow | Next photo |
| Left arrow | Previous photo |
| Back | Exit app |

### Configure Pexels Wallpaper
1.  **Enter Pexels API Key:**
    *   In the settings form (now visible on your desktop via Plash), enter your Pexels API key. You can get one from [Pexels API](https://www.pexels.com/api/key/).
2.  **Provide Pexels Collection URL:**
    *   Paste the URL of the Pexels collection you wish to use as your wallpaper source (e.g., `https://www.pexels.com/collections/wallpapers-vmnecek/`).
3.  **Start Slideshow:**
    *   Click "Apply Settings & Start Slideshow".

If you prefer to run without an API key, the app falls back to the local list in `docs/pexels_photo_urls.txt`. Refresh that list anytime by running `npm run fetch` (requires `PEXELS_API_KEY` in your environment) or update the file manually with one image URL per line.

## Updating Cached Wallpapers

1. Copy `.env.example` to `.env` and add your `PEXELS_API_KEY`.
2. Run `node --env-file=.env fetch_pexels_urls.mjs` (or `npm run fetch` with `PEXELS_API_KEY` exported) to regenerate `docs/pexels_photo_urls.txt` with the latest items from your default collection.

## Development

- `npm test` – run the Jest unit tests.
- `npm run lint` – check JavaScript (ESLint + Prettier) styling.

Your Desktop will now cycle through images from your selected Pexels collection!

## Features

*   Direct integration with Pexels collections via their API (Plash/Lively/browser).
*   User-friendly setup through an interactive form (Plash/Lively/browser).
*   Multi-language support (EN, NL, DE, FR).
*   Fallback to local image URLs if no API key is provided (requires `pexels_photo_urls.txt` in the `docs/` folder with image URLs, one per line).
*   Samsung TV build (Tizen `.wgt`) that fetches photo metadata at runtime from GitHub Pages; no API key needed.
*   Keyboard / remote navigation (arrow keys + OK) works in any interactive frontend.

## License

This project is licensed under the terms of the [LICENSE](LICENSE) file.

## Acknowledgements

A special thank you to the creators of [Plash](https://sindresorhus.com/plash) for providing such a versatile tool for macOS customization.
