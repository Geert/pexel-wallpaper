# Python script to fetch photo URLs from a Pexels collection
import requests
import json
import time
import os

# --- CONFIGURATION ---
# Make sure to set the PEXELS_API_KEY environment variable in your GitHub Secrets
API_KEY = os.getenv("PEXELS_API_KEY")
if not API_KEY:
    raise ValueError("Pexels API key not found. Set the PEXELS_API_KEY environment variable.")

# If you know your collection ID, set it here. Otherwise, the script will list your collections first.
COLLECTION_ID = "vmnecek"  # Default collection ID for automated runs
# Consider making COLLECTION_ID also configurable via environment variable if needed:
# COLLECTION_ID = os.getenv("PEXELS_COLLECTION_ID", "vmnecek") 

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

def list_my_collections():
    print("Fetching your collections...")
    url = f"{BASE_URL}collections?per_page=80" # Max per_page for collections listing
    all_collections = []
    page = 1
    while url:
        try:
            response = requests.get(url, headers=HEADERS)
            response.raise_for_status() # Raise an exception for HTTP errors
            data = response.json()
            all_collections.extend(data.get("collections", []))
            print(f"Fetched page {page} of collections...")
            url = data.get("next_page")
            page += 1
            if url: # Respect rate limits if fetching many pages of collections
                time.sleep(1) 
        except requests.exceptions.RequestException as e:
            print(f"Error fetching collections: {e}")
            if response is not None:
                print(f"Response content: {response.text}")
            return None
        except json.JSONDecodeError:
            print(f"Error decoding JSON from collections response: {response.text}")
            return None

    if not all_collections:
        print("No collections found or error fetching them.")
        return None

    print("\nYour Collections:")
    for i, coll in enumerate(all_collections):
        print(f"  {i+1}. ID: {coll['id']}, Title: {coll['title']}, Photos: {coll.get('photos_count', 'N/A')}, Videos: {coll.get('videos_count', 'N/A')}")
    
    while True:
        try:
            choice = input("Enter the number of the collection you want to use: ")
            selected_collection = all_collections[int(choice) - 1]
            return selected_collection['id']
        except (ValueError, IndexError):
            print("Invalid choice. Please enter a valid number from the list.")

def list_and_select_collection():
    return list_my_collections()

def fetch_photos_from_collection(collection_id):
    print(f"\nFetching photos from collection ID: {collection_id}")
    photo_urls = []
    api_url_to_fetch = f"{BASE_URL}collections/{collection_id}?type=photos&per_page={PHOTOS_PER_PAGE}&page=1"

    while api_url_to_fetch:
        print(f"\nFetching data from URL: {api_url_to_fetch}")
        
        response = requests.get(api_url_to_fetch, headers=HEADERS)

        print(f"DEBUG: Actual Requested URL by 'requests': {response.url}")
        print(f"DEBUG: Response Status Code: {response.status_code}")
        if response.status_code == 200:
            print(f"DEBUG: Response Text (first 500 chars): {response.text[:500]}")
        else:
            print(f"DEBUG: Response Text (error): {response.text}")

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

    if not API_KEY:
        print("Error: PEXELS_API_KEY environment variable not set.")
        # exit(1) # Consider exiting if run in an environment where API_KEY is mandatory
    else:
        print(f"Using API Key ending with: ...{API_KEY[-4:]}") # Avoid printing the full key

    # For automated runs, directly use the configured COLLECTION_ID
    # If you still want to list collections for some automated scenarios, adjust logic here.
    print(f"Automated run: Using predefined COLLECTION_ID: {COLLECTION_ID}")
    photo_urls = fetch_photos_from_collection(COLLECTION_ID)

    # The following part for interactive selection can be commented out or removed
    # for a purely automated script, or kept for optional manual script execution.
    # selected_collection_id = list_and_select_collection()
    # if selected_collection_id:
    #     photo_urls = fetch_photos_from_collection(selected_collection_id)
    # else:
    #     photo_urls = [] # Ensure photo_urls is defined

    if photo_urls:
        with open(OUTPUT_FILE, "w") as f:
            for url in photo_urls:
                f.write(f"{url}\n")
        print(f"\nSuccessfully fetched {len(photo_urls)} photo URLs.")
        print(f"Saved to: {OUTPUT_FILE}")
    else:
        print("No photo URLs were fetched.")
