# Instagram Trending Audio Slack Bot

This Slack bot integrates with your Instagram scraper server to provide trending audio analysis and commands directly in Slack.

## Setup Instructions

### 1. Create a Slack App

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps)
2. Click "Create New App" and choose "From scratch"
3. Name your app (e.g., "Instagram Trend Tracker") and select your workspace
4. Click "Create App"

### 2. Configure Bot Permissions

1. In the left sidebar, navigate to "OAuth & Permissions"
2. Scroll down to "Scopes" and add the following Bot Token Scopes:
   - `chat:write` - Send messages
   - `im:history` - View messages in direct messages
   - `im:read` - View direct messages
   - `app_mentions:read` - View mentions of your app in messages

### 3. Enable Socket Mode (Recommended)

1. In the left sidebar, navigate to "Socket Mode"
2. Toggle "Enable Socket Mode" to on
3. Generate an app-level token with the `connections:write` scope
4. Save the generated token as your `SLACK_APP_TOKEN` (starts with `xapp-`)

### 4. Install App to Workspace

1. In the left sidebar, navigate to "Install App"
2. Click "Install to Workspace"
3. Review the permissions and click "Allow"
4. Save the "Bot User OAuth Token" (starts with `xoxb-`) as your `SLACK_BOT_TOKEN`

### 5. Get Signing Secret

1. In the left sidebar, navigate to "Basic Information"
2. Scroll down to "App Credentials"
3. Copy the "Signing Secret" and save it as your `SLACK_SIGNING_SECRET`

### 6. Update Environment Variables

Add the following lines to your `.env` file:

```
# Slack configuration
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_APP_TOKEN=xapp-your-app-token  # Only if using Socket Mode
```

## Running the Bot

The Slack bot will automatically start when you run the server if the Slack environment variables are properly configured.

Alternatively, you can manually start/stop the bot using the API endpoints:

- Start the bot: `POST /api/slack/start`
- Stop the bot: `POST /api/slack/stop`

## Available Commands

In Slack, you can message the bot directly with the following commands:

- `help` - View available commands
- `status` - Check if the server is running
- `trending` - View the current trending audios
- `analyze` - Analyze the top trending audio using Gemini AI
- `regional [region]` - Analyze trending audios for a specific region (e.g., `regional Rajasthani`)
- `scrape` - Start a scraping job without login
- `scrape login` - Start a scraping job with Instagram login

## Example Usage

1. Add the bot to a channel or send it a direct message
2. Type `help` to see available commands
3. Type `trending` to see current trending audios
4. Type `regional Rajasthani` to get AI analysis for Rajasthani audience

## Troubleshooting

If the bot isn't responding:

1. Check that your Slack tokens are correctly configured in the `.env` file
2. Verify that your bot has been invited to the channel where you're sending commands
3. Check the server logs for any error messages
4. Try restarting the bot using the API endpoint: `POST /api/slack/start`

## Security Notes

- Your Slack tokens grant access to your workspace. Keep them secure and never commit them to version control.
- The bot only processes messages sent directly to it (DMs) or when it's mentioned in a channel.
- The bot uses your configured Instagram credentials when the `scrape login` command is used. 