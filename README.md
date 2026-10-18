# Pexels Dynamic Wallpaper

Set your desktop or TV to a slideshow of photos from a [Pexels](https://www.pexels.com) collection. This repository has two tools:

- **A wallpaper web app** for the desktop: [Plash](https://apps.apple.com/us/app/plash/id1494023538) on macOS and [Lively](https://apps.microsoft.com/detail/9NTM2QC6QWS7) on Windows show the live page as the desktop background. [Live demo](https://geert.github.io/pexel-wallpaper/)
- **[A sync script for Samsung The Frame](frame/README.md)**: it puts the photos in the TV's Art Mode over the local network, and the TV's own slideshow shows them. Nothing is installed on the TV.

Both use the [wallpapers](https://www.pexels.com/collections/wallpapers-vmnecek/) collection by default, with 16:9 photos at 4K or more. Both can use any other Pexels collection with a free Pexels API key.

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

### Samsung The Frame TV

```bash
git clone https://github.com/Geert/pexel-wallpaper.git && cd pexel-wallpaper/frame
uv run frame_sync.py pair    # select Allow on the TV
uv run frame_sync.py         # upload the collection and start the slideshow
```

Requirements, settings, a daily schedule (systemd, launchd, cron) and troubleshooting: see [`frame/README.md`](frame/README.md).

### Configure Pexels Wallpaper
1.  **Enter Pexels API Key:**
    *   In the settings form (now visible on your desktop via Plash), enter your Pexels API key. You can get one from [Pexels API](https://www.pexels.com/api/key/).
2.  **Provide Pexels Collection URL:**
    *   Paste the URL of the Pexels collection you wish to use as your wallpaper source (e.g., `https://www.pexels.com/collections/wallpapers-vmnecek/`).
3.  **Start Slideshow:**
    *   Click "Save & start".

If you prefer to run without an API key, the app falls back to a bundled `docs/pexels_photo_data.json` snapshot. That file is refreshed daily by a GitHub Actions workflow; you can also regenerate it locally (see below).

## Updating Cached Wallpapers

1. Copy `.env.example` to `.env` and add your `PEXELS_API_KEY`.
2. Run `node --env-file=.env fetch_pexels_urls.mjs` (or `npm run fetch` with `PEXELS_API_KEY` exported) to regenerate `docs/pexels_photo_data.json` with the latest items from the configured collection.

## Development

- `npm test` – run the Jest unit tests.
- `npm run lint` – check JavaScript (ESLint + Prettier) styling.

Your Desktop will now cycle through images from your selected Pexels collection!

## Features

*   Direct integration with Pexels collections via their API (Plash/Lively/browser).
*   User-friendly setup through an interactive form (Plash/Lively/browser).
*   Multi-language support (EN, NL, DE, FR).
*   Bundled `pexels_photo_data.json` snapshot as a fallback when no API key is configured (refreshed daily by GitHub Actions).
*   Samsung The Frame TV: the whole collection, or a daily rotating set, in Art Mode; no app on the TV ([details](frame/README.md)).
*   Cache-first start with background refresh: instant slideshow from the previous launch's data, then quietly updates to the latest.
*   Keyboard navigation (arrow keys + Enter) works in any interactive frontend.

## License

The code is under the [MIT license](LICENSE). Photos come from [Pexels](https://www.pexels.com) under the [Pexels license](https://www.pexels.com/license/).

## Acknowledgements

A special thank you to the creators of [Plash](https://sindresorhus.com/plash) for providing such a versatile tool for macOS customization, and to [drnic/samsung-tv-art](https://github.com/drnic/samsung-tv-art) and [samsungtvws](https://github.com/xchwarze/samsung-tv-ws-api) for showing how to drive the Art Mode of The Frame.
