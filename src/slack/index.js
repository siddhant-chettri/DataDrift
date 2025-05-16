const { initSlackBot } = require('./slackBot');

let slackBot = null;

/**
 * Start the Slack bot
 * @returns {Promise<boolean>} Whether the bot started successfully
 */
const startSlackBot = async () => {
  try {
    // If we already have a bot instance, don't start a new one
    if (slackBot) {
      console.log('Slack bot is already running');
      return true;
    }

    // Initialize the bot
    const app = initSlackBot();
    
    if (!app) {
      console.error('Failed to initialize Slack bot');
      return false;
    }

    // Start the bot
    await app.start();
    console.log('⚡️ Slack bot is running!');
    
    slackBot = app;
    return true;
  } catch (error) {
    console.error('Error starting Slack bot:', error);
    return false;
  }
};

/**
 * Stop the Slack bot
 * @returns {Promise<boolean>} Whether the bot stopped successfully
 */
const stopSlackBot = async () => {
  try {
    if (!slackBot) {
      console.log('Slack bot is not running');
      return true;
    }

    await slackBot.stop();
    console.log('Slack bot stopped');
    
    slackBot = null;
    return true;
  } catch (error) {
    console.error('Error stopping Slack bot:', error);
    return false;
  }
};

module.exports = {
  startSlackBot,
  stopSlackBot
}; 