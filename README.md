# Pexels Dynamic Wallpaper for Plash

Set your macOS desktop to a dynamic slideshow of beautiful images from your favorite Pexels collections using the [Plash app](https://apps.apple.com/us/app/plash/id1494023538?mt=12).

This web application provides the Pexels integration for Plash, allowing you to easily configure and display high-quality wallpapers.

[Live Demo](https://geert.github.io/pexel-wallpaper/)

## How to Use

To get started, follow these steps which are also displayed in the settings form of the application:

1.  **Install Plash:**
    *   Download and install Plash from the [Mac App Store](https://apps.apple.com/us/app/plash/id1494023538?mt=12).
2.  **Add Web App to Plash:**
    *   In Plash preferences, under 'Websites', add this URL: `https://geert.github.io/pexel-wallpaper/`
3.  **Enable Browsing Mode:**
    *   Ensure 'Browsing Mode' is enabled in Plash for the URL above. This allows you to interact with the settings form directly on your desktop.
4.  **Enter Pexels API Key:**
    *   In the settings form (now visible on your desktop via Plash), enter your Pexels API key. You can get one from [Pexels API](https://www.pexels.com/api/key/).
5.  **Provide Pexels Collection URL:**
    *   Paste the URL of the Pexels collection you wish to use as your wallpaper source (e.g., `https://www.pexels.com/collections/wallpapers-vmnecek/`).
6.  **Start Slideshow:**
    *   Click "Apply Settings & Start Slideshow".

Your Mac desktop will now cycle through images from your selected Pexels collection!

## Features

*   Direct integration with Pexels collections via their API.
*   User-friendly setup through an interactive form.
*   Multi-language support (EN, NL, DE, FR).
*   Fallback to local image URLs if no API key is provided (requires `pexels_photo_urls.txt` in the `docs/` folder with image URLs, one per line).

## License

This project is licensed under the terms of the [LICENSE](LICENSE) file.

## Acknowledgements

A special thank you to the creators of [Plash](https://sindresorhus.com/plash) for providing such a versatile tool for macOS customization.
