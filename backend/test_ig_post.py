import requests
import json
import random
import sys

# Test account credentials
EMAIL = "rani.summarecon@marketplace.test"
PASSWORD = "test123"

# Base API URL
API_URL = "https://umkm-marketplace-production.up.railway.app/api"

def main():
    print(f"--- Instagram Post Testing Tool ---")
    print(f"Logging in as {EMAIL}...")
    
    # 1. Login to get JWT Token
    login_req = requests.post(f"{API_URL}/auth/login", json={
        "email": EMAIL,
        "password": PASSWORD
    })
    
    if login_req.status_code != 200:
        print(f"❌ Login failed: {login_req.text}")
        print("Please ensure your backend is running on http://localhost:5000")
        sys.exit(1)
        
    token = login_req.json().get("token")
    if not token:
        print("❌ Login successful but no token received.")
        sys.exit(1)
        
    print("✅ Login successful!")
    
    # Generate unique product name for testing
    rand_id = random.randint(1000, 9999)
    product_name = f"Test Automation Product #{rand_id}"
    
    # 2. Create the product with Instagram Automation Enabled
    print(f"\nCreating product: {product_name}")
    print("Toggle: postToInstagram = True")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    product_data = {
        "name": product_name,
        "description": "This is a dummy product generated automatically to test the n8n Instagram posting integration.",
        "price": 15000,
        "category": "Food & Beverages",
        "stock": 50,
        "unit": "pieces",
        "tags": ["testing", "n8n", "automation"],
        "postToInstagram": True,
        "instagramCaption": f"Testing the automated backend webhook! \nProduct: {product_name} \n#TroliToko #Test",
        # Using a public unsplash image so Meta has something valid to download
        "images": ["https://images.unsplash.com/photo-1550547660-d9450f859349?w=800"]
    }
    
    create_req = requests.post(
        f"{API_URL}/products",
        headers=headers,
        json=product_data
    )
    
    if create_req.status_code == 201:
        res = create_req.json()
        print(f"\n✅ PRODUCT CREATED SUCCESSFULLY!")
        print(f"Product ID: {res.get('id', res.get('_id'))}")
        print("\n⏳ If your backend is running, it just fired the webhook to n8n.")
        print("➡️ Check your n8n Executions log immediately to see the Instagram flow running!")
    else:
        print(f"\n❌ Failed to create product: Status {create_req.status_code}")
        print(create_req.text)

if __name__ == "__main__":
    main()
