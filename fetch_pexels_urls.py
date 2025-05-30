# Python script to fetch photo URLs from a Pexels collection
import requests
import json
import time
import os

COLLECTION_ID = "vmnecek"  # Default collection ID for automated runs
# COLLECTION_ID = "xbncfpg"  # Default collection ID for automated runs



# --- CONFIGURATION ---
# Make sure to set the PEXELS_API_KEY environment variable in your GitHub Secrets
API_KEY = os.getenv("PEXELS_API_KEY")
if not API_KEY:
    raise ValueError("Pexels API key not found. Set the PEXELS_API_KEY environment variable.")

OUTPUT_FILE = "docs/pexels_photo_urls.txt"
# Choose photo size: original, large2x, large, medium, small, portrait, landscape, tiny
PHOTO_SIZE = "original" 
PHOTOS_PER_PAGE = 80
# --- END CONFIGURATION ---

HEADERS = {
    "Authorization": API_KEY,
    "User-Agent": "curl/7.86.0"  # Example curl User-Agent, version might differ
}

BASE_URL = "https://api.pexels.com/v1/"

def fetch_photos_from_collection(collection_id):
    print(f"\nFetching photos from collection ID: {collection_id}")
    photo_urls = []
    api_url_to_fetch = f"{BASE_URL}collections/{collection_id}?per_page={PHOTOS_PER_PAGE}"

    while api_url_to_fetch:
        print(f"\nFetching data from URL: {api_url_to_fetch}")
        
        response = requests.get(api_url_to_fetch, headers=HEADERS)

        response.raise_for_status()  # Check for HTTP errors (e.g., 401, 403, 404, 500)
        data = response.json()

        print(f"API Response - Page: {data.get('page')}, Total Results: {data.get('total_results')}")
        media_items = data.get("media", [])
        print(f"API Response - Media items on this page: {len(media_items)}")
        if data.get('next_page'):
            print(f"API Response - Next page URL: {data.get('next_page')}")
        else:
            print("API Response - No next page indicated.")

        for item in media_items:
            if item.get("type") == "Photo":
                photo_src = item.get("src", {}).get(PHOTO_SIZE)
                if photo_src:
                    photo_urls.append(photo_src)
                else:
                    print(f"Warning: Photo with ID {item.get('id')} does not have size '{PHOTO_SIZE}'. Available sizes: {list(item.get('src', {}).keys())}")
        
        api_url_to_fetch = data.get('next_page')

    print(f"Finished fetching. Total photo URLs collected: {len(photo_urls)}") 
    return photo_urls

if __name__ == "__main__":
    print("Starting Pexels photo fetcher...")

    print(f"Using API Key ending with: ...{API_KEY[-4:]}") # Avoid printing the full key

    print(f"Automated run: Using predefined COLLECTION_ID: {COLLECTION_ID}")
    photo_urls = fetch_photos_from_collection(COLLECTION_ID)

    if photo_urls:
        with open(OUTPUT_FILE, "w") as f:
            for url in photo_urls:
                f.write(f"{url}\n")
        print(f"\nSuccessfully fetched {len(photo_urls)} photo URLs.")
        print(f"Saved to: {OUTPUT_FILE}")
    else:
        print("No photo URLs were fetched.")
