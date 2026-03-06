# N8N Instagram Binary Upload Setup

This guide shows how to upload images to Instagram as binary data instead of using URL, which fixes the "Media download has failed" error.

## Problem

Instagram's API cannot download images from most servers (especially those behind Cloudflare). The solution is to:
1. Download the image in n8n first
2. Upload it as binary to Instagram

## N8N Workflow Configuration

### Step 1: Webhook Node (Already exists)
- Keep your existing webhook node
- This receives the payload from your backend

### Step 2: Download Image as Binary

Add a new HTTP Request node **BEFORE** the existing "Upload to IG" node:

```
Node Name: Download Image
Method: GET
URL: {{ $json.body.productImage }}
Response: Binary File
Binary Property: image
```

**Important Settings:**
- Method: GET
- Response: Binary File  
- Output Binary Property: `image`
- Property Name: `image`

### Step 3: Upload to Instagram (Modify Existing Node)

Change your existing node to use multipart form:

```
Node Name: Upload to IG
Method: POST
URL: https://graph.facebook.com/v18.0/{{ $json.body.instagramUserID }}/media
Body Content Type: Multipart Form
Form Data:
  - Name: media
    Type: Binary
    Binary Property: image  ← Point to the downloaded image
  - Name: caption
    Value: {{ $json.body.productName + "\n\nPrice: " + $json.body.productPrice + "\nAvailable at: " + $json.body.storeName + "\nLink: " + $json.body.productLink }}
  - Name: access_token
    Value: {{ $json.body.accessToken }}
```

**Key Changes:**
1. Body Content Type: `Form URL Encoded` → `Multipart Form`
2. Instead of `image_url`, use `media` (binary)
3. Select "Binary" as the type for the media field
4. Set Binary Property to `image` (from Step 2)

### Step 4: Publish Node (Already exists)
Your existing publish node should work as-is:
```
URL: https://graph.facebook.com/v18.0/{{ $json.body.instagramUserID }}/media_publish
Method: POST
Body Content Type: Form URL Encoded
Body Fields:
  - creation_id: {{ $json.id }}
  - access_token: {{ $json.body.accessToken }}
```

## Visual Reference

```
[Webhook] → [Download Image] → [Upload to IG] → [Publish]
```

## Troubleshooting

### Error: "No binary property found"
- Make sure Step 2 downloads the image correctly
- Verify the Binary Property name matches in both nodes

### Error: "Invalid image format"
- Ensure the image is a valid JPEG or PNG
- Try adding `media_type: IMAGE` in the form data

### Still getting download errors
- Add this to form data: `media_type: IMAGE`
- Or try using an external image hosting service

## Alternative: Use External Image Hosting

If binary upload doesn't work, consider using a service like:
- Cloudinary (recommended)
- ImgBB
- Imgur

This would require modifying the backend to upload images to the external service first.
