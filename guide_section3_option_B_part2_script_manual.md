
**Python script to fetch photo URLs from your Pexels Collection:**

I have prepared a Python script that can help you fetch the URLs of the photos from one of your Pexels collections. You will need to have Python installed on your Mac to run this. macOS comes with Python, but it might be an older version. If you encounter issues, you might need to install a newer version of Python (e.g., from python.org).

*(The Python script `fetch_pexels_urls.py` has been created separately and will be provided alongside this guide.)*

**How to run the Python script (`fetch_pexels_urls.py`):**

1.  **Save the Script:** Download the `fetch_pexels_urls.py` script file that I will provide and save it to a convenient location on your Mac (e.g., your Desktop or a dedicated folder).
2.  **Install `requests` library (if you haven't already):**
    *   Open the Terminal app on your Mac (you can find it in Applications > Utilities, or search for it using Spotlight).
    *   Type the following command and press Enter: `pip3 install requests`
    *   If it says `pip3` is not found, try `pip install requests`. If you have multiple Python versions, ensure you are installing it for the Python version you intend to use.
3.  **Edit the Script with Your API Key (and optionally Collection ID):
    *   Open the `fetch_pexels_urls.py` script in a plain text editor (like TextEdit in plain text mode, VS Code, Sublime Text, or even Nano in the terminal).
    *   Find the line: `API_KEY = "YOUR_PEXELS_API_KEY"`
    *   Replace `"YOUR_PEXELS_API_KEY"` with the actual API key you obtained from Pexels. Make sure the key is within the double quotes.
    *   (Optional) If you already know the ID of the Pexels collection you want to use, you can set it directly in the script. Find the line `COLLECTION_ID = ""` and replace `""` with your collection ID (e.g., `COLLECTION_ID = "abc123xyz"`). If you leave it blank, the script will list your collections and ask you to choose one.
    *   (Optional) You can change `PHOTO_SIZE = "original"` to other sizes like `large2x`, `large`, `medium`, `small`, `portrait`, `landscape`, or `tiny` if you prefer smaller images for your wallpaper to save bandwidth or load faster. `original` will give you the best quality.
    *   Save the changes to the script file.
4.  **Run the Script:**
    *   Open the Terminal app again.
    *   Navigate to the directory where you saved the script. For example, if you saved it on your Desktop, type `cd Desktop` and press Enter.
    *   Run the script using the command: `python3 fetch_pexels_urls.py`
    *   If `python3` doesn't work, try `python fetch_pexels_urls.py`.
5.  **Follow Prompts (if any):**
    *   If you didn't specify a `COLLECTION_ID` in the script, it will list your Pexels collections by title and ID, and ask you to enter the number corresponding to the collection you want to use.
    *   The script will then fetch the photo URLs from the selected collection.
6.  **Get the Output File:**
    *   Once the script finishes, it will create a file named `pexels_photo_urls.txt` in the same directory where you ran the script. This file will contain a list of direct URLs to your photos, one URL per line.

**Important Considerations for API Usage:**

*   **Pexels API Terms:** As mentioned earlier, Pexels API guidelines state: *"You may not copy or replicate core functionality of Pexels (including making Pexels content available as a wallpaper app)."* This script is intended to help you access *your own photos from your collections* for *personal use* as a wallpaper. Please ensure your use case complies with Pexels' current API Terms of Service. Using it for a personal, non-distributed wallpaper setup is generally different from creating a public wallpaper application, but it's your responsibility to ensure compliance.
*   **Rate Limits:** The Pexels API has rate limits (e.g., 200 requests per hour and 20,000 requests per month by default). The script includes a 1-second delay between fetching pages of photos to be respectful of these limits. For 1000 images, if they are spread across many pages (Pexels API returns up to 80 items per page), it might take a few minutes to fetch all URLs. If you have significantly more than a few hundred photos in a single collection, ensure you are within reasonable usage patterns.

#### Method 3.1.2: Manually Collecting URLs (Fallback)

If you prefer not to use the API, or if you only have a smaller subset of your 1000 photos you want to use, you could manually collect the URLs. However, for 1000 images, this would be extremely time-consuming and is not recommended.

If you choose this path:

1.  Go to your Pexels photo page or collection.
2.  For each photo, you would need to find the direct link to the image file (often by right-clicking the image and selecting "Copy Image Address" or similar, ensuring you get a URL ending in .jpg, .png, etc., not a link to a Pexels webpage).
3.  Paste these URLs into a plain text file, one URL per line. This file would be the equivalent of `pexels_photo_urls.txt` created by the script.

This method is impractical for a large number of images but is an option for a very small selection.
