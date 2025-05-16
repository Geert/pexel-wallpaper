## Section 4: Configuring Plash for Automatic Refresh

Regardless of whether you used Option A (direct Pexels URL) or Option B (custom slideshow URL), you'll want Plash to refresh the webpage periodically to see new images or ensure the slideshow continues if it relies on page reloads for long-term stability.

1.  **Open Plash Preferences:** Click the Plash icon in your Mac's menu bar and select "Preferences" or a similar option to open its settings.
2.  **Find Refresh Settings:** Look for settings related to "Refresh Interval," "Reload Page Every," or similar. The exact wording might vary depending on the Plash version.
3.  **Set an Interval:**
    *   **For Option A (Direct Pexels URL):** If the Pexels page itself doesn't automatically cycle images, you'll rely entirely on Plash's refresh. Set an interval based on how often you want to potentially see a new layout or if Pexels might show different initial photos. An interval like every 15 minutes to 1 hour might be suitable.
    *   **For Option B (Custom Slideshow):** Your custom `slideshow.html` is designed to change images automatically using JavaScript (`changeInterval`). Plash's refresh is less critical for changing images *within* the slideshow. However, a periodic refresh (e.g., every few hours or once a day) can be a good safety measure to ensure the webpage is reloaded cleanly, in case the script encounters an issue over a very long period.
4.  **Other Plash Settings:** Explore other Plash settings. You might find options for:
    *   **Display Mode:** How the webpage is scaled (e.g., fit to screen, fill screen). For the custom slideshow, the CSS `object-fit: cover;` already handles this, but Plash might have an overriding setting.
    *   **Interactivity:** Plash can allow you to interact with the webpage. For a wallpaper, you likely want this disabled to avoid accidental clicks.
    *   **Show on all Spaces:** Configure if the wallpaper is visible across all your macOS Spaces.
    *   **Launch at Login:** Ensure Plash starts automatically when you log in to your Mac.

Experiment with the refresh interval and other settings to find what works best for your setup and preferences.

## Section 5: Troubleshooting and Tips

Here are some common issues and tips:

*   **Plash shows a blank page or error:**
    *   **Check URL:** Double-check the URL you entered into Plash. Make sure it's correct, including `http://` or `https://`.
    *   **Test URL in Browser:** Open the exact same URL in a regular web browser (Safari, Chrome). Does it load correctly there? If not, the issue is with the webpage itself or its hosting, not Plash.
    *   **For Custom Slideshow (`slideshow.html`):**
        *   Ensure `pexels_photo_urls.txt` is in the same directory as `slideshow.html` on the server where it's hosted. If you deployed it and it's not working, this is the most common cause.
        *   Check the browser's developer console for errors when you open `slideshow.html` directly. This can give clues (e.g., file not found, JavaScript errors).
*   **Images are not changing (Custom Slideshow):**
    *   **Check `changeInterval`:** In `slideshow.html`, verify the `changeInterval` value. Remember it's in milliseconds.
    *   **JavaScript Errors:** Open `slideshow.html` in a browser and check the developer console for JavaScript errors that might be stopping the script.
    *   **Empty `pexels_photo_urls.txt`:** Ensure the `pexels_photo_urls.txt` file is not empty and contains valid image URLs.
*   **Python Script Errors (`fetch_pexels_urls.py`):**
    *   **API Key:** Ensure your Pexels API key is correctly pasted into the script.
    *   **`requests` Library:** Make sure you've installed the `requests` library (`pip3 install requests`).
    *   **Collection ID:** If the script can't find your collections, or you entered an incorrect ID, it won't be able to fetch photos.
    *   **Pexels API Terms/Limits:** If you make too many requests too quickly, the Pexels API might temporarily block you. The script has a delay, but be mindful if running it repeatedly.
    *   **Internet Connection:** The script needs an active internet connection.
*   **Pexels API 
