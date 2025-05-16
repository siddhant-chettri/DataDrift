const puppeteerService = require('../services/puppeteerService');

/**
 * Initialize the browser
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const initializeBrowser = async (req, res) => {
  try {
    const result = await puppeteerService.initializeBrowser();
    res.json(result);
  } catch (error) {
    console.error('Error initializing browser:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error initializing browser', 
      error: error.message 
    });
  }
};

/**
 * Login to Instagram
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username and password are required' 
      });
    }
    
    // Check if browser is initialized, if not initialize it
    const status = puppeteerService.getStatus();
    if (!status.browserActive) {
      const initResult = await puppeteerService.initializeBrowser();
      if (!initResult.success) {
        return res.status(500).json(initResult);
      }
    }
    
    const result = await puppeteerService.login(username, password);
    res.json(result);
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error during login', 
      error: error.message 
    });
  }
};

/**
 * Get browser status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getStatus = (req, res) => {
  try {
    const status = puppeteerService.getStatus();
    res.json(status);
  } catch (error) {
    console.error('Error getting status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error getting status', 
      error: error.message 
    });
  }
};

/**
 * Close browser
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const closeBrowser = async (req, res) => {
  try {
    const result = await puppeteerService.closeBrowser();
    res.json(result);
  } catch (error) {
    console.error('Error closing browser:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error closing browser', 
      error: error.message 
    });
  }
};

module.exports = {
  initializeBrowser,
  login,
  getStatus,
  closeBrowser
}; 