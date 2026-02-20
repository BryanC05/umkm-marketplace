# MSME Marketplace – Mobile App Guide

For Play Store publishing, use:
- [`PLAY_STORE_RELEASE_CHECKLIST.md`](./PLAY_STORE_RELEASE_CHECKLIST.md)

## Development Mode (Local Testing)

### Prerequisites
- Node.js installed
- MongoDB running (local or Atlas)
- Expo Go app on your phone (same WiFi network as your computer)

### Running Locally

```bash
# 1. Start the backend
cd go-backend
go mod download
go run ./cmd/server

# 2. Start the mobile app (in a separate terminal)
cd mobile
npm install
npx expo start --clear
```

Scan the QR code with Expo Go (Android) or Camera app (iOS).

### Updating After Code Changes

```bash
# Quick restart with cache clear
cd mobile && npm install && npx expo start --clear
```

If you're using Expo Go on a physical device, simply restart the app after the server restarts.

---

## Standalone Deployment (No Laptop Required)

To run the app independently without your computer, you need to:
1. **Deploy the backend** to a cloud server
2. **Build a standalone APK/IPA** for your phone

### Step 1: Deploy the Backend

Choose a cloud hosting provider:

| Provider | Free Tier | Setup Difficulty |
|----------|-----------|-----------------|
| [Railway](https://railway.app) | $5 credit/month | Easy |
| [Render](https://render.com) | Free (spins down after inactivity) | Easy |
| [Fly.io](https://fly.io) | Free tier available | Medium |
| VPS (DigitalOcean, etc.) | ~$5/month | Advanced |

#### Example: Deploy to Railway

1. Push your project to GitHub
2. Go to [railway.app](https://railway.app) and sign in with GitHub
3. Create a new project → "Deploy from GitHub Repo"
4. Select your repository and point it to the `/go-backend` folder
5. Add environment variables:
   - `MONGODB_URI` – your MongoDB Atlas connection string
   - `JWT_SECRET` – a secure random string
   - `PORT` – `5000`
6. Railway will give you a URL like `https://your-app.railway.app`

#### Update the Mobile App API URL

After deploying, update `mobile/src/api/api.js` to point to your deployed backend:

```javascript
// Change from localhost:
const API_URL = 'http://192.168.x.x:5000/api';

// To your deployed backend:
const API_URL = 'https://your-app.railway.app/api';
```

### Step 2: Build a Standalone APK (Android)

#### Prerequisites
- An [Expo](https://expo.dev) account (free)
- EAS CLI installed

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Log in to your Expo account
eas login
```

#### Configure EAS Build

```bash
cd mobile

# Initialize EAS (first time only)
eas build:configure
```

This creates an `eas.json` file. Use this configuration:

```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      },
      "distribution": "internal"
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

#### Build the APK

```bash
# Build a preview APK (direct install, no Play Store needed)
eas build --platform android --profile preview
```

The build runs on Expo's cloud servers (takes ~10-15 minutes). When done, you'll get a download link for the `.apk` file. Transfer it to your Android phone and install.

#### Build for iOS

```bash
# Requires an Apple Developer account ($99/year)
eas build --platform ios --profile production
```

### Step 3: Install on Your Phone

**Android:**
1. Download the `.apk` from the EAS build link
2. Transfer to your phone (email, Google Drive, direct download)
3. Open the file and tap "Install" (enable "Install from unknown sources" if prompted)

**iOS:**
1. Use TestFlight for internal distribution
2. Or submit to the App Store

---

## Feature Notes

### Logo Generator
The logo generator works in standalone APKs. It runs entirely through the backend server (using Pollinations AI), so as long as your deployed backend has internet access, logo generation will work without any issues.

### All Features Checklist
After deploying, verify these features work:
- [ ] User registration & login
- [ ] Browse & search products
- [ ] Add product (with images, location, tags)
- [ ] Nearby sellers map
- [ ] Chat / messaging
- [ ] Order placement & history
- [ ] Logo generator
- [ ] Forum
- [ ] Profile picture upload
- [ ] Dark mode

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Network Error" on phone | Make sure phone and computer are on the same WiFi. Check the API URL in `api.js` |
| Standalone APK can't connect | Ensure backend is deployed and `api.js` points to the deployed URL (not localhost) |
| Logo generator fails | Check that the deployed backend has outbound internet access |
| Location not working | Grant location permissions in phone settings |
| Images not uploading | Check backend has enough memory/storage for base64 processing |
