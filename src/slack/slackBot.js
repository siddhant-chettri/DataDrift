const { App } = require('@slack/bolt');
const axios = require('axios');

// Initialize Slack bot
const initSlackBot = () => {
  // Check for required environment variables
  if (!process.env.SLACK_BOT_TOKEN || !process.env.SLACK_SIGNING_SECRET) {
    console.error('Error: Slack bot credentials missing in .env file');
    return null;
  }

  const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: process.env.SLACK_APP_TOKEN ? true : false,
    appToken: process.env.SLACK_APP_TOKEN,
  });

  // Helper to make API calls to our own server
  const apiCall = async (endpoint, method = 'GET', data = null) => {
    const baseUrl = `http://localhost:${process.env.PORT || 3000}`;
    try {
      const config = {
        method,
        url: `${baseUrl}${endpoint}`,
        ...(data && { data }),
      };
      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error(`Error calling API ${endpoint}:`, error.message);
      throw new Error(`API Error: ${error.message}`);
    }
  };

  // Listen for direct messages
  app.message(async ({ message, say }) => {
    // Only respond to messages from users, not from the bot itself
    if (message.subtype || message.bot_id) return;
    
    try {
      // Process the message text to determine what the user wants
      const text = message.text.toLowerCase();

      // Command: Help
      if (text === 'help') {
        await say({
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '*Available Commands:*'
              }
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '• `status` - Check if server is running\n• `trending` - Get trending audios\n• `analyze` - Analyze top trending audio\n• `regional [region]` - Analyze trending audios for a specific region\n• `scrape [login]` - Start a scraping job (with optional login)\n• `help` - Show this help message'
              }
            }
          ]
        });
        return;
      }

      // Command: Status
      if (text === 'status') {
        const status = await apiCall('/api/status');
        await say({
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '*Server Status*'
              }
            },
            {
              type: 'section',
              fields: [
                {
                  type: 'mrkdwn',
                  text: `*Status:* ${status.status}`
                },
                {
                  type: 'mrkdwn',
                  text: `*Uptime:* ${Math.round(status.uptime / 60)} minutes`
                }
              ]
            }
          ]
        });
        return;
      }

      // Command: Get trending audios
      if (text === 'trending') {
        const response = await apiCall('/api/trending-audios');
        
        if (!response.success || !response.data || response.data.length === 0) {
          await say('No trending audios found. Try running a scrape job first.');
          return;
        }

        // Format response for Slack
        const audioBlocks = response.data.slice(0, 10).map((audio, index) => ({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${index + 1}. ${audio.name || 'Unnamed'}*\nBy: ${audio.audioAuthor || 'Unknown'}\nFrequency: ${audio.frequency || 1}`
          }
        }));

        await say({
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Top ${Math.min(10, response.data.length)} Trending Audios*`
              }
            },
            ...audioBlocks
          ]
        });
        return;
      }

      // Command: Analyze top trending audio
      if (text === 'analyze') {
        await say('Analyzing top trending audio... This may take a moment.');
        
        try {
          const response = await apiCall('/api/gemini/analyze');
          
          if (!response.success) {
            await say('Failed to analyze trending audios.');
            return;
          }

          // Format the AI analysis for Slack
          await say({
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: '*AI Analysis of Trending Audio*'
                }
              },
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `*Track:* ${response.data.audioData.name || 'Unnamed'}\n*By:* ${response.data.audioData.audioAuthor || 'Unknown'}`
                }
              },
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: response.data.analysis
                }
              }
            ]
          });
        } catch (error) {
          await say(`Analysis failed: ${error.message}`);
        }
        return;
      }

      // Command: Regional analysis
      if (text.startsWith('regional ')) {
        const region = text.substring('regional '.length).trim();
        
        if (!region) {
          await say('Please specify a region. Example: `regional Rajasthani`');
          return;
        }
        
        await say(`Analyzing trending audios for ${region} audience... This may take a moment.`);
        
        try {
          const response = await apiCall(`/api/gemini/analyze-regional?region=${encodeURIComponent(region)}`);
          
          if (!response.success) {
            await say(`Failed to analyze for ${region} audience.`);
            return;
          }

          // Format results for Slack
          const topAudios = response.data.sortedAudios.slice(0, 5).map((audio, index) => 
            `*${index + 1}. ${audio.name || 'Unnamed'}*\nRelevance: ${audio.relevanceScore}/10`
          ).join('\n\n');

          await say({
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `*AI Analysis for ${region} Audience*`
                }
              },
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: response.data.analysis
                }
              },
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: '*Top Recommended Tracks:*\n\n' + topAudios
                }
              }
            ]
          });
        } catch (error) {
          await say(`Regional analysis failed: ${error.message}`);
        }
        return;
      }

      // Command: Start a scraping job
      if (text === 'scrape' || text === 'scrape login') {
        const shouldLogin = text === 'scrape login';
        
        await say(`Starting Instagram scraping job${shouldLogin ? ' with login' : ''}... This may take a few minutes.`);
        
        try {
          // First, initialize the browser
          await apiCall('/api/browser/init', 'POST');
          
          // If login requested, perform login
          if (shouldLogin) {
            await apiCall('/api/browser/login', 'POST', {
              username: process.env.INSTAGRAM_USERNAME,
              password: process.env.INSTAGRAM_PASSWORD
            });
          }
          
          // Start the scraping job
          const response = await apiCall('/api/scrape/reels', 'POST', {
            scrollCount: 5
          });
          
          if (response.success) {
            await say({
              blocks: [
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: '*Scraping Completed*'
                  }
                },
                {
                  type: 'section',
                  fields: [
                    {
                      type: 'mrkdwn',
                      text: `*Reels found:* ${response.data.length}`
                    },
                    {
                      type: 'mrkdwn',
                      text: `*Trending audios:* ${response.trendingAudios.length}`
                    }
                  ]
                }
              ]
            });
          } else {
            await say(`Scraping failed: ${response.message}`);
          }
        } catch (error) {
          await say(`Scraping failed: ${error.message}`);
        }
        return;
      }

      // Default response for unrecognized commands
      await say({
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: "I didn't understand that command. Try `help` to see available commands."
            }
          }
        ]
      });

    } catch (error) {
      console.error('Error handling message:', error);
      await say(`Sorry, an error occurred: ${error.message}`);
    }
  });

  return app;
};

module.exports = { initSlackBot }; 