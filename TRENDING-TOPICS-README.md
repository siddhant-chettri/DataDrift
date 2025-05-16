# Trending Topics API

This module provides functionality to fetch trending topics from Google Trends via SerpAPI, store them in the database, and retrieve them with various filters.

## Setup

1. Ensure you have the required environment variables:
   ```
   SERPAPI_API_KEY=your_serpapi_api_key_here
   ```

2. The following files were created/modified for this feature:
   - `src/models/TrendingTopic.js` - Mongoose model for trending topics
   - `src/services/trendingTopicsService.js` - Service functions for fetching and retrieving trending topics
   - `src/controllers/trendingTopicsController.js` - Express route handlers
   - `src/routes/trendingTopicsRoutes.js` - API routes with Swagger documentation
   - `src/app.js` - Updated to include trending topics routes

## API Endpoints

### 1. Fetch and Store Trending Topics

**Endpoint:** `POST /api/trending-topics/fetch`

**Request Body Options:**

Option 1: Single region
```json
{
  "name": "United States",
  "geo": "US"
}
```

Option 2: Multiple regions
```json
{
  "regions": [
    { "name": "Haryana", "geo": "IN-HR" },
    { "name": "Bihar", "geo": "IN-BR" },
    { "name": "Uttar Pradesh", "geo": "IN-UP" },
    { "name": "Rajasthan", "geo": "IN-RJ" }
  ]
}
```

Note: If no regions are specified, the API will use the default Indian regions (Haryana, Bihar, Uttar Pradesh, and Rajasthan).

**Response:**
```json
{
  "success": true,
  "message": "Fetched trending topics for 4 regions",
  "results": [
    {
      "region": "Haryana",
      "count": 20,
      "topics": [
        {
          "title": "Example Topic 1",
          "region": {
            "name": "Haryana",
            "geo": "IN-HR"
          },
          "rank": 1,
          "traffic": "100K+",
          "date": "2023-06-15T12:00:00.000Z",
          "_id": "...",
          "createdAt": "2023-06-15T12:00:00.000Z",
          "updatedAt": "2023-06-15T12:00:00.000Z"
        },
        // More topics...
      ]
    },
    // More regions...
  ],
  "errors": [
    // Only present if errors occurred for some regions
    {
      "region": "Region Name",
      "error": "Error message"
    }
  ]
}
```

### 2. Get Trending Topics with Filters

**Endpoint:** `GET /api/trending-topics`

**Query Parameters:**
- `region` (optional): Region geo code (e.g., "US", "IN-HR")
- `startDate` (optional): Start date in ISO format (defaults to 7 days ago)
- `endDate` (optional): End date in ISO format (defaults to current date)
- `limit` (optional): Maximum number of results to return (default: 100)

**Example:** `/api/trending-topics?region=IN-HR&startDate=2023-06-10&limit=50`

**Response:**
```json
{
  "success": true,
  "count": 50,
  "data": [
    {
      "title": "Example Topic",
      "region": {
        "name": "Haryana",
        "geo": "IN-HR"
      },
      "rank": 1,
      "traffic": "100K+",
      "date": "2023-06-15T12:00:00.000Z",
      "_id": "...",
      "createdAt": "2023-06-15T12:00:00.000Z",
      "updatedAt": "2023-06-15T12:00:00.000Z"
    },
    // More topics...
  ]
}
```

## Database Schema

The trending topics are stored in the `trendingtopics` collection with the following schema:

```javascript
{
  title: String,          // Topic title
  region: {               // Region information
    name: String,         // Human-readable name (e.g., "Haryana")
    geo: String           // Region code (e.g., "IN-HR")
  },
  rank: Number,           // Rank position in trending list
  traffic: String,        // Traffic information if available
  date: Date,             // Date when the topic was fetched
  createdAt: Date,        // Document creation timestamp
  updatedAt: Date         // Document update timestamp
}
```

## Usage Example

```javascript
// Fetch trending topics for default regions (Haryana, Bihar, Uttar Pradesh, Rajasthan)
const response = await axios.post('/api/trending-topics/fetch');

// Fetch trending topics for specific regions
const response = await axios.post('/api/trending-topics/fetch', {
  regions: [
    { name: 'Haryana', geo: 'IN-HR' },
    { name: 'Delhi', geo: 'IN-DL' }
  ]
});

// Fetch trending topics for a single region
const response = await axios.post('/api/trending-topics/fetch', {
  name: 'Haryana',
  geo: 'IN-HR'
});

// Get trending topics for Haryana from the past 3 days
const threeDaysAgo = new Date();
threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

const response = await axios.get('/api/trending-topics', {
  params: {
    region: 'IN-HR',
    startDate: threeDaysAgo.toISOString(),
    limit: 20
  }
});
``` 