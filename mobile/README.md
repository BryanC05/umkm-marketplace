# MSME Marketplace Mobile App

A React Native (Expo) mobile application for the MSME Marketplace platform. Connect with local Micro, Small, and Medium Enterprises, browse products, and manage orders on the go.

## Features

### For Buyers
- Browse products by category
- Search products by name or description
- Filter by price range and category
- Find nearby sellers on interactive map
- View seller profiles and ratings
- Add products to cart
- Save products for later
- Place orders from local sellers
- Track order status
- Real-time chat with sellers
- Community forums

### For Sellers
- Register as Micro, Small, or Medium Enterprise
- Add and manage products with images
- Set stock quantities and pricing
- Receive and manage orders
- Update order status
- View sales dashboard
- Manage business profile
- AI-powered logo generation
- Real-time messaging with buyers

### Technical Features
- Geolocation-based seller search
- Interactive maps (Google Maps)
- Real-time chat with WebSocket
- Image picker for product photos
- Persistent storage for cart/auth
- Multi-language support (English/Indonesian)
- Dark/light theme support

## Tech Stack

- **Framework**: React Native with Expo SDK 54
- **Navigation**: React Navigation 7
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Real-time**: Socket.io-client
- **Maps**: react-native-maps
- **Storage**: @react-native-async-storage/async-storage
- **Location**: expo-location
- **Image Picker**: expo-image-picker

## Project Structure

```
mobile/
├── App.js                     # App entry point
├── index.js                   # React Native entry
├── assets/                    # App icons and splash
├── src/
│   ├── api/
│   │   └── api.js            # API client configuration
│   ├── components/
│   │   ├── ForumPostCard.js  # Forum post component
│   │   ├── LoadingSpinner.js # Loading indicator
│   │   ├── LocationPicker.js # Location picker
│   │   ├── Map.js            # Map component
│   │   └── ProductCard.js    # Product card component
│   ├── config/
│   │   └── index.js          # API configuration
│   ├── i18n/
│   │   ├── en.js             # English translations
│   │   └── id.js             # Indonesian translations
│   ├── navigation/
│   │   ├── AppNavigator.js    # Main navigation
│   │   └── AuthNavigator.js   # Auth navigation
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── LoginScreen.js
│   │   │   └── RegisterScreen.js
│   │   ├── cart/
│   │   │   └── CartScreen.js
│   │   ├── chat/
│   │   │   ├── ChatScreen.js
│   │   │   └── MessagesScreen.js
│   │   ├── forum/
│   │   │   ├── ForumScreen.js
│   │   │   └── ThreadDetailScreen.js
│   │   ├── home/
│   │   │   └── HomeScreen.js
│   │   ├── location/
│   │   │   ├── LiveTrackingMap.js
│   │   │   ├── MapViewScreen.js
│   │   │   └── NearbySellersScreen.js
│   │   ├── products/
│   │   │   ├── ProductDetailScreen.js
│   │   │   └── ProductsScreen.js
│   │   ├── profile/
│   │   │   └── ProfileScreen.js
│   │   └── seller/
│   │       ├── AddProductScreen.js
│   │       ├── BusinessDetailsScreen.js
│   │       ├── LogoGeneratorScreen.js
│   │       ├── MyProductsScreen.js
│   │       └── SellerDashboardScreen.js
│   ├── store/
│   │   ├── authStore.js       # Auth state
│   │   ├── cartStore.js       # Cart state
│   │   ├── languageStore.js   # Language state
│   │   └── themeStore.js      # Theme state
│   ├── theme/
│   │   └── ThemeContext.js    # Theme provider
│   └── utils/
│       └── helpers.js         # Utility functions
└── android/                   # Native Android files
```

## Setup Instructions

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Expo Go app (for testing on physical device)
- Android Studio (for Android builds)
- Xcode (for iOS builds, macOS only)

## Commands (Run and Build)

From `mobile/`:

```bash
# install dependencies
npm install

# start Expo dev server
npx expo start

# if LAN connection fails, use tunnel mode
npx expo start --tunnel

# run on Android emulator/device (native run)
npm run android

# run on iOS simulator/device (macOS only)
npm run ios

# run web preview
npm run web

# cloud build Android (EAS preview profile)
npm run build:android
# or
npx eas build --platform android --profile preview

# cloud build iOS (EAS preview profile)
npx eas build --platform ios --profile preview
```

### Installation

1. Navigate to the mobile directory:
```bash
cd mobile
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
   - Copy `.env.example` to `.env` and adjust values:
```bash
cp .env.example .env
```
```env
EXPO_PUBLIC_API_HOST=https://your-backend-url.up.railway.app
MAPS_API_KEY=your_android_google_maps_api_key
```
`EXPO_PUBLIC_API_HOST` is embedded in the app bundle for API/WebSocket endpoints.
`MAPS_API_KEY` is consumed by Android native config during release builds.

### Running the App

#### Option 1: Expo Go (Recommended for Development)

1. Start the development server:
```bash
npx expo start
```

2. Scan the QR code with Expo Go app on your phone

3. Make sure your phone and computer are on the same Wi-Fi

4. If device cannot connect on LAN, use:
```bash
npx expo start --tunnel
```

#### Option 2: iOS Simulator

```bash
npm run ios
```

#### Option 3: Android Emulator

```bash
npm run android
```

## Building for Production

### Option 1: EAS Build (Recommended)

1. Login to Expo:
```bash
npx expo login
```

2. Configure EAS in this project (first time only):
```bash
npx eas build:configure
```

3. Validate release configuration:
```bash
npm run check:release
```

4. Build for Android (Preview profile):
```bash
npx eas build -p android --profile preview
```

5. Build for iOS (Preview profile):
```bash
npx eas build -p ios --profile preview
```

Notes:
- `eas-cli` is already listed in `devDependencies`, so global install is not required.
- If you prefer script usage, run `npm run build:android`.
- For production Android AAB with pre-check, run `npm run build:android:production`.

### Option 2: Local Build

#### Android (APK)
```bash
cd android
./gradlew assembleRelease
```

The APK will be at `android/app/build/outputs/apk/release/`

## Configuration

### API Configuration

Set via environment (`EXPO_PUBLIC_API_HOST`), not by editing source files:

| Variable | Description |
|----------|-------------|
| EXPO_PUBLIC_API_HOST | Backend URL (default fallback: Railway production) |
| MAPS_API_KEY | Android Google Maps API key (use EAS secret for cloud builds) |

### App Configuration

Edit `app.json` for app name, icon, splash screen, etc.

## Key Features

### Authentication
- User registration (buyer/seller)
- Login with JWT
- Persistent login state

### Products
- Browse by category
- Search functionality
- Product details with images
- Add to cart
- Save for later

### Orders
- View all orders
- Order status tracking
- Order details

### Maps & Location
- Find nearby sellers
- Interactive map view
- Location picker for sellers

### Chat
- Real-time messaging
- Chat rooms per order
- Unread message count

### Forum
- Browse threads
- Create new threads
- Reply to threads
- Like posts

### Seller Features
- Business profile management
- Product management
- Order management
- Sales dashboard
- AI Logo generation

### Settings
- Language toggle (English/Indonesian)
- Theme toggle (Light/Dark)

## Troubleshooting

### Network Errors
- Ensure backend is running
- Check API_URL in config
- For physical device, use local IP not localhost

### Map Not Loading
- Check `MAPS_API_KEY` is set for build environment
- Ensure location permissions granted

### Build Errors
- Clear cache: `npx expo start --clear`
- Delete node_modules and reinstall

### "Network request failed"
- Set `EXPO_PUBLIC_API_HOST` to your reachable backend URL
- Make sure phone and computer are on same Wi-Fi

## Dependencies

### Main Dependencies
- expo ~54.0.33
- react 19.1.0
- react-native 0.81.5
- @react-navigation/native ^7.1.28
- @react-navigation/bottom-tabs ^7.13.0
- @react-navigation/native-stack ^7.12.0
- zustand ^5.0.11
- axios ^1.13.5
- socket.io-client ^4.8.3
- react-native-maps 1.20.1
- expo-location ~19.0.8
- expo-image-picker ~17.0.10

## License

MIT License

---

Built with ❤️ for MSMEs everywhere!
