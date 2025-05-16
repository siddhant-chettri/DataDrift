const { 
  fetchAndStoreTrendingTopics, 
  getTrendingTopics 
} = require('../services/trendingTopicsService');
const axios = require('axios');
const { geminiProModel, geminiFlashModel } = require('../services/geminiService');

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

/**
 * Convert trending topics to optimized hashtags - optimized for Slack commands
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const convertTrendingTopicsToHashtags = async (req, res) => {
  try {
    // Get parameters from query params
    const { 
      limit = 10,
      region,
      tone = "engaging" // Default tone for hashtags
    } = req.query;
    
    // Get response_url from body
    const { response_url } = req.body;
    
    // Send immediate acknowledgment response to avoid timeout
    res.status(200).json({
      response_type: "ephemeral", // Only visible to the user who triggered the command
      text: "Converting trending topics to hashtags. Results will be posted shortly..."
    });
    
    // Process the request asynchronously
    (async () => {
      try {
        // Build filters for trending topics
        const filters = {};
        
        if (region) {
          filters.region = region;
        }
        
        if (limit && !isNaN(parseInt(limit))) {
          filters.limit = parseInt(limit);
        }
        
        // Find trending topics from database
        const topics = await getTrendingTopics(filters);
        
        let responseBody;
        
        if (!topics.length) {
          responseBody = {
            response_type: "ephemeral",
            text: "No trending topics found matching your criteria."
          };
        } else {
          try {
            // Get topic titles for Gemini processing
            const topicTitles = topics.map(topic => topic.title).join(', ');
            
            // Create prompt for Gemini
            const prompt = `
              Convert these trending topics into optimized hashtags for social media with a ${tone} tone:
              
              ${topicTitles}
              
              For each topic:
              1. Convert to 1-3 relevant hashtags
              2. Ensure hashtags follow best practices (camelCase or separate words)
              3. Add 1-2 related popular hashtags that could boost reach
              
              Format the response as a bulleted list with the original topic and its corresponding hashtags.
            `;
            
            // Choose model based on content size
            const selectedModel = topics.length > 5 ? geminiFlashModel : geminiProModel;
            
            // Generate hashtags with Gemini
            const result = await selectedModel.generateContent(prompt);
            const response = await result.response;
            const hashtags = response.text();
            
            // Truncate to ensure we stay within Slack's message size limits
            const truncatedResponse = hashtags.length > 2800 
              ? hashtags.substring(0, 2800) + "... [truncated, see dashboard for full details]" 
              : hashtags;
              
            responseBody = {
              response_type: "in_channel", // Visible to everyone in the channel
              text: `*Trending Topics Converted to Hashtags*\n${topics.length} topics analyzed`,
              blocks: [
                {
                  type: "section",
                  text: {
                    type: "mrkdwn",
                    text: `*Trending Topics Converted to Hashtags*\n${topics.length} topics analyzed with ${tone} tone`
                  }
                },
                {
                  type: "section",
                  text: {
                    type: "mrkdwn",
                    text: truncatedResponse
                  }
                }
              ]
            };
          } catch (aiError) {
            console.error('AI conversion error:', aiError);
            
            // Fallback: Return a simple conversion based on the topic titles
            const simpleHashtags = topics.map(topic => {
              // Basic conversion - remove spaces, special chars, and add #
              const baseHashtag = '#' + topic.title.replace(/[^\w\s]/gi, '').replace(/\s+/g, '');
              return `• ${topic.title} → ${baseHashtag}`;
            }).join('\n');
            
            responseBody = {
              response_type: "ephemeral",
              text: `AI conversion failed: ${aiError.message}`,
              blocks: [
                {
                  type: "section",
                  text: {
                    type: "mrkdwn",
                    text: `*Trending Topics to Hashtags (Basic Conversion)*\nAI-powered conversion failed, using basic formatting instead`
                  }
                },
                {
                  type: "section",
                  text: {
                    type: "mrkdwn",
                    text: simpleHashtags
                  }
                }
              ]
            };
          }
        }
        
        // Send the delayed response via response_url if available
        if (response_url) {
          try {
            await axios.post(response_url, responseBody);
          } catch (slackError) {
            console.error('Error sending response to Slack:', slackError);
            console.error('Response payload:', JSON.stringify(responseBody).substring(0, 200) + '...');
            
            // Try with a minimal fallback response if original fails
            const fallbackResponse = {
              response_type: "ephemeral",
              text: "Hashtag conversion completed but response too large for Slack. Please check the dashboard."
            };
            
            try {
              await axios.post(response_url, fallbackResponse);
            } catch (fallbackError) {
              console.error('Fallback response also failed:', fallbackError);
            }
          }
        }
      } catch (asyncError) {
        console.error('Async processing error:', asyncError);
        
        // If there's a response_url, send error message back to Slack
        if (response_url) {
          try {
            await axios.post(response_url, {
              response_type: "ephemeral",
              text: `Error converting topics to hashtags: ${asyncError.message}`
            });
          } catch (slackError) {
            console.error('Failed to send error message to Slack:', slackError);
          }
        }
      }
    })();
    
  } catch (error) {
    console.error('Error in convertTrendingTopicsToHashtags:', error);
    return res.status(500).json({
      text: "Error processing your request",
      response_type: "ephemeral"
    });
  }
};

module.exports = {
  fetchTrendingTopicsHandler,
  getTrendingTopicsHandler,
  convertTrendingTopicsToHashtags
}; 