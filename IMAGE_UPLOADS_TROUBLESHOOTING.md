# Image Upload Troubleshooting Guide: 404s and CSP Blocks

## The Problem
When running the UMKM Marketplace backend on ephemeral cloud hosting (like the free tier of Railway, Heroku, or Render), you might notice that previously uploaded product images suddenly fail to load, resulting in:
1. `404 Not Found` errors in the network tab.
2. Content Security Policy (CSP) violations if you try to hotlink external images.

## 1. The 404 Error: Ephemeral Filesystems
**Symptom:** Images uploaded to the application work perfectly fine for a while, but after a code push or a backend restart, they all break and return `404 Not Found`.

**Root Cause:** The backend currently saves uploaded images (like product photos and business logos) directly to its local filesystem (e.g., inside an `uploads/` directory on the server). 

Platforms like Railway use **ephemeral containers**. This means that every time the app is redeployed, restarted, or wakes up from sleep:
- A brand new, fresh container is spun up.
- The old container and its persistent hard drive (including all user-uploaded files) are completely deleted.
- Only the source code from Git is preserved.

**The Fix:**
- **Short-term:** For testing and simulation purposes, you must re-upload your images or re-run your `simulation.js` seed script after every backend redeployment to recreate the local files.
- **Long-term (Production):** The application architecture must be updated to use persistent cloud storage like **AWS S3, Cloudinary, or Supabase Storage**. Instead of saving the file to `uploads/`, the backend should upload the image to S3 and save the resulting public URL to the MongoDB database.

## 2. The Content Security Policy (CSP) Block
**Symptom:** Trying to load an image via a URL from an external domain (like `imgur.com`) results in an error in the Chrome/Edge console:
```
Refused to load the image '<URL>' because it violates the following Content Security Policy directive: "img-src 'self' data: blob: <ALLOWED_URLS>..."
```

**Root Cause:** The `frontend/index.html` file contains a strict `<meta http-equiv="Content-Security-Policy">` tag. This is a crucial security feature that prevents Cross-Site Scripting (XSS) attacks by explicitly listing out exactly which domains the browser is allowed to download images from.

If you attempt to load an image URL from a domain that is *not* explicitly on that whitelist, the browser will block it for your protection.

**The Fix:**
If you need to support a new external image host, you must edit `frontend/index.html` and append the new domain to the `img-src` directive of the CSP meta tag.

Currently allowed image domains include:
- `https://umkm-marketplace-production.up.railway.app`
- `https://images.unsplash.com`
- `https://source.unsplash.com`
- `https://picsum.photos`
- `https://loremflickr.com`
