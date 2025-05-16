# Environment Variables Setup

To use the Instagram Reels Analytics features, you need to set up the following environment variables in your `.env` file:

```
# Server configuration
PORT=3000
NODE_ENV=development

# MongoDB connection string
MONGODB_URI=mongodb://localhost:27017/dataDrift

# Instagram credentials
INSTAGRAM_USERNAME=your_instagram_username
INSTAGRAM_PASSWORD=your_instagram_password

# Instagram Graph API
INSTA_ACCESS_TOKEN=your_instagram_graph_api_access_token
FACEBOOK_PAGE_ID=your_facebook_page_id

# Slack configuration
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_SIGNING_SECRET=your-slack-signing-secret
SLACK_APP_TOKEN=xapp-your-slack-app-token

# Gemini API key
GEMINI_API_KEY=your_gemini_api_key
```

## Instagram Graph API Setup

1. **Get an Access Token**:
   - Visit the [Facebook Developer Portal](https://developers.facebook.com/)
   - Create an app or use an existing one
   - Go to the Graph API Explorer tool
   - Select your app from the dropdown
   - Request the following permissions:
     - `instagram_basic`
     - `instagram_content_publish`
     - `instagram_manage_insights`
     - `pages_read_engagement`
   - Generate the token and copy it to your `.env` file as `INSTA_ACCESS_TOKEN`

2. **Find Your Facebook Page ID**:
   - Go to your Facebook page
   - The ID is in the URL: `https://www.facebook.com/YourPageName/` (or you can find it in the Page Information section)
   - Set this as `FACEBOOK_PAGE_ID` in your `.env` file

3. **Testing Your Configuration**:
   - With your server running, test the connection by calling:
   ```
   GET /api/instagram/business-account?pageId=YOUR_PAGE_ID
   ```
   - If successful, you'll receive your Instagram Business Account ID

## Slack Integration

1. Create a Slack app at https://api.slack.com/apps
2. Add the required scopes:
   - `chat:write`
   - `commands`
   - `app_mentions:read`
3. Copy the Bot Token, Signing Secret, and App Token to your `.env` file

## Usage

After setting up the environment variables, you can:

1. Fetch Instagram posts: `POST /api/instagram/fetch-posts` with the page ID
2. Analyze reels performance: `GET /api/instagram/reels/analyze`
3. Use Slack slash commands like `/reels-analysis 30d` 