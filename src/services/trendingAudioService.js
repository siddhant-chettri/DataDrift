const TrendingAudio = require('../models/TrendingAudio');
const Reel = require('../models/Reel');

/**
 * Service for managing trending audio data
 */
class TrendingAudioService {
  /**
   * Store trending audios in the database
   * @param {Array} trendingAudios - Array of trending audio names
   * @param {Array} reels - Array of reels data with audio information
   * @returns {Promise} Result of the operation
   */
  async storeTrendingAudios(trendingAudios, reels) {
    try {
      if (!trendingAudios || trendingAudios.length === 0) {
        return { success: true, message: 'No trending audios to store' };
      }
      
      // First, store all reels that have valid data
      const savedReels = await this.storeReels(reels);
      const reelIdsByAudio = new Map();
      
      // Group reel IDs by audio name
      savedReels.forEach(reel => {
        if (reel.audioName && reel.hasTrendingAudio) {
          if (!reelIdsByAudio.has(reel.audioName)) {
            reelIdsByAudio.set(reel.audioName, []);
          }
          reelIdsByAudio.get(reel.audioName).push(reel._id);
        }
      });
      
      // Process each trending audio with upsert operations
      const ops = [];
      const now = new Date();
      
      for (const audioName of trendingAudios) {
        // Skip empty audio names
        if (!audioName) continue;
        
        // Find audio related reels
        const relatedReelIds = reelIdsByAudio.get(audioName) || [];
        
        // Prepare the update operation with $inc to increment frequency counter
        ops.push({
          updateOne: {
            filter: { name: audioName },
            update: { 
              $setOnInsert: { firstSeen: now },
              $set: { lastSeen: now },
              $inc: { frequency: 1 },
              $addToSet: { relatedReels: { $each: relatedReelIds } }
            },
            upsert: true
          }
        });
      }
      
      if (ops.length === 0) {
        return { success: true, message: 'No valid trending audios to store' };
      }
      
      // Execute the batch update
      const result = await TrendingAudio.bulkWrite(ops);
      
      return { 
        success: true, 
        message: `Stored ${result.upsertedCount} new trending audios, updated ${result.modifiedCount} existing entries`,
        upsertedCount: result.upsertedCount,
        modifiedCount: result.modifiedCount
      };
    } catch (error) {
      console.error('Error storing trending audios:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Store reels in the database
   * @param {Array} reels - Array of reels data
   * @returns {Promise<Array>} Saved reels
   */
  async storeReels(reels) {
    try {
      if (!reels || reels.length === 0) {
        return [];
      }
      
      const savedReels = [];
      
      // Process each reel with upsert operations
      for (const reelData of reels) {
        // Skip reels without shortcode
        if (!reelData.shortcode) continue;
        
        // Upsert the reel
        const reel = await Reel.findOneAndUpdate(
          { shortcode: reelData.shortcode },
          { 
            $setOnInsert: { scrapeDate: new Date() },
            $set: reelData
          },
          { 
            upsert: true, 
            new: true, 
            runValidators: true 
          }
        );
        
        savedReels.push(reel);
      }
      
      return savedReels;
    } catch (error) {
      console.error('Error storing reels:', error);
      return [];
    }
  }

  /**
   * Get all trending audios with optional filtering
   * @param {Object} filter - Filter criteria
   * @returns {Promise<Array>} Array of trending audio documents
   */
  async getAllTrendingAudios(filter = {}) {
    try {
      return await TrendingAudio.find(filter)
        .sort({ frequency: -1, lastSeen: -1 })
        .populate('relatedReels', 'shortcode username caption');
    } catch (error) {
      console.error('Error retrieving trending audios:', error);
      throw error;
    }
  }

  /**
   * Get top trending audios
   * @param {Number} limit - Number of top audios to retrieve
   * @returns {Promise<Array>} Array of trending audio documents
   */
  async getTopTrendingAudios(limit = 10) {
    try {
      return await TrendingAudio.find()
        .sort({ frequency: -1, lastSeen: -1 })
        .limit(limit)
        .populate('relatedReels', 'shortcode username caption');
    } catch (error) {
      console.error('Error retrieving top trending audios:', error);
      throw error;
    }
  }

  /**
   * Get trending audio by name
   * @param {String} name - Audio name
   * @returns {Promise<Object>} Trending audio document
   */
  async getTrendingAudioByName(name) {
    try {
      return await TrendingAudio.findOne({ name })
        .populate('relatedReels', 'shortcode username caption postUrl');
    } catch (error) {
      console.error(`Error retrieving trending audio by name "${name}":`, error);
      throw error;
    }
  }

  /**
   * Get recent trending audios
   * @param {Number} days - Number of days to look back
   * @param {Number} limit - Number of audios to retrieve
   * @returns {Promise<Array>} Array of trending audio documents
   */
  async getRecentTrendingAudios(days = 7, limit = 20) {
    try {
      const date = new Date();
      date.setDate(date.getDate() - days);
      
      return await TrendingAudio.find({ lastSeen: { $gte: date } })
        .sort({ lastSeen: -1, frequency: -1 })
        .limit(limit)
        .populate('relatedReels', 'shortcode username caption');
    } catch (error) {
      console.error('Error retrieving recent trending audios:', error);
      throw error;
    }
  }
}

module.exports = new TrendingAudioService(); 