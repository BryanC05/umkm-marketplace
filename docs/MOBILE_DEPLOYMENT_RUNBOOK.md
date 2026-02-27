# Mobile Deployment Runbook

This runbook covers the full Android release flow for the mobile app, from merging deployment-prep changes to staged production rollout.

## 1. Merge Deployment-Prep PR

1. Open PR:
   - `https://github.com/BryanC05/umkm-marketplace/pull/new/release-mobile-deployment-prep`
2. Review changed files.
3. Merge into `main`.

## 2. Sync Local Main

```bash
git checkout main
git pull origin main
cd mobile
npm install
```

## 3. Configure EAS Environment and Secrets

Required values:
- `EXPO_PUBLIC_API_HOST=https://umkm-marketplace-production.up.railway.app`
- `MAPS_API_KEY=<your-android-google-maps-key>`

Set secret in EAS:

```bash
cd mobile
npx eas-cli@latest secret:create --scope project --name MAPS_API_KEY --value "<your-android-google-maps-key>"
```

Notes:
- `EXPO_PUBLIC_API_HOST` is already set in `mobile/eas.json` for build profiles.
- Keep Maps key out of source code.

## 4. Preflight Validation

```bash
cd mobile
npm run check:release
```

Must pass before production build.

## 5. Build Release Artifact (AAB)

```bash
cd mobile
npm run build:android:production
```

This runs preflight validation and then:
- `eas build --platform android --profile production`

## 6. Play Console Internal Testing

1. Go to `Testing > Internal testing`.
2. Create release.
3. Upload generated AAB.
4. Add release notes.
5. Add tester emails/group.
6. Roll out internal test.

## 7. Internal QA Checklist (Physical Devices)

1. Login/register
2. Product browsing/search/detail
3. Cart + checkout
4. Nearby/location flows
5. Chat + notifications
6. Order lifecycle screens
7. No critical crash on cold start/background-resume

## 8. Play Console Compliance Forms

Complete before production rollout:

1. App access
2. Data safety
3. Content rating
4. Ads declaration
5. Privacy policy URL

## 9. Production Rollout (Staged)

1. Promote tested build to production.
2. Rollout progression:
   - 10% -> 50% -> 100%
3. Monitor after each stage:
   - Crash/ANR
   - Auth errors
   - Notification delivery
   - API/network error spikes

## 10. Rollback Plan

If severe issue appears:

1. Halt rollout in Play Console.
2. Promote last stable build.
3. Patch on a new hotfix branch.
4. Re-run this runbook from Step 3.

## 11. Optional Commands

Login/check EAS session:

```bash
cd mobile
npx eas-cli@latest login
npx eas-cli@latest whoami
```

View recent builds:

```bash
cd mobile
npx eas-cli@latest build:list --platform android
```

## Definition of Release-Ready

1. Deployment-prep PR merged to `main`.
2. `npm run check:release` passes.
3. Production AAB built successfully.
4. Internal test sign-off completed.
5. Play compliance forms completed.
6. Staged rollout completed without critical regressions.
