# Python script to fetch photo URLs from a Pexels collection
import requests
import json
import time

# --- CONFIGURATION ---
API_KEY = "bLgBAAJVGLvf4Eu07NumxhNj4EYyi52uX87SN4LIgcK0VQL18KHc5W72"  # Replace with your Pexels API Key
# If you know your collection ID, set it here. Otherwise, the script will list your collections first.
COLLECTION_ID = "vmnecek"  # Example: "your_collection_id_here" 
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
    if API_KEY == "YOUR_PEXELS_API_KEY":
        print("Error: Please replace 'YOUR_PEXELS_API_KEY' with your actual Pexels API key in the script.")
        exit()

    target_collection_id = COLLECTION_ID
    if not target_collection_id:
        target_collection_id = list_my_collections()
    
    if target_collection_id:
        urls = fetch_photos_from_collection(target_collection_id)
        if urls:
            with open(OUTPUT_FILE, "w") as f:
                for url in urls:
                    f.write(f"{url}\n")
            print(f"\nSuccessfully fetched {len(urls)} photo URLs.")
            print(f"Saved to: {OUTPUT_FILE}")
        else:
            print("No photo URLs were fetched.")
    else:
        print("Could not determine collection ID. Exiting.")
