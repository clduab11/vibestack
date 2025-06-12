# VibeStack Mobile App

AI-powered habit tracking application built with React Native and Expo.

## Tech Stack

- **Framework**: React Native with Expo SDK 53
- **Language**: TypeScript
- **Navigation**: Expo Router (file-based routing)
- **State Management**: Zustand + React Query
- **Backend**: Supabase (PostgreSQL, Auth, Realtime)
- **UI**: Native components with custom styling
- **Testing**: Jest + React Native Testing Library

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Emulator

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your Supabase credentials
```

3. Start the development server:
```bash
npm start
```

4. Run on your device/simulator:
- Press `i` for iOS
- Press `a` for Android
- Scan QR code with Expo Go app for physical device

## Project Structure

```
vibestack-app/
├── app/                    # Expo Router navigation
│   ├── (auth)/            # Authentication screens
│   ├── (tabs)/            # Main app tabs
│   └── _layout.tsx        # Root layout
├── components/            # Reusable components
├── features/              # Feature modules
├── services/              # External services (Supabase, etc.)
├── stores/               # Zustand state management
└── utils/                # Utilities and helpers
```

## Key Features

- 🤖 AI-powered habit recommendations
- 💬 Interactive avatar companion
- 📊 Behavioral analytics
- 🏆 Social challenges and gamification
- 🔐 Secure authentication
- 📱 Cross-platform (iOS & Android)

## Development

### Running Tests
```bash
npm test
```

### Linting
```bash
npm run lint
```

### Type Checking
```bash
npm run type-check
```

## Building for Production

### iOS
```bash
eas build --platform ios
```

### Android
```bash
eas build --platform android
```

## Contributing

Please follow the existing code style and ensure all tests pass before submitting PRs.

## License

Proprietary - All rights reserved