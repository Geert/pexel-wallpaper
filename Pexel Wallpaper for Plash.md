# Pexel Wallpaper for Plash

This project hosts a simple HTML slideshow designed to display your personal Pexels photos as a dynamic wallpaper using the [Plash](https://sindresorhus.com/plash) application on macOS.

## Overview

The core of this repository is the `slideshow.html` file. This webpage fetches a list of image URLs from a `pexels_photo_urls.txt` file and displays them in a full-screen, auto-advancing slideshow format. When this `slideshow.html` is hosted (e.g., via GitHub Pages), its URL can be used in Plash to set your desktop wallpaper to your Pexels photo collection.

## Files

*   `slideshow.html`: The main HTML file that creates the slideshow. It uses JavaScript to load image URLs and cycle through them.
*   `pexels_photo_urls.txt`: A plain text file where each line should be a direct URL to one of your Pexels photos. This file needs to be created by you and populated with your photo URLs.
*   `LICENSE`: Contains the MIT License for this project.
*   `.gitignore`: Standard git ignore file.

## How It Works

1.  **Photo URLs**: The `slideshow.html` page attempts to fetch `pexels_photo_urls.txt` from the same directory.
2.  **Slideshow Display**: It then shuffles these URLs and displays the images one by one, fitting them to the screen. The image changes at a predefined interval (default is 5 minutes, configurable in `slideshow.html`).
3.  **Plash Integration**: The Plash app on your Mac is set to display the URL of your hosted `slideshow.html` as the desktop wallpaper.

## Setup and Usage

1.  **Populate `pexels_photo_urls.txt`**:
    *   You need to create or update the `pexels_photo_urls.txt` file in this repository with the direct URLs of your Pexels photos that you want to display.
    *   One way to get these URLs is by using the Pexels API. A Python script (`fetch_pexels_urls.py` - *not included in this repository but provided separately*) can be used to fetch URLs from your Pexels collections. You would run this script locally, generate the `pexels_photo_urls.txt` file, and then add/commit it to this repository.
    *   Ensure each URL is on a new line.

2.  **GitHub Pages Deployment**:
    *   This repository seems to be set up for GitHub Pages. When you push changes (especially to `pexels_photo_urls.txt` or `slideshow.html`) to the `main` branch, GitHub Pages should automatically update the live slideshow.
    *   Your GitHub Pages URL for the slideshow will typically be in the format: `https://your-username.github.io/pexel-wallpaper/slideshow.html` (replace `your-username` with your GitHub username, which is `Geert` in this case, so it would be `https://Geert.github.io/pexel-wallpaper/slideshow.html`).

3.  **Configure Plash**:
    *   Install [Plash](https://sindresorhus.com/plash) on your Mac if you haven't already.
    *   Open Plash preferences.
    *   Set the wallpaper URL to your GitHub Pages URL for `slideshow.html` (e.g., `https://Geert.github.io/pexel-wallpaper/slideshow.html`).
    *   Configure Plash refresh settings as desired. The slideshow itself changes images, but a periodic Plash refresh (e.g., daily) can be a good safeguard.

4.  **Customization (Optional)**:
    *   **Image Change Interval**: You can change how often the image updates by editing the `changeInterval` variable in `slideshow.html` (value is in milliseconds).
    *   **Image Display Style**: The `object-fit` CSS property in `slideshow.html` is set to `cover` (fills the screen, may crop). You can change it to `contain` if you prefer to see the whole image with potential letterboxing.

## Contributing

This is a personal project setup. If you are the owner (`Geert`), you can update the `pexels_photo_urls.txt` and `slideshow.html` as needed.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

*This README was generated to help document the pexel-wallpaper project.*
