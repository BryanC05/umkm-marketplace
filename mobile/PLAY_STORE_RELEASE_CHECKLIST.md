# Play Store Release Checklist (Android, Expo/EAS)

This checklist is tailored to the current project configuration:
- Android package: `com.msmemarketplace.mobile` (`mobile/app.config.js`)
- EAS project ID: `034edfa1-ecd5-47df-b050-47725a620224` (`mobile/app.config.js`)
- Production build profile: `production` (`mobile/eas.json`)

**Last Updated:** 2026-02-28  
**Overall Status:** ⚠️ **NOT READY** - Several critical items pending

---

## 1. One-Time Setup

- [ ] Create Google Play Developer account ($25 one-time fee).
- [ ] Create app in Play Console with package name `com.msmemarketplace.mobile`.
- [ ] Create Expo account (if not already).
- [ ] Login with EAS CLI (no global install required):

```bash
cd mobile
npx eas-cli@latest login
```

**Status:** ❌ Not started

---

## 2. Pre-Release Checks

- [x] Backend is deployed and reachable from mobile (`mobile/src/config/index.js`).
  - **Configured:** `https://umkm-marketplace-production.up.railway.app`
- [x] `EXPO_PUBLIC_API_HOST` is set in EAS `production` profile env.
  - **Location:** `mobile/eas.json` production profile
- [ ] `GOOGLEMAPS_API_KEY` is configured as EAS secret for Android builds. 🔴 **CRITICAL**
  - **Action Required:**
    ```bash
    cd mobile
    npx eas secret:create --name GOOGLEMAPS_API_KEY --value "your_actual_api_key"
    ```
- [ ] Location permission flows work on physical device.
- [ ] Login/register works on physical Android device.
- [ ] Product list, product detail, cart, checkout, nearby sellers, chat all work.
- [ ] No critical crash in release-like testing.
- [ ] App icon/splash are final (`mobile/app.config.js`, `mobile/assets`).
- [ ] Privacy policy URL is ready. 🔴 **REQUIRED for Play Store**

**Status:** ⚠️ Partially complete - Testing and privacy policy needed

---

## 3. Build Configuration

### ✅ Completed:
- [x] `app.config.js` created with dynamic configuration
- [x] Google Maps SDK configured for Android (`provider={PROVIDER_GOOGLE}`)
- [x] EAS project ID configured
- [x] `eas.json` with production profile and auto-increment
- [x] Environment variables set for all build profiles
- [x] `react-native-maps` installed and configured

### Build Commands:

**Preview Build (APK for testing):**
```bash
cd mobile
npx eas build --platform android --profile preview
```

**Production Build (AAB for Play Store):**
```bash
cd mobile
npm run check:release
npx eas build --platform android --profile production
```

**Notes:**
- `preview` profile creates APK for internal install/testing.
- Play Store upload should use AAB from `production`.

---

## 4. Play Console (Internal Testing First)

- [ ] Go to `Testing > Internal testing`.
- [ ] Create release and upload the AAB from EAS build.
- [ ] Add release notes.
- [ ] Add tester emails/group.
- [ ] Roll out internal test.

**Status:** ❌ Not started - Requires Play Console setup first

---

## 5. Play Console Mandatory Forms

- [ ] App access (if login required).
- [ ] Data safety form.
- [ ] Content rating questionnaire.
- [ ] Ads declaration.
- [ ] Target audience/News declaration (if prompted).
- [ ] Privacy policy URL added.

**Status:** ❌ Not started

---

## 6. Production Rollout

- [ ] Promote tested build to production.
- [ ] Use staged rollout (example: 10% -> 50% -> 100%).
- [ ] Monitor crashes/ANR and user feedback after each stage.

**Status:** ❌ Not started

---

## 7. EAS Secrets Setup

The following secrets should be configured in EAS:

| Secret Name | Status | Description |
|-------------|--------|-------------|
| `GOOGLEMAPS_API_KEY` | ❌ Missing | Google Maps API key for Android |
| `EXPO_PUBLIC_API_HOST` | ✅ Set | Backend API URL (in eas.json) |

**To add missing secrets:**
```bash
cd mobile
npx eas secret:create --name GOOGLEMAPS_API_KEY --value "AIza..."
```

---

## 8. Common Issues

- `eas: command not found`:
  - Use `npx eas-cli@latest ...` instead of global install.
- `EACCES` during global npm install:
  - Avoid `npm install -g eas-cli`; use `npx` flow.
- Build uploaded but not accepted:
  - Verify package name matches Play app exactly: `com.msmemarketplace.mobile`.
- App cannot call API after install:
  - Verify `mobile/src/config/index.js` points to deployed backend, not localhost.
- Google Maps shows blank/gray tiles:
  - Verify `GOOGLEMAPS_API_KEY` is set as EAS secret and API key has Maps SDK for Android enabled.

---

## 9. Testing Checklist (Before Release)

Test on a physical Android device (not emulator):

- [ ] App launches without crash
- [ ] Login works
- [ ] Registration works
- [ ] Product list loads
- [ ] Product detail opens
- [ ] Add to cart works
- [ ] Cart shows items
- [ ] Checkout flow works
- [ ] Nearby sellers map loads with Google Maps
- [ ] Location picker works
- [ ] Chat functionality works
- [ ] Push notifications work
- [ ] No console errors in production build

---

## Summary

| Phase | Status | Blockers |
|-------|--------|----------|
| Configuration | ✅ Complete | None |
| One-Time Setup | ❌ Not Started | Google Play account ($25) |
| EAS Secrets | ⚠️ Partial | Missing GOOGLEMAPS_API_KEY |
| Testing | ❌ Not Started | Physical device needed |
| Play Console | ❌ Not Started | Account setup required |
| Mandatory Forms | ❌ Not Started | Privacy policy URL needed |

**Estimated Time to Release:** 2-5 days (depending on account setup and testing)

---

## 10. Store Listing Setup

Before releasing, complete your Play Store listing:

### Required Assets:
- [ ] **App Icon:** 512x512px PNG (transparent background)
- [ ] **Feature Graphic:** 1024x500px PNG/JPG
- [ ] **Phone Screenshots:** 2-8 screenshots (16:9 or 9:16 aspect ratio)
- [ ] **Tablet Screenshots:** Optional but recommended
- [ ] **Short Description:** Up to 80 characters
- [ ] **Full Description:** Up to 4,000 characters
- [ ] **App Title:** Up to 30 characters (e.g., "MSME Marketplace")

### Suggested Store Listing Content:

**Short Description:**
```
Buy and sell products from local MSMEs. Chat, order, and track deliveries easily.
```

**Full Description Template:**
```
MSME Marketplace connects you with local small businesses and entrepreneurs.

FOR BUYERS:
• Browse products from verified local sellers
• Chat directly with sellers
• Track your orders in real-time
• Find nearby sellers on the map
• Secure checkout process

FOR SELLERS:
• Create your digital store in minutes
• Manage products and inventory
• Receive orders and chat with customers
• Track sales and analytics
• Get discovered by local buyers

FEATURES:
✓ Real-time chat between buyers and sellers
✓ Location-based seller discovery
✓ Order tracking and delivery updates
✓ Push notifications for orders and messages
✓ Multiple product categories
✓ Secure and easy-to-use interface

Download now and support local businesses!
```

---

## 11. App Signing & Security

### App Signing Key:
When you upload your first build, Google Play will:
1. Create an app signing key for you (recommended)
2. Or you can use your own upload key

**Important:** Keep your signing key secure - you cannot change it later!

### API Key Security:
- `GOOGLEMAPS_API_KEY` is restricted by package name in Google Cloud Console
- Backend API URL is configured in EAS, not hardcoded
- No sensitive keys are committed to the repository

---

## 12. Data Safety Form (Detailed)

Google Play requires accurate data safety information. Here's how to fill it out:

### Data Collection:
| Data Type | Collected? | Purpose |
|-----------|------------|---------|
| Email address | ✅ Yes | Account creation, login, notifications |
| Name | ✅ Yes | User profile, seller identification |
| Phone number | ✅ Yes | Order delivery, seller contact |
| Location (precise) | ✅ Yes | Nearby seller discovery, delivery |
| Photos/Videos | ✅ Yes | Product images, profile photos |
| App interactions | ✅ Yes | Analytics, improving user experience |
| Crash logs | ✅ Yes | Debugging, app stability |

### Data Sharing:
- **With other users:** Yes - Seller info shared with buyers for orders
- **With third parties:** No - We don't sell data to third parties
- **With service providers:** Yes - Google Maps, Firebase (for analytics/crashlytics)

### Data Handling:
- **Encrypted in transit:** ✅ Yes (HTTPS)
- **Encrypted at rest:** ✅ Yes
- **Users can request data deletion:** Yes, via account settings

---

## 13. Content Rating Questionnaire

You'll need to answer questions about:

### Content Categories:
- **Violence:** None (unless product images show violence, but unlikely)
- **Fear/Horror:** None
- **Sex/Nudity:** None (user-generated content may contain product photos - select "Mild" if any chance)
- **Language:** None to Mild (user chat content)
- **Drugs:** None (unless selling health/beauty products with certain ingredients)
- **Gambling:** None
- **In-app purchases:** Yes (sellers pay membership fees)

### Expected Rating: **PEGI 3** or **ESRB Everyone**

---

## 14. Pre-Launch Test Checklist

Run through these tests before submitting to Play Store:

### Installation & Launch:
- [ ] Fresh install from APK works
- [ ] App launches within 5 seconds
- [ ] No immediate crashes on launch
- [ ] Splash screen displays correctly

### Authentication:
- [ ] Registration with email/password works
- [ ] Login with credentials works
- [ ] Password reset flow works
- [ ] Biometric login works (if device supports)

### Core Features:
- [ ] Home screen loads products
- [ ] Product search works
- [ ] Product categories filter correctly
- [ ] Product detail page opens
- [ ] Add to cart works
- [ ] Cart shows correct items/prices
- [ ] Checkout process completes
- [ ] Orders appear in order history

### Maps & Location:
- [ ] Location permission dialog appears
- [ ] Nearby sellers load on map
- [ ] Map markers are tappable
- [ ] Location picker works for addresses

### Chat & Notifications:
- [ ] Chat list loads
- [ ] Can send/receive messages
- [ ] Push notifications received
- [ ] Notification tap opens correct screen

### Seller Features (if applicable):
- [ ] Can add product
- [ ] Can upload product images
- [ ] Can set product location
- [ ] Orders received show in dashboard

### Edge Cases:
- [ ] App works offline (shows cached data)
- [ ] Handles no internet gracefully
- [ ] Handles API errors with user-friendly messages
- [ ] Back button navigation works correctly

---

## 15. Post-Release Monitoring

After publishing, monitor these metrics:

### Google Play Console Metrics:
- **Crashes & ANRs:** Should be < 1% of sessions
- **Battery Usage:** Should not be excessive
- **Startup Time:** Should be < 5 seconds
- **App Size:** Current AAB size (check in EAS build details)

### User Feedback:
- Read all 1-star and 2-star reviews first
- Respond to negative reviews professionally
- Track feature requests in reviews

### Key Events to Monitor:
- First week: Check for crashes hourly
- First month: Monitor ratings daily
- Ongoing: Review analytics weekly

---

## 16. Marketing Launch Checklist

### Before Launch:
- [ ] Prepare social media announcements
- [ ] Create launch graphics/posts
- [ ] Notify existing web users about the app
- [ ] Prepare email newsletter announcement
- [ ] Set up app install campaigns (optional)

### At Launch:
- [ ] Post on all social channels
- [ ] Send email to user base
- [ ] Ask friends/family to download and review
- [ ] Respond to early reviews quickly

### Post-Launch:
- [ ] Monitor app store optimization (ASO) ranking
- [ ] Collect user feedback for improvements
- [ ] Plan first update based on initial feedback

---

## 17. Quick Reference Commands

### Development:
```bash
# Start development server
cd mobile && npx expo start

# Build for testing
cd mobile && npx eas build --platform android --profile preview

# Build for production
cd mobile && npm run check:release && npx eas build --platform android --profile production
```

### EAS Management:
```bash
# Login to EAS
npx eas-cli@latest login

# Check build status
npx eas-cli@latest build:list

# Add secrets
npx eas secret:create --name SECRET_NAME --value "secret_value"

# View project info
npx eas-cli@latest project:info
```

### Play Console:
```bash
# Access Play Console
https://play.google.com/console

# App deep link (after published)
https://play.google.com/store/apps/details?id=com.msmemarketplace.mobile
```

---

## 18. Support & Resources

### Documentation:
- [Expo Documentation](https://docs.expo.dev/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer)

### Community:
- [Expo Discord](https://chat.expo.dev/)
- [React Native Community](https://reactnative.dev/community/support)

### Emergency Contacts:
- Expo Status: https://status.expo.dev/
- Google Play Developer Support: Through Play Console

---

## Appendix A: File Locations

| File | Purpose |
|------|---------|
| `mobile/app.config.js` | Expo app configuration |
| `mobile/eas.json` | EAS build profiles |
| `mobile/package.json` | Dependencies and scripts |
| `mobile/src/config/index.js` | API configuration |
| `mobile/GOOGLE_MAPS_SETUP.md` | Google Maps documentation |

---

## Appendix B: Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | TBD | Initial Play Store release |

---

**Document Version:** 2.0  
**Last Updated:** 2026-03-01  
**Maintained by:** Development Team
