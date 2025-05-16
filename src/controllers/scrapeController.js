const puppeteerService = require('../services/puppeteerService');
const trendingAudioService = require('../services/trendingAudioService');

/**
 * Scrape Instagram reels and store trending audios
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Object} io - Socket.io instance
 */
const scrapeReels = async (req, res, io) => {
  try {
    const { scrollCount = 3 } = req.body;
    
    // Check if logged in
    const status = puppeteerService.getStatus();
    if (!status.isLoggedIn) {
      return res.status(400).json({ 
        success: false, 
        message: 'Not logged in to Instagram' 
      });
    }
    
    // Notify clients that scraping has started
    io.emit('scrapeStatus', { 
      status: 'started', 
      message: 'Starting to scrape reels' 
    });
    
    // Navigate to reels page
    const navigationResult = await puppeteerService.navigateToReels();
    if (!navigationResult.success) {
      io.emit('scrapeStatus', { 
        status: 'error', 
        message: navigationResult.message 
      });
      return res.status(500).json(navigationResult);
    }
    
    io.emit('scrapeStatus', { 
      status: 'navigating', 
      message: 'Navigated to reels section' 
    });
    
    // Scroll and extract reels data
    const scrapingResult = await puppeteerService.scrollAndExtractReels(scrollCount);
    if (!scrapingResult.success) {
      io.emit('scrapeStatus', { 
        status: 'error', 
        message: scrapingResult.message 
      });
      return res.status(500).json(scrapingResult);
    }
    
    const { data: reels, trendingAudios } = scrapingResult;
    
    // Store trending audios in database
    if (trendingAudios && trendingAudios.length > 0) {
      const storageResult = await trendingAudioService.storeTrendingAudios(
        trendingAudios, 
        reels
      );
      
      console.log('MongoDB storage result:', storageResult);
    }
    
    // Notify clients of completion
    io.emit('scrapeStatus', { 
      status: 'completed', 
      message: `Scraping completed. Found ${reels.length} reels and ${trendingAudios.length} trending audios.`,
      data: reels,
      trendingAudios
    });
    
    res.json({ 
      success: true, 
      message: `Successfully scraped ${reels.length} reels and found ${trendingAudios.length} trending audios`, 
      data: reels,
      trendingAudios
    });
  } catch (error) {
    console.error('Error scraping reels:', error);
    io.emit('scrapeStatus', { 
      status: 'error', 
      message: error.message 
    });
    res.status(500).json({ 
      success: false, 
      message: 'Error scraping reels', 
      error: error.message 
    });
  }
};

module.exports = {
  scrapeReels
}; 