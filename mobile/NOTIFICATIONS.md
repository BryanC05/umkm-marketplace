# Mobile Push Notifications Feature

## Overview
The mobile app now fully supports in-app notifications and background local push notifications. This system leverages WebSockets for real-time delivery and Expo Notifications for native device integration.

## Architecture

1. **Backend (Go)**
   - When an event occurs (e.g., a "Test Notification" is requested), the Go backend creates a `models.Notification` document in MongoDB.
   - The backend then pushes a JSON payload over the active WebSocket connection to the specific user's `user-userID` room.

2. **Frontend (React Native / Expo)**
   - `AppNavigator.js` maintains a persistent WebSocket connection to the backend.
   - When a message of type `notification` is received over the socket, two things happen:
     1. The notification is added to the local Zustand state (`useNotificationStore`).
     2. `NotificationService.scheduleLocalNotification()` is called to physically drop down a Heads-Up banner on the device.

## Key Technical Decisions & Fixes

### 1. Android 14+ Exact Alarm Permissions
To schedule a notification (even one that fires immediately via a 1-second delay), Android 14+ strictly requires explicit permissions in the app manifest.
- Added `SCHEDULE_EXACT_ALARM`, `USE_EXACT_ALARM`, and `VIBRATE` to `app.json`.

### 2. Expo SDK 53 Trigger Object Format
Expo SDK 53 tightened the validation for local notification triggers.
- The `trigger` object must now explicitly include `channelId`, alongside `seconds`. 
- Using `trigger: null` is deprecated and causes silent failures on newer Android versions.

### 3. High Importance Channel Caching
Android caches notification channel settings upon creation. If a channel was previously created with low importance, it will never show Heads-Up banners.
- Created explicitly named channels (e.g., `high_importance_channel`) with `importance: Notifications.AndroidNotificationPriority.MAX` to override old cached settings.

### 4. WebSocket JWT Authentication
The mobile app passes the user's JWT token to the Go backend when establishing the WebSocket connection.
- Ensure the backend's WebSocket Hub (`hub.go`) is initialized with the correct `JWT_SECRET` from environment variables, rather than a hardcoded string, to prevent connection rejections (`Invalid token`).

## Limitations
- **Expo Go SDK 53**: Remote push notifications (FCM/APNs) are not supported in the Expo Go client app. To receive remote push notifications when the app is completely closed or killed, you must build a standalone native development client (`npx expo run:android` or via EAS Build). Local push notifications triggered by background WebSocket connections will still work as long as the OS keeps the socket alive.
