const {
  getInstagramBusinessAccount,
  fetchAndStoreInstagramPosts,
  getInstagramPosts,
  analyzeReelsPerformance,
  getPageDetails,
  getPageDetailsById,
  fetchAndStoreInstagramPostsByRegion,
  fetchPostsAndSave,
  fetchPostsForRegion,
  isAccessTokenValid
} = require('../services/instagramService');
const axios = require('axios');

/**
 * Get Instagram business account ID handler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getInstagramBusinessAccountHandler = async (req, res) => {
  try {
    const { pageId } = req.query;
    
    if (!pageId) {
      return res.status(400).json({
        success: false,
        message: 'Page ID is required'
      });
    }
    
    if (!process.env.INSTA_ACCESS_TOKEN) {
      return res.status(400).json({
        success: false,
        message: 'Instagram access token not found in environment variables'
      });
    }
    
    const instagramAccountId = await getInstagramBusinessAccount(pageId);
    
    res.status(200).json({
      success: true,
      data: {
        pageId,
        instagramBusinessAccountId: instagramAccountId
      }
    });
  } catch (error) {
    console.error('Error in getInstagramBusinessAccountHandler:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get Instagram business account ID',
      error: error.message
    });
  }
};

/**
 * Fetch and store Instagram posts handler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const fetchInstagramPostsHandler = async (req, res) => {
  try {
    const { pageId, limit } = req.body;
    
    if (!pageId) {
      return res.status(400).json({
        success: false,
        message: 'Page ID is required'
      });
    }
    
    if (!process.env.INSTA_ACCESS_TOKEN) {
      return res.status(400).json({
        success: false,
        message: 'Instagram access token not found in environment variables'
      });
    }
    
    const limitValue = limit ? parseInt(limit) : 25;
    
    const posts = await fetchAndStoreInstagramPosts(pageId, limitValue);
    
    res.status(200).json({
      success: true,
      message: `Fetched and stored ${posts.length} Instagram posts`,
      count: posts.length,
      data: posts.map(post => ({
        postId: post.postId,
        mediaType: post.mediaType,
        permalink: post.permalink,
        timestamp: post.timestamp,
        engagementRate: post.engagementRate
      }))
    });
  } catch (error) {
    console.error('Error in fetchInstagramPostsHandler:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch and store Instagram posts',
      error: error.message
    });
  }
};

/**
 * Get Instagram posts handler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getInstagramPostsHandler = async (req, res) => {
  try {
    const { mediaType, region, startDate, endDate, limit } = req.query;
    
    const filters = {};
    
    if (mediaType) {
      filters.mediaType = mediaType.toUpperCase();
    }
    
    if (region) {
      filters.region = region.toLowerCase();
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
    
    const posts = await getInstagramPosts(filters);
    
    res.status(200).json({
      success: true,
      count: posts.length,
      data: posts
    });
  } catch (error) {
    console.error('Error in getInstagramPostsHandler:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve Instagram posts',
      error: error.message
    });
  }
};

/**
 * Analyze Instagram Reels performance handler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const analyzeReelsPerformanceHandler = async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      region,
      limit = 10, 
      timeframe = 'the specified period'
    } = req.query;
    
    const filters = {
      mediaType: 'VIDEO',
      limit: parseInt(limit)
    };
    
    if (region) {
      filters.region = region.toLowerCase();
    }
    
    if (startDate) {
      filters.startDate = new Date(startDate);
    }
    
    if (endDate) {
      filters.endDate = new Date(endDate);
    }
    
    // Get reels matching the filters
    const reels = await getInstagramPosts(filters);
    
    if (reels.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No Instagram Reels found for the specified period'
      });
    }
    
    // Analyze the reels performance
    const analysis = await analyzeReelsPerformance(reels, timeframe);
    
    res.status(200).json({
      success: true,
      reelsCount: reels.length,
      timeframe,
      region: region || 'all',
      analysis
    });
  } catch (error) {
    console.error('Error in analyzeReelsPerformanceHandler:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze Instagram Reels performance',
      error: error.message
    });
  }
};

/**
 * Analyze Instagram Reels performance for Slack - optimized for Slack commands
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const analyzeReelsPerformanceForSlack = async (req, res) => {
  try {
    // Extract response_url from request body and other params from query params
    const { response_url } = req.body;
    const { region, limit } = req.params;
    
    if (!response_url) {
      return res.status(400).json({
        success: false,
        message: 'Slack response_url is required'
      });
    }
    
    // Send immediate acknowledgment response to avoid timeout
    res.status(200).json({
      response_type: "ephemeral", // Only visible to the user who triggered the command
      text: `Analyzing Instagram Reels performance${region ? ` for ${region} region` : ''}. Results will be posted shortly...`
    });
    
    // Process the request asynchronously
    (async () => {
      try {
        // Calculate date range - default to last 30 days
        const endDate = new Date();
        let startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        
        // Prepare filters
        const filters = {
          mediaType: 'VIDEO',
          startDate,
          endDate,
          limit: limit ? parseInt(limit) : 20 // Use provided limit or default to 20 reels
        };
        
        // Add region to filters if provided
        if (region) {
          filters.region = region.toLowerCase();
        }
        
        // Get reels matching the filters
        const reels = await getInstagramPosts(filters);
        
        if (reels.length === 0) {
          // Send error response to Slack
          await axios.post(response_url, {
            response_type: "ephemeral",
            text: `No Instagram Reels found for the specified period${region ? ` in ${region} region` : ''}.`
          });
          return;
        }
        
        // Analyze the reels performance
        const timeframeName = `the last 30 days`;
        const analysis = await analyzeReelsPerformance(reels, timeframeName);
        
        // Format response for Slack
        const blocks = [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: `📊 Instagram Reels Analysis${region ? ` - ${region.toUpperCase()}` : ''}`,
              emoji: true
            }
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*${timeframeName}* | *${reels.length} Reels*`
            }
          },
          {
            type: "divider"
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Key Insights:*\n${analysis.analysis.substring(0, 500)}...`
            }
          }
        ];
        
        // Add top performers section if available
        if (analysis.topPerformers && analysis.topPerformers.length > 0) {
          const topReels = reels.filter(reel => analysis.topPerformers.includes(reel.postId));
          
          blocks.push(
            {
              type: "divider"
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: "*Top Reels:*"
              }
            }
          );
          
          // Add top 3 reels or fewer if less are available
          topReels.slice(0, 3).forEach((reel, index) => {
            blocks.push({
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*${index + 1}.* <${reel.permalink}|View> (${reel.engagementRate}% engagement)`
              }
            });
          });
        }
        
        // Send the analysis back to Slack
        await axios.post(response_url, {
          response_type: "in_channel", // Visible to everyone in the channel
          blocks
        });
      } catch (asyncError) {
        console.error('Error in async processing for Slack:', asyncError);
        
        // Send error response to Slack
        try {
          await axios.post(response_url, {
            response_type: "ephemeral",
            text: `Error analyzing Instagram Reels: ${asyncError.message}`
          });
        } catch (responseError) {
          console.error('Error sending response to Slack:', responseError);
        }
      }
    })();
  } catch (error) {
    console.error('Error in analyzeReelsPerformanceForSlack:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze Instagram Reels performance for Slack',
      error: error.message
    });
  }
};

/**
 * Get Facebook page details handler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getPageDetailsHandler = async (req, res) => {
  try {
    const { access_token } = req.query;
    
    if (!access_token) {
      return res.status(400).json({
        success: false,
        message: 'Access token is required'
      });
    }
    
    const pages = await getPageDetails(access_token);
    
    res.status(200).json({
      success: true,
      count: pages.length,
      data: pages
    });
  } catch (error) {
    console.error('Error in getPageDetailsHandler:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve Facebook page details',
      error: error.message
    });
  }
};

/**
 * Get specific Facebook page details by ID handler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getPageDetailsByIdHandler = async (req, res) => {
  try {
    const { pageId } = req.params;
    const { access_token } = req.query;
    
    if (!pageId) {
      return res.status(400).json({
        success: false,
        message: 'Page ID is required'
      });
    }
    
    if (!access_token) {
      return res.status(400).json({
        success: false,
        message: 'Access token is required'
      });
    }
    
    const pageDetails = await getPageDetailsById(pageId, access_token);
    
    res.status(200).json({
      success: true,
      data: pageDetails
    });
  } catch (error) {
    console.error('Error in getPageDetailsByIdHandler:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Facebook page details',
      error: error.message
    });
  }
};

/**
 * Fetch and store Instagram posts by region handler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const fetchInstagramPostsByRegionHandler = async (req, res) => {
  try {
    const { region, limit } = req.body;
    
    if (!region) {
      return res.status(400).json({
        success: false,
        message: 'Region is required'
      });
    }
    
    if (!process.env.INSTA_ACCESS_TOKEN) {
      return res.status(400).json({
        success: false,
        message: 'Instagram access token not found in environment variables'
      });
    }
    
    const limitValue = limit ? parseInt(limit) : 25;
    
    const posts = await fetchAndStoreInstagramPostsByRegion(region, limitValue);
    
    res.status(200).json({
      success: true,
      message: `Fetched and stored ${posts.length} Instagram posts for region: ${region}`,
      count: posts.length,
      data: posts.map(post => ({
        postId: post.postId,
        mediaType: post.mediaType,
        permalink: post.permalink,
        timestamp: post.timestamp,
        engagementRate: post.engagementRate
      }))
    });
  } catch (error) {
    console.error(`Error in fetchInstagramPostsByRegionHandler for region ${req.body.region}:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch and store Instagram posts by region',
      error: error.message
    });
  }
};

/**
 * Fetch and store Instagram posts for all regions handler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const fetchPostsAndSaveHandler = async (req, res) => {
  try {
    const { limit } = req.body;
    
    if (!process.env.INSTA_ACCESS_TOKEN) {
      return res.status(400).json({
        success: false,
        message: 'Instagram access token not found in environment variables'
      });
    }
    
    const limitValue = limit ? parseInt(limit) : 25;
    
    const result = await fetchPostsAndSave(limitValue);
    
    res.status(200).json({
      success: true,
      message: `Fetched and stored ${result.totalPosts} Instagram posts across all regions`,
      regions: result.regions,
      totalCount: result.totalPosts
    });
  } catch (error) {
    console.error('Error in fetchPostsAndSaveHandler:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch and store Instagram posts for regions',
      error: error.message
    });
  }
};

/**
 * Fetch posts for a specific region handler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const fetchPostsForRegionHandler = async (req, res) => {
  try {
    const { region } = req.params;
    
    if (!region) {
      return res.status(400).json({
        success: false,
        message: 'Region is required'
      });
    }
    
    if (!process.env.INSTA_ACCESS_TOKEN) {
      return res.status(400).json({
        success: false,
        message: 'Instagram access token not found in environment variables'
      });
    }
    
    const posts = await fetchPostsForRegion(region);
    
    res.status(200).json({
      success: true,
      message: `Fetched ${posts.length} Instagram posts for region: ${region}`,
      count: posts.length,
      data: posts
    });
  } catch (error) {
    console.error('Error in fetchPostsForRegionHandler:', error);
    res.status(500).json({
      success: false,
      message: `Failed to fetch Instagram posts for region: ${req.params.region}`,
      error: error.message
    });
  }
};

/**
 * Check if the Instagram access token is valid
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const checkAccessTokenHandler = async (req, res) => {
  try {
    const isValid = await isAccessTokenValid();
    
    if (isValid) {
      return res.status(200).json({
        success: true,
        message: 'Instagram access token is valid'
      });
    } else {
      return res.status(401).json({
        success: false,
        message: 'Instagram access token is invalid or expired. Please refresh your token.'
      });
    }
  } catch (error) {
    console.error('Error in checkAccessTokenHandler:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check Instagram access token',
      error: error.message
    });
  }
};

module.exports = {
  getInstagramPostsHandler,
  analyzeReelsPerformanceHandler,
  analyzeReelsPerformanceForSlack,
  getPageDetailsHandler,
  fetchPostsAndSaveHandler,
  fetchPostsForRegionHandler,
  checkAccessTokenHandler
};