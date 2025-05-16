const axios = require('axios');
const TrendingTopic = require('../models/TrendingTopic');

/**
 * Fetch trending topics from SerpAPI for a specific region and store in database
 * @param {Object} region - Object containing region information
 * @param {string} region.name - Human-readable name of the region
 * @param {string} region.geo - Geo code for the region (e.g., 'US', 'IN')
 * @returns {Promise<Array>} - Array of stored trending topics
 */
const fetchAndStoreTrendingTopics = async (region) => {
  try {
    // Use the google_trends_trending_now engine which is specifically for trending searches
    const response = await axios.get('https://serpapi.com/search', {
      params: {
        engine: 'google_trends_trending_now',
        geo: region.geo,
        hl: 'en',   // Language set to English
        api_key: process.env.SERPAPI_API_KEY
      },
    });

    console.log('Response status:', response.status);
    
    if (!response.data || !response.data.trending_searches) {
      console.log(`No trending searches found for ${region.name}:`, 
        JSON.stringify(response.data).substring(0, 200) + '...');
      return [];
    }
    
    const trends = response.data.trending_searches;
    console.log(`Found ${trends.length} trending searches for ${region.name}`);
    
    const storedTrends = [];

    // Store each trend in the database
    for (let i = 0; i < trends.length; i++) {
      const trend = trends[i];
      
      const trendingTopic = new TrendingTopic({
        title: trend.title || trend.query || '',
        region: {
          name: region.name,
          geo: region.geo
        },
        rank: i + 1,
        traffic: trend.traffic || '',
        date: new Date()
      });

      await trendingTopic.save();
      storedTrends.push(trendingTopic);
    }

    console.log(`Stored ${storedTrends.length} trending topics for ${region.name}`);
    return storedTrends;
  } catch (error) {
    console.error(`Error fetching/storing trends for ${region.name}:`, error.message);
    if (error.response) {
      console.error('Error response data:', error.response.data);
      console.error('Error response status:', error.response.status);
    }
    throw error;
  }
};

/**
 * Get trending topics from database with filters
 * @param {Object} filters - Query filters
 * @param {string} [filters.region] - Region geo code (e.g., 'US', 'IN')
 * @param {Date} [filters.startDate] - Start date for the search range
 * @param {Date} [filters.endDate] - End date for the search range
 * @param {number} [filters.limit=100] - Maximum number of results to return
 * @returns {Promise<Array>} - Array of trending topics
 */
const getTrendingTopics = async (filters = {}) => {
  try {
    const { region, startDate, endDate, limit = 100 } = filters;
    
    // Default to last 7 days if no date range specified
    const endDateValue = endDate || new Date();
    const startDateValue = startDate || new Date(endDateValue.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Build query
    const query = {
      date: { $gte: startDateValue, $lte: endDateValue }
    };
    
    if (region) {
      query['region.geo'] = region;
    }
    
    const results = await TrendingTopic.find(query)
      .sort({ date: -1, rank: 1 })
      .limit(limit);
      
    return results;
  } catch (error) {
    console.error('Error retrieving trending topics:', error.message);
    throw error;
  }
};

module.exports = {
  fetchAndStoreTrendingTopics,
  getTrendingTopics
}; 