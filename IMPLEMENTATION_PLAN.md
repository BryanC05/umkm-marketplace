# MSME Marketplace - Implementation Plan
## Instagram Auto-Posting & Social Media Links Feature

---

## Executive Summary

This document outlines the implementation plan for two major features:

1. **Instagram Auto-Posting** - Automatically post products to Instagram when sellers create new listings
2. **Social Media Links** - Allow all users to add social media links to their profile/store page with auto-detected icons

**Target Users:** 
- All users (social links)
- Sellers only (Instagram auto-posting)
- Premium members (custom Instagram captions)

**Timeline:** To be determined

---

# Part 1: Instagram Auto-Posting Feature

## 1.1 Feature Overview

| Item | Details |
|------|---------|
| **Trigger** | Automatic when seller creates a new product (if toggle ON) |
| **Content** | Product image + name + price + seller info + product link |
| **Integration** | Meta Instagram Graph API via n8n |
| **Requirement** | Seller must connect Instagram account first |

## 1.2 Architecture

```
Product Created → Backend Checks IG Connected → Toggle ON? 
    → Call n8n webhook → Instagram Graph API → Posted to Instagram
    → Return result to user (success/failure notification)
```

## 1.3 Data Flow

```
1. Seller connects Instagram (OAuth)
   └─> Store: instagram_user_id, access_token, is_connected: true

2. Seller creates product + toggles "Post to Instagram"
   └─> API checks if Instagram connected
   └─> If connected → Call n8n webhook with product data

3. n8n receives webhook
   └─> Fetches product image, builds caption
   └─> Posts to Instagram via Graph API

4. Result returned to user
   └─> Show "Posted to Instagram ✓" or "Failed to post ⚠" toast
   └─> Product is still created regardless of IG post result
```

## 1.4 Backend Requirements

### User Model Schema
```go
type InstagramAccount struct {
    InstagramUserID string    `bson:"instagramUserID"`
    Username        string    `bson:"username"`
    AccessToken     string    `bson:"accessToken"` // encrypted
    IsDefault       bool      `bson:"isDefault"`
    ConnectedAt     time.Time `bson:"connectedAt"`
}

type User struct {
    // ... existing fields
    InstagramAccounts []InstagramAccount `bson:"instagramAccounts"`
}
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/instagram/status` | Get connected Instagram accounts |
| GET | `/api/users/instagram/connect` | OAuth redirect URL |
| GET | `/api/users/instagram/callback` | OAuth callback |
| POST | `/api/users/instagram/disconnect` | Remove account |
| POST | `/api/users/instagram/set-default` | Set default posting account |

### Caption Formats

**Default (All Users):**
```
🛍️ {product_name}
💰 Rp {price}
🏪 {store_name}
🔗 {product_link}
```

**Premium Custom (Premium Members):**
```
{user_custom_text}
---
🛍️ {product_name}
💰 Rp {price}
🏪 {store_name}
🔗 {product_link}
```

## 1.5 Feature Comparison: Free vs Premium

| Feature | Free Seller | Premium Member |
|---------|-------------|----------------|
| Connect Instagram account | ✅ | ✅ |
| Auto-post to IG | ✅ | ✅ |
| Fixed caption format | ✅ | ✅ |
| Custom caption | ❌ | ✅ |
| Multiple IG accounts | ✅ | ✅ |

## 1.6 Toggle Behavior

- Toggle state saved in **AsyncStorage** (`user_pref_instagram_post`)
- Default state: **OFF** (false)
- Persists between sessions - user doesn't need to toggle repeatedly

---

# Part 2: Social Media Links Feature

## 2.1 Feature Overview

| Item | Details |
|------|---------|
| **Target Users** | ALL users (buyers + sellers) |
| **Platforms** | Instagram, TikTok, Facebook, Twitter/X, YouTube, WhatsApp, Website |
| **Display** | Profile page + Store page (for sellers) |
| **Link Types** | Profile links + Store links (separate option for sellers) |

## 2.2 Data Model

```go
type SocialLink struct {
    Platform string `bson:"platform"` // instagram, tiktok, facebook, etc.
    URL      string `bson:"url"`
}

type User struct {
    // ... existing fields
    SocialLinks      []SocialLink `bson:"socialLinks"`       // Profile links
    StoreSocialLinks []SocialLink `bson:"storeSocialLinks"`   // Separate store links (optional)
}
```

## 2.3 Platform Detection

| URL Pattern | Platform | Icon | Color |
|-------------|----------|------|-------|
| `instagram.com/*` | Instagram | Logo | #E4405F |
| `tiktok.com/*` | TikTok | Logo | #000000 |
| `facebook.com/*` or `fb.com/*` | Facebook | Logo | #1877F2 |
| `twitter.com/*` or `x.com/*` | Twitter/X | Logo | #1DA1F2 |
| `youtube.com/*` | YouTube | Logo | #FF0000 |
| `wa.me/*` or `whatsapp.com/*` | WhatsApp | Logo | #25D366 |
| (any other) | Website | Globe | #666666 |

## 2.4 Link Management

| User Type | Profile Links | Store Links |
|-----------|---------------|-------------|
| Buyer | ✅ Add/Edit/Remove | N/A |
| Seller | ✅ Add/Edit/Remove | ✅ Add/Edit/Remove (optional) |

### Store Links Fallback Logic
```
if (user.storeSocialLinks is empty) 
    → Display user.socialLinks instead
else 
    → Display user.storeSocialLinks
```

## 2.5 Validation Rules

| Rule | Constraint |
|------|------------|
| URL Format | Must start with `http://` or `https://` |
| Max Links | Maximum 5 links per category |
| Platform Detection | Auto-detect from URL pattern |
| Required | Platform field (auto-detected) |

---

# Part 3: UI/UX Design

## 3.1 Mobile - Profile Screen

```
┌─────────────────────────────┐
│  👤 User Name               │
│  📍 Location                │
│                             │
│  [📷] [📘] [🎵] [🌐] [💬] │  ← Social icons row (clickable)
│                             │
│  ┌─────────────────────┐    │
│  │     Product Grid    │    │
│  └─────────────────────┘    │
└─────────────────────────────┘
```

## 3.2 Mobile - Manage Social Links Screen

```
┌─────────────────────────────┐
│  ← Social Media Links       │
│                             │
│  Profile Links               │
│  ┌────────────────────────┐ │
│  │ 📷 instagram.com/abc   │ │
│  │ 🎵 tiktok.com/@xyz    │ │
│  │ 📘 facebook.com/page   │ │
│  └────────────────────────┘ │
│  [+ Add Link]               │
│                             │
│  ─────────────────────────  │
│                             │
│  Store Links                │
│                             │
│  (•) Same as profile       │
│  ( ) Custom                │
│                             │
│  ┌────────────────────────┐ │
│  │ 📘 facebook.com/store  │ │
│  │ 🌐 mywebsite.com      │ │
│  └────────────────────────┘ │
│  [+ Add Link]               │
│                             │
└─────────────────────────────┘
```

### Add Link Form
```
┌─────────────────────────────┐
│  ← Add Social Link          │
│                             │
│  Platform                   │
│  [Instagram          ▼]     │  ← Auto-detected
│                             │
│  URL                        │
│  [https://instagram.com/..] │
│                             │
│  Preview:                   │
│  [📷] https://instagram...  │
│                             │
│  [Cancel]    [Save]         │
└─────────────────────────────┘
```

## 3.3 Mobile - Store Screen (Sellers)

```
┌─────────────────────────────┐
│  [Store Banner Image]       │
│                             │
│  🏪 Store Name        ✓    │
│  📍 Location                │
│                             │
│  [📷][📘][🎵][🌐][💬]     │  ← Social icons (clickable)
│                             │
│  ┌─────────────────────┐    │
│  │ Products Grid       │    │
│  └─────────────────────┘    │
└─────────────────────────────┘
```

## 3.4 Mobile - Instagram Settings Screen

```
┌─────────────────────────────┐
│  ← Instagram Connection     │
│                             │
│  Connected Accounts         │
│  ┌────────────────────────┐ │
│  │ 📷 @my_store           │ │
│  │    Default ✓           │ │
│  │    [Disconnect]        │ │
│  └────────────────────────┘ │
│  [+ Connect Instagram]     │
│                             │
│  ─────────────────────────  │
│                             │
│  Posting Preferences       │
│  ┌────────────────────────┐ │
│  │ Auto-post products     │ │
│  │ [━━━━━━━━●━━━━━] ON   │ │
│  └────────────────────────┘ │
│                             │
└─────────────────────────────┘
```

## 3.5 Mobile - Add Product Screen (Instagram Toggle)

```
┌─────────────────────────────┐
│  ← Add Product              │
│                             │
│  Product Images             │
│  [+ Add up to 5]           │
│                             │
│  Name *                     │
│  [________________]         │
│                             │
│  Description                │
│  [____________________]     │
│                             │
│  Price *                    │
│  [________________]         │
│                             │
│  ─────────────────────────  │
│                             │
│  📷 Post to Instagram      │
│  [━━━━━━━━●━━━━━] ON       │
│                             │
│  [Cancel]    [Publish]      │
└─────────────────────────────┘
```

---

# Part 4: Technical Implementation

## 4.1 File Changes Summary

### Backend (Go)

| File | Changes | Status |
|------|---------|--------|
| `internal/models/user.go` | Add `InstagramAccounts`, `SocialLinks`, `StoreSocialLinks` fields | ✅ COMPLETED |
| `internal/models/integrated in user.go` | InstagramAccount & SocialLink models | ✅ COMPLETED |
| `internal/handlers/instagram.go` | New - OAuth, connect, disconnect, status handlers | ✅ COMPLETED |
| `internal/handlers/social.go` | New - Social links CRUD handlers | ✅ COMPLETED |
| `cmd/server/main.go` | Register new routes | ✅ COMPLETED |
| `.env` | Add INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET, INSTAGRAM_REDIRECT_URI | ✅ COMPLETED |
| `.env.example` | Add all Instagram env variables | ✅ COMPLETED |

### Mobile (React Native/Expo)

| File | Changes | Status |
|------|---------|--------|
| `src/screens/seller/InstagramScreen.js` | New - Connect/disconnect Instagram | ⏳ PENDING |
| `src/screens/seller/AddProductScreen.js` | Add Instagram toggle | ⏳ PENDING |
| `src/screens/profile/SocialLinksScreen.js` | New - Manage social links | ⏳ PENDING |
| `src/screens/profile/ProfileScreen.js` | Add social icons row | ⏳ PENDING |
| `src/screens/seller/StoreScreen.js` | Add social icons (with fallback) | ⏳ PENDING |
| `src/navigation/AppNavigator.js` | Add routes | ⏳ PENDING |
| `src/i18n/en.js` | Add translations | ⏳ PENDING |
| `src/i18n/id.js` | Add translations | ⏳ PENDING |

## 4.2 API Endpoints Summary

### Instagram
| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | `/api/users/instagram/status` | List connected accounts | ✅ COMPLETED |
| GET | `/api/users/instagram/connect` | Get OAuth URL | ✅ COMPLETED |
| GET | `/api/users/instagram/callback` | OAuth callback | ✅ COMPLETED |
| POST | `/api/users/instagram/disconnect` | Remove account | ✅ COMPLETED |
| POST | `/api/users/instagram/set-default` | Set default | ✅ COMPLETED |

### Social Links
| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | `/api/users/social-links` | Get current user's social links | ✅ COMPLETED |
| GET | `/api/users/:id/social-links` | Get public user's social links | ✅ COMPLETED |
| PUT | `/api/users/social-links` | Update social links (both profile & store) | ✅ COMPLETED |
| POST | `/api/users/social-links` | Add single social link | ✅ COMPLETED |
| DELETE | `/api/users/social-links?platform=instagram` | Remove social link | ✅ COMPLETED |

## 4.3 Translation Keys

### English (en.js)
```javascript
// Instagram
instagram: 'Instagram',
connectInstagram: 'Connect Instagram',
disconnectInstagram: 'Disconnect',
connected: 'Connected',
postToInstagram: 'Post to Instagram',
autoPostEnabled: 'Auto-post new products',
instagramPostSuccess: 'Posted to Instagram!',
instagramPostFailed: 'Failed to post to Instagram',
customizeCaption: 'Customize Caption (Premium)',
captionPlaceholder: 'Write your caption...',

// Social Links
socialLinks: 'Social Media Links',
addSocialLink: 'Add Social Link',
editSocialLink: 'Edit Social Link',
removeSocialLink: 'Remove',
platform: 'Platform',
url: 'URL',
enterUrl: 'Enter URL',
invalidUrl: 'Please enter a valid URL',
linkOpened: 'Link opened',
profileLinks: 'Profile Links',
storeLinks: 'Store Links',
sameAsProfile: 'Same as profile',
custom: 'Custom',
instagram: 'Instagram',
tiktok: 'TikTok',
facebook: 'Facebook',
twitter: 'Twitter/X',
youtube: 'YouTube',
whatsapp: 'WhatsApp',
website: 'Website',
maxLinksReached: 'Maximum 5 links allowed',
```

### Indonesian (id.js)
```javascript
// Instagram
instagram: 'Instagram',
connectInstagram: 'Hubungkan Instagram',
disconnectInstagram: 'Putuskan Hubungan',
connected: 'Terhubung',
postToInstagram: 'Posting ke Instagram',
autoPostEnabled: 'Posting otomatis produk baru',
instagramPostSuccess: 'Berhasil posting ke Instagram!',
instagramPostFailed: 'Gagal posting ke Instagram',
customizeCaption: 'Kustomisasi Caption (Premium)',
captionPlaceholder: 'Tulis caption Anda...',

// Social Links
socialLinks: 'Tautan Media Sosial',
addSocialLink: 'Tambah Tautan',
editSocialLink: 'Edit Tautan',
removeSocialLink: 'Hapus',
platform: 'Platform',
url: 'URL',
enterUrl: 'Masukkan URL',
invalidUrl: 'Silakan masukkan URL yang valid',
linkOpened: 'Tautan dibuka',
profileLinks: 'Tautan Profil',
storeLinks: 'Tautan Toko',
sameAsProfile: 'Sama dengan profil',
custom: 'Kustom',
instagram: 'Instagram',
tiktok: 'TikTok',
facebook: 'Facebook',
twitter: 'Twitter/X',
youtube: 'YouTube',
whatsapp: 'WhatsApp',
website: 'Situs Web',
maxLinksReached: 'Maksimal 5 tautan diperbolehkan',
```

---

# Part 5: n8n Workflow

## 5.1 Instagram Post Workflow

```
┌──────────────┐
│  Webhook     │  ← Receive product data from backend
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Instagram   │  ← Post image + caption
│  Node        │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Response    │  ← Return success/failure
└──────────────┘
```

### Workflow Data Input
```json
{
  "productName": "Handmade Bamboo Basket",
  "productPrice": "Rp 150.000",
  "storeName": "Bamboo Crafts",
  "productLink": "https://msmehub.app/product/123",
  "productImage": "https://...",
  "accessToken": "IGQV...",
  "caption": "🛍️ Handmade Bamboo Basket\n💰 Rp 150.000\n🏪 Bamboo Crafts\n🔗 https://msmehub.app/product/123"
}
```

---

# Part 6: Implementation Priority

## Phase 1: Backend Foundation ✅ COMPLETED
1. ✅ Update User model with new fields
2. ✅ Create Instagram handlers
3. ✅ Create Social links handlers
4. ✅ Register routes

## Phase 2: Mobile - Social Links ⏳ PENDING
1. Add social icons to Profile screen
2. Create SocialLinksScreen
3. Add icons to Store screen with fallback
4. Add translations

## Phase 3: Mobile - Instagram Connection ⏳ PENDING
1. Create InstagramScreen
2. Implement OAuth flow
3. Add toggle to AddProductScreen
4. Persist toggle state

## Phase 4: Integration ⏳ PENDING
1. Connect backend to n8n webhook
2. Test end-to-end flow
3. Add error handling & notifications

---

## Implementation Notes

### Instagram OAuth Setup Required
Before the Instagram features work, you need to:
1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create an App → Add Instagram product
3. Get `INSTAGRAM_APP_ID` and `INSTAGRAM_APP_SECRET`
4. Set `INSTAGRAM_REDIRECT_URI` to your callback URL
5. Add these to your `.env` file

### Current .env Configuration
```
# Already in .env (for n8n platform posting):
IG_ACCESS_TOKEN=...
IG_ACCOUNT_ID=...

# Need to add (for user OAuth):
INSTAGRAM_APP_ID=your_app_id
INSTAGRAM_APP_SECRET=your_app_secret
INSTAGRAM_REDIRECT_URI=https://your-domain.com/api/users/instagram/callback
```

# Appendix: Notes

## A.1 Instagram API Cost
- **100% FREE** - Meta provides Instagram Graph API at no cost
- Only costs: optional ads (if promoting posts)

## A.2 Token Management
- Use Meta's long-lived access tokens
- Tokens refresh automatically via Meta's API
- Store tokens encrypted in MongoDB

## A.3 Error Handling
- If Instagram posting fails → Product still created, notify user
- Show toast: "Product created but failed to post to Instagram"

## A.4 Feature Access Matrix

| Feature | All Users | Sellers | Premium |
|---------|-----------|---------|---------|
| Add social links to profile | ✅ | ✅ | ✅ |
| Add separate store links | ❌ | ✅ | ✅ |
| Display icons on profile | ✅ | ✅ | ✅ |
| Display icons on store | ❌ | ✅ | ✅ |
| Clickable → navigate | ✅ | ✅ | ✅ |
| Instagram auto-posting | ❌ | ✅ | ✅ |
| Custom IG caption | ❌ | ❌ | ✅ |

---

**Document Version:** 1.0  
**Created:** 5th March 2026  
**Last Updated:** 5th March 2026  
**Status:** Ready for Implementation
