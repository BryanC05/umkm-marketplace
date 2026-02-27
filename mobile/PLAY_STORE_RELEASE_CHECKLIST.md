# Play Store Release Checklist (Android, Expo/EAS)

This checklist is tailored to the current project configuration:
- Android package: `com.msmemarketplace.mobile` (`mobile/app.json`)
- EAS project ID: `034edfa1-ecd5-47df-b050-47725a620224` (`mobile/app.json`)
- Production build profile: `production` (`mobile/eas.json`)

## 1. One-Time Setup

- [ ] Create Google Play Developer account.
- [ ] Create app in Play Console with package name `com.msmemarketplace.mobile`.
- [ ] Create Expo account (if not already).
- [ ] Login with EAS CLI (no global install required):

```bash
cd mobile
npx eas-cli@latest login
```

## 2. Pre-Release Checks

- [ ] Backend is deployed and reachable from mobile (`mobile/src/config/index.js`).
- [ ] `EXPO_PUBLIC_API_HOST` is set in EAS `production` profile env.
- [ ] `MAPS_API_KEY` is configured as EAS secret/env for Android builds.
- [ ] Location permission flows work.
- [ ] Login/register works on physical Android device.
- [ ] Product list, product detail, cart, checkout, nearby sellers, chat all work.
- [ ] No critical crash in release-like testing.
- [ ] App icon/splash are final (`mobile/app.json`, `mobile/assets`).
- [ ] Privacy policy URL is ready.

## 3. Versioning and Build

Your `eas.json` already uses:
- `"appVersionSource": "remote"`
- `"production": { "autoIncrement": true }`

Build AAB for Play Store:

```bash
cd mobile
npm run check:release
npx eas-cli@latest build --platform android --profile production
```

Notes:
- `preview` profile creates APK for internal install/testing.
- Play Store upload should use AAB from `production`.

## 4. Play Console (Internal Testing First)

- [ ] Go to `Testing > Internal testing`.
- [ ] Create release and upload the AAB from EAS build.
- [ ] Add release notes.
- [ ] Add tester emails/group.
- [ ] Roll out internal test.

## 5. Play Console Mandatory Forms

- [ ] App access (if login required).
- [ ] Data safety form.
- [ ] Content rating questionnaire.
- [ ] Ads declaration.
- [ ] Target audience/News declaration (if prompted).
- [ ] Privacy policy URL added.

## 6. Production Rollout

- [ ] Promote tested build to production.
- [ ] Use staged rollout (example: 10% -> 50% -> 100%).
- [ ] Monitor crashes/ANR and user feedback after each stage.

## 7. Optional: EAS Submit Automation

If you configure Google Play API service account credentials:

```bash
cd mobile
npx eas-cli@latest submit --platform android --profile production
```

## 8. Common Issues

- `eas: command not found`:
  - Use `npx eas-cli@latest ...` instead of global install.
- `EACCES` during global npm install:
  - Avoid `npm install -g eas-cli`; use `npx` flow.
- Build uploaded but not accepted:
  - Verify package name matches Play app exactly: `com.msmemarketplace.mobile`.
- App cannot call API after install:
  - Verify `mobile/src/config/index.js` points to deployed backend, not localhost.
