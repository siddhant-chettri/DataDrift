const trendingAudioService = require('../services/trendingAudioService');

/**
 * Get all trending audios
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAllTrendingAudios = async (req, res) => {
  try {
    const trendingAudios = await trendingAudioService.getAllTrendingAudios();
    
    res.json({
      success: true,
      count: trendingAudios.length,
      data: trendingAudios
    });
  } catch (error) {
    console.error('Error retrieving trending audios:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error retrieving trending audios', 
      error: error.message 
    });
  }
};

/**
 * Get top trending audios
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getTopTrendingAudios = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const trendingAudios = await trendingAudioService.getTopTrendingAudios(parseInt(limit));
    
    res.json({
      success: true,
      count: trendingAudios.length,
      data: trendingAudios
    });
  } catch (error) {
    console.error('Error retrieving top trending audios:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error retrieving top trending audios', 
      error: error.message 
    });
  }
};

/**
 * Get trending audio by name
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getTrendingAudioByName = async (req, res) => {
  try {
    const { name } = req.params;
    
    if (!name) {
      return res.status(400).json({ 
        success: false, 
        message: 'Audio name is required' 
      });
    }
    
    const trendingAudio = await trendingAudioService.getTrendingAudioByName(name);
    
    if (!trendingAudio) {
      return res.status(404).json({ 
        success: false, 
        message: `Trending audio with name "${name}" not found` 
      });
    }
    
    res.json({
      success: true,
      data: trendingAudio
    });
  } catch (error) {
    console.error('Error retrieving trending audio by name:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error retrieving trending audio by name', 
      error: error.message 
    });
  }
};

/**
 * Get recent trending audios
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getRecentTrendingAudios = async (req, res) => {
  try {
    const { days = 7, limit = 20 } = req.query;
    const trendingAudios = await trendingAudioService.getRecentTrendingAudios(
      parseInt(days),
      parseInt(limit)
    );
    
    res.json({
      success: true,
      count: trendingAudios.length,
      data: trendingAudios
    });
  } catch (error) {
    console.error('Error retrieving recent trending audios:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error retrieving recent trending audios', 
      error: error.message 
    });
  }
};

module.exports = {
  getAllTrendingAudios,
  getTopTrendingAudios,
  getTrendingAudioByName,
  getRecentTrendingAudios
}; 