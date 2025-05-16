const { 
  fetchAndStoreTrendingTopics, 
  getTrendingTopics 
} = require('../services/trendingTopicsService');

// Default regions to use if none specified
const DEFAULT_REGIONS = [
  { name: 'Haryana', geo: 'IN-HR' },
  { name: 'Bihar', geo: 'IN-BR' },
  { name: 'Uttar Pradesh', geo: 'IN-UP' },
  { name: 'Rajasthan', geo: 'IN-RJ' },
];

/**
 * Fetch and store trending topics for a specific region or multiple regions
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const fetchTrendingTopicsHandler = async (req, res) => {
  try {
    console.log("Request body:", JSON.stringify(req.body));
    let regions = [];
    
    // If a regions array is provided in the request body and it's not empty
    if (req.body.regions && Array.isArray(req.body.regions) && req.body.regions.length > 0) {
      regions = req.body.regions;
    } 
    // If a single region is provided as name and geo in the root of the request
    else if (req.body.name && req.body.geo) {
      regions = [{ name: req.body.name, geo: req.body.geo }];
    }
    // If regions is empty, use default regions
    else {
      console.log("Using default regions:", DEFAULT_REGIONS);
      regions = DEFAULT_REGIONS;
    }
    
    if (regions.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid regions array is required or provide name and geo for a single region'
      });
    }

    // Validate each region has name and geo
    const invalidRegions = regions.filter(region => !region.name || !region.geo);
    if (invalidRegions.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'All regions must have name and geo properties',
        invalidRegions
      });
    }

    console.log('Processing regions:', JSON.stringify(regions));
    const results = [];
    const errors = [];

    // Process each region sequentially
    for (const region of regions) {
      try {
        console.log(`Fetching data for region: ${region.name} (${region.geo})`);
        const topics = await fetchAndStoreTrendingTopics(region);
        results.push({
          region: region.name,
          geo: region.geo,
          count: topics.length,
          topics
        });
      } catch (error) {
        console.error(`Error processing region ${region.name}:`, error);
        errors.push({
          region: region.name,
          geo: region.geo,
          error: error.message
        });
      }
    }
    
    res.status(200).json({
      success: results.length > 0,
      message: `Fetched trending topics for ${results.length} regions${results.length === 0 ? ' with errors' : ''}`,
      results,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error in fetchTrendingTopicsHandler:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch and store trending topics',
      error: error.message
    });
  }
};

/**
 * Fetch trending topics with filters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getTrendingTopicsHandler = async (req, res) => {
  try {
    const { region, startDate, endDate, limit } = req.query;
    
    // Parse dates if provided
    const filters = {};
    
    if (region) {
      filters.region = region;
    }
    
    if (startDate) {
      filters.startDate = new Date(startDate);
    }
    
    if (endDate) {
      filters.endDate = new Date(endDate);
    }
    
    if (limit && !isNaN(parseInt(limit))) {
      filters.limit = parseInt(limit);
    }
    
    const topics = await getTrendingTopics(filters);
    
    res.status(200).json({
      success: true,
      count: topics.length,
      data: topics
    });
  } catch (error) {
    console.error('Error in getTrendingTopicsHandler:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve trending topics',
      error: error.message
    });
  }
};

module.exports = {
  fetchTrendingTopicsHandler,
  getTrendingTopicsHandler
}; 