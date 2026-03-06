import os
import requests
import time
from dotenv import load_dotenv

# 1. Load the hidden variables from the .env file
load_dotenv()

# 2. Grab the values securely
ACCESS_TOKEN = os.getenv('IG_ACCESS_TOKEN')
IG_ACCOUNT_ID = os.getenv('IG_ACCOUNT_ID')

# --- YOUR POST DETAILS ---
IMAGE_URL = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800' # Must be a public URL
CAPTION = 'Testing IG post Automation... \n #TroliToko'

def post_to_instagram():
    # Safety check to make sure the .env file loaded correctly
    if not ACCESS_TOKEN or not IG_ACCOUNT_ID:
        print("❌ Error: Could not find credentials. Check your .env file!")
        return

    print("Step 1: Uploading image to Meta...")
    container_url = f"https://graph.facebook.com/v18.0/{IG_ACCOUNT_ID}/media"
    container_payload = {
        'image_url': IMAGE_URL,
        'caption': CAPTION,
        'access_token': ACCESS_TOKEN
    }
    
    container_response = requests.post(container_url, data=container_payload).json()
    
    if 'id' not in container_response:
        print("❌ Error creating container:", container_response)
        return

    creation_id = container_response['id']
    print(f"✅ Container created! ID: {creation_id}")
    
    print("Waiting 5 seconds for processing...")
    time.sleep(5)
    
    print("Step 2: Publishing to Instagram feed...")
    publish_url = f"https://graph.facebook.com/v18.0/{IG_ACCOUNT_ID}/media_publish"
    publish_payload = {
        'creation_id': creation_id,
        'access_token': ACCESS_TOKEN
    }
    
    publish_response = requests.post(publish_url, data=publish_payload).json()
    
    if 'id' in publish_response:
        print("🎉 SUCCESS! Check your Instagram profile.")
        print("Post ID:", publish_response['id'])
    else:
        print("❌ Error publishing:", publish_response)

if __name__ == "__main__":
    post_to_instagram()