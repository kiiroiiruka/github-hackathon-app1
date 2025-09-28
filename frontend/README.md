# GitHub Hackathon App - Car Navigation with Voice Chat

This is a React application built with Vite that provides car navigation functionality with integrated voice chat using Daily.co.

## Features

- 🚗 Car navigation with real-time routing
- 🎤 Voice chat integration using Daily.co
- 👥 Friend management and room creation
- 🔐 Firebase authentication
- 📱 Responsive mobile-first design

## Development Setup

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Firebase project setup
- Daily.co API key

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Install Cloudflare Workers dependencies:
   ```bash
   cd functions
   npm install
   cd ..
   ```

### Running the Development Server

#### Option 1: Run both frontend and backend together
```bash
npm run dev:all
```

#### Option 2: Run separately
Terminal 1 (Frontend):
```bash
npm run dev
```

Terminal 2 (Cloudflare Workers):
```bash
npm run dev:functions
```

### Environment Setup

1. **Firebase Configuration**: Update `src/firebase/firebaseConfig.js` with your Firebase project credentials
2. **Daily.co API Key**: Set up your Daily.co API key in Cloudflare Workers environment variables
3. **Cloudflare Workers**: The functions are located in the `functions/` directory

### Troubleshooting

#### Voice Chat Issues

If you encounter connection errors when starting voice calls:

1. **Development Environment**: Make sure Cloudflare Workers dev server is running on port 8787
2. **Microphone Permissions**: Ensure browser has microphone access
3. **API Endpoints**: Check that Daily.co API endpoints are properly configured

#### Common Error Messages

- `ERR_CONNECTION_REFUSED`: Cloudflare Workers dev server is not running
- `マイクエラー`: Browser microphone permissions are denied
- `APIサーバーエラー`: Daily.co API configuration issues

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory, ready for deployment to Cloudflare Pages.

## Project Structure

```
src/
├── components/          # Reusable UI components
├── firebase/           # Firebase configuration and utilities
├── hooks/              # Custom React hooks
├── pages/              # Page components
├── atom/               # Jotai state management
└── assets/             # Static assets

functions/
├── api/                # Cloudflare Workers API endpoints
└── package.json        # Workers dependencies
```

## Technologies Used

- **Frontend**: React 19, Vite, Tailwind CSS
- **Backend**: Cloudflare Workers, Firebase
- **Voice Chat**: Daily.co
- **Maps**: Leaflet, React Leaflet
- **State Management**: Jotai
- **Authentication**: Firebase Auth
