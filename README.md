# Pexels Dynamic Wallpaper

Set your desktop to a dynamic slideshow of beautiful images from your favorite Pexels collections using the [Plash app (Mac OS)](https://apps.apple.com/us/app/plash/id1494023538) or [Lively App (Windows)](https://apps.microsoft.com/detail/9NTM2QC6QWS7)

This web application provides the Pexels integration for Plash or Lively, allowing you to easily configure and display high-quality wallpapers.

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

### Configure Pexels Wallpaper
1.  **Enter Pexels API Key:**
    *   In the settings form (now visible on your desktop via Plash), enter your Pexels API key. You can get one from [Pexels API](https://www.pexels.com/api/key/).
2.  **Provide Pexels Collection URL:**
    *   Paste the URL of the Pexels collection you wish to use as your wallpaper source (e.g., `https://www.pexels.com/collections/wallpapers-vmnecek/`).
3.  **Start Slideshow:**
    *   Click "Apply Settings & Start Slideshow".

If you prefer to run without an API key, the app falls back to the local list in `docs/pexels_photo_urls.txt`. Refresh that list anytime by running `python fetch_pexels_urls.py` (requires `PEXELS_API_KEY` in your environment) or update the file manually with one image URL per line.

## Updating Cached Wallpapers

1. Copy `.env.example` to `.env` and add your `PEXELS_API_KEY`.
2. Create a virtual environment and install Python dependencies: `pip install -r requirements.txt`.
3. Run `python fetch_pexels_urls.py` (or `./update.sh`) to regenerate `docs/pexels_photo_urls.txt` with the latest items from your default collection.

## Development

- `npm test` – run the Jest unit tests.
- `npm run lint` – check JavaScript (ESLint + Prettier) and Python (ruff) styling.

Your Desktop will now cycle through images from your selected Pexels collection!

## Features

*   Direct integration with Pexels collections via their API.
*   User-friendly setup through an interactive form.
*   Multi-language support (EN, NL, DE, FR).
*   Fallback to local image URLs if no API key is provided (requires `pexels_photo_urls.txt` in the `docs/` folder with image URLs, one per line).

## License

This project is licensed under the terms of the [LICENSE](LICENSE) file.

## Acknowledgements

A special thank you to the creators of [Plash](https://sindresorhus.com/plash) for providing such a versatile tool for macOS customization.
