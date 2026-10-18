# Pexels Dynamic Wallpaper

Set your desktop or TV to a dynamic slideshow of beautiful images from your favorite Pexels collections. The web app powers macOS and Windows; a sync script brings the same collection to a Frame TV:

- **macOS** via [Plash](https://apps.apple.com/us/app/plash/id1494023538) — hosts the live URL as a desktop background
- **Windows** via [Lively](https://apps.microsoft.com/detail/9NTM2QC6QWS7) — same idea on Windows
- **Samsung The Frame TV** via Art Mode — a sync script puts a daily set of collection photos on the TV, and the TV's own slideshow shows them

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

### Samsung The Frame TV (Art Mode)

[`frame/frame_sync.py`](frame/frame_sync.py) works like [drnic/samsung-tv-art](https://github.com/drnic/samsung-tv-art): nothing is installed on the TV. A computer on the same network uploads photos to the Art Mode of the TV over its local WebSocket API ([samsungtvws](https://github.com/xchwarze/samsung-tv-ws-api)), and turns on the Art Mode slideshow.

Every run replaces the photos it uploaded before with photos from the collection that were on the TV longest ago, or never. It reads the collection from `pexels_photo_data.json` on GitHub Pages and asks the Pexels CDN for a 3840x2160 crop of each photo. It only deletes images it uploaded itself, so your own photos in *My Photos* stay.

```bash
uv run frame/frame_sync.py --dry-run   # print the plan
uv run frame/frame_sync.py             # sync now
uv run frame/frame_sync.py info        # art mode, current image, slideshow
```

| Option | Environment | Default | |
|---|---|---|---|
| `--photos` | `FRAME_PHOTOS` | `100` | photos on the TV at once |
| `--minutes` | `FRAME_MINUTES` | `15` | minutes per photo |
| `--replace` | `FRAME_REPLACE` | all | photos replaced per run |
| `--matte` | `FRAME_MATTE` | `none` | e.g. `shadowbox_polar` |
| `--host` | `FRAME_HOST` | found on the network | IP address of the TV |
| `--mac` | `FRAME_MAC` | found on the network | for Wake-on-LAN |

With 100 photos and 15 minutes per photo the slideshow lasts 25 hours, so a daily run shows a different photo all day. The state (which content id holds which Pexels photo) and the pairing token live in `~/.config/pexel-frame/`.

The TV must be on or in Art Mode to answer; when it is fully off, its Wi-Fi sleeps. Turn on *Settings > General > Network > Expert Settings > Power On with Mobile*, and give the TV a DHCP reservation. If the TV shows an "Allow" prompt on the first connection, select *Allow* with the remote.

The daily run on rzdm5 is a systemd user timer, see [`frame/systemd/`](frame/systemd/). The tests run with `python3 -m unittest discover frame`.

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
*   Samsung The Frame TV: a daily, rotating set of collection photos in Art Mode; no app on the TV.
*   Cache-first start with background refresh: instant slideshow from the previous launch's data, then quietly updates to the latest.
*   Keyboard navigation (arrow keys + Enter) works in any interactive frontend.

## License

This project is licensed under the terms of the [LICENSE](LICENSE) file.

## Acknowledgements

A special thank you to the creators of [Plash](https://sindresorhus.com/plash) for providing such a versatile tool for macOS customization.
