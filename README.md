# Instagram Trending Audio Tracker

An Express.js application that uses Puppeteer to scrape Instagram reels, identify trending audio tracks, and store them in MongoDB for tracking and analysis.

## Features

- Browser automation with Puppeteer for Instagram navigation
- Trending audio detection using specific selectors
- MongoDB integration for persistent storage of trending audio data
- RESTful API for accessing trending audio information
- Real-time scraping status updates through Socket.io
- User-friendly MVC architecture with controllers, routes, and services
- Proper data modeling with Mongoose

## Project Structure

```
├── public              # Static files
├── src                 # Source code
│   ├── config          # Configuration files
│   ├── controllers     # Request handlers
│   ├── helpers         # Helper functions
│   ├── lib             # Library code
│   ├── middleware      # Express middleware
│   ├── models          # Mongoose models
│   ├── routes          # Express routes
│   ├── services        # Business logic
│   ├── utils           # Utility functions
│   ├── app.js          # Express app setup
│   └── index.js        # Entry point
├── server.js           # Legacy server file
└── package.json        # Project metadata
```

## Prerequisites

- Node.js (v14 or higher recommended)
- MongoDB
- Instagram account

## Installation

1. Clone this repository:
   ```
   git clone <repository-url>
   cd instagram-trending-audio
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory:
   ```
   # Server configuration
   PORT=3000
   NODE_ENV=development
   
   # MongoDB connection
   MONGODB_URI=mongodb+srv://siddhantchtriofficial:AEhXqcgYu7-CZ64@cluster0.aenzcev.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
   DB_NAME=instagramData
   ```

## Usage

### New MVC Architecture:

```
npm start
```

Or for development with auto-restart:

```
npm run dev
```

### Legacy Version:

```
npm run legacy
```

## API Endpoints

### Browser Operations
- `GET /api/browser/status` - Check browser and login status
- `POST /api/browser/init` - Initialize browser
- `POST /api/browser/login` - Login to Instagram with username/password
- `POST /api/browser/close` - Close browser

### Scraping Operations
- `POST /api/scrape/reels` - Scrape Instagram reels and collect trending audio

### Trending Audio Operations
- `GET /api/trending-audios` - Get all trending audios
- `GET /api/trending-audios/top` - Get top trending audios
- `GET /api/trending-audios/recent` - Get recent trending audios
- `GET /api/trending-audios/:name` - Get trending audio by name

## Data Models

### TrendingAudio Model
- `name` - Name of the audio track
- `audioAuthor` - Creator of the audio
- `source` - Platform source (defaults to 'instagram')
- `frequency` - Number of times observed
- `firstSeen` - When the audio was first seen
- `lastSeen` - When the audio was last seen
- `relatedReels` - References to reels using this audio

### Reel Model
- `shortcode` - Unique identifier for the reel
- `username` - Instagram username of the reel creator
- `postUrl` - URL to the reel
- `caption` - Reel caption text
- `likeCount` - Number of likes
- `hasTrendingAudio` - Whether the reel has trending audio
- `audioName` - Name of the audio used
- `audioAuthor` - Creator of the audio
- `trendingAudioRef` - Reference to the TrendingAudio document

## Important Notes

- This scraper uses a visible browser window, so you can see exactly what's happening.
- Instagram may detect automated browsing and could temporarily restrict your account. Use responsibly.
- The app stores trending audios in MongoDB for historical tracking and analysis.
- Trending audios are identified by a specific SVG path and class name in the Instagram UI.

## Scraping Process

1. Initialize browser and login to Instagram using API endpoints
2. Navigate to Instagram reels section
3. Scroll through reels to load content
4. Identify trending audio tracks by specific selectors
5. Store trending audio and reel data in MongoDB
6. Access trending audio data through API endpoints

## Instagram Access Token

### Refreshing Your Access Token

Facebook/Instagram access tokens expire periodically. If you encounter errors related to an invalid or expired token, follow these steps to refresh it:

1. Visit the [Facebook Developer Portal](https://developers.facebook.com/)
2. Navigate to your App
3. Go to Tools > Graph API Explorer
4. Select your app from the dropdown
5. Click "Generate Access Token"
6. Select the necessary permissions (at minimum: `instagram_basic`, `instagram_content_publish`, `pages_read_engagement`)
7. Click "Generate Token"
8. Copy the new access token
9. Update your `.env` file:
   ```
   INSTA_ACCESS_TOKEN=your_new_token_here
   ```
10. Restart your application

You can verify token validity by calling the `/api/instagram/token-status` endpoint.

## License

MIT

## Contributors

- Siddhant Chtri 