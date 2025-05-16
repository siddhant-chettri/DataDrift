const axios = require('axios');
const InstagramPost = require('../models/InstagramPost');
const { geminiProModel, geminiFlashModel } = require('./geminiService');

/**
 * Check if the access token is valid
 * @returns {Promise<boolean>} Whether the token is valid
 */
const isAccessTokenValid = async () => {
  try {
    const accessToken = process.env.INSTA_ACCESS_TOKEN;
    
    if (!accessToken) {
      console.error('No Instagram access token found in environment variables');
      return false;
    }
    
    // Make a simple test call to check token validity
    const response = await axios.get(
      'https://graph.facebook.com/v22.0/me',
      {
        params: {
          access_token: accessToken
        }
      }
    );
    
    return !!response.data.id;
  } catch (error) {
    if (error.response?.data?.error?.type === 'OAuthException') {
      console.error('Facebook access token is invalid or expired:', error.response.data.error.message);
      return false;
    }
    console.error('Error checking access token validity:', error);
    return false;
  }
};

/**
 * Get business account ID from a Facebook page
 * @param {string} pageId - Facebook page ID
 * @returns {Promise<string>} Instagram business account ID
 */
const getInstagramBusinessAccount = async (pageId) => {
  try {
    const accessToken = process.env.INSTA_ACCESS_TOKEN;
    
    if (!accessToken) {
      throw new Error('Instagram access token not found in environment variables');
    }
    
    // Validate token first
    const isValid = await isAccessTokenValid();
    if (!isValid) {
      throw new Error('Instagram access token is invalid or expired. Please refresh your token.');
    }
    
    const response = await axios.get(
      `https://graph.facebook.com/v22.0/${pageId}`,
      {
        params: {
          fields: 'instagram_business_account',
          access_token: accessToken
        }
      }
    );

    if (!response.data.instagram_business_account || !response.data.instagram_business_account.id) {
      throw new Error('Instagram business account not found');
    }

    return response.data.instagram_business_account.id;
  } catch (error) {
    console.error('Error getting Instagram business account:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Fetch media from Instagram business account
 * @param {string} instagramAccountId - Instagram business account ID
 * @param {number} limit - Number of posts to fetch
 * @returns {Promise<Array>} List of media items
 */
const fetchInstagramMedia = async (instagramAccountId, limit = 25) => {
  try {
    const accessToken = process.env.INSTA_ACCESS_TOKEN;
    
    if (!accessToken) {
      throw new Error('Instagram access token not found in environment variables');
    }
    
    // Validate token first
    const isValid = await isAccessTokenValid();
    if (!isValid) {
      throw new Error('Instagram access token is invalid or expired. Please refresh your token.');
    }
    
    const response = await axios.get(
      `https://graph.facebook.com/v22.0/${instagramAccountId}/media`,
      {
        params: {
          fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count',
          limit,
          access_token: accessToken
        }
      }
    );

    return response.data.data || [];
  } catch (error) {
    console.error('Error fetching Instagram media:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Fetch insights for a specific media item
 * @param {string} mediaId - Instagram media ID
 * @returns {Promise<Object>} Media insights
 */
const fetchMediaInsights = async (mediaId) => {
  try {
    const accessToken = process.env.INSTA_ACCESS_TOKEN;
    
    if (!accessToken) {
      throw new Error('Instagram access token not found in environment variables');
    }
    
    // Updated metrics based on Instagram API v22.0 documentation
    // Using 'views' instead of 'impressions' as per the latest API changes
    // 'impressions', 'plays', 'clips_replays_count' are deprecated
    // See: https://developers.facebook.com/docs/instagram-platform/reference/instagram-media/insights/
    const metrics = 'views,reach,saved,comments,likes,shares';
    
    const response = await axios.get(
      `https://graph.facebook.com/v22.0/${mediaId}/insights`,
      {
        params: {
          metric: metrics,
          access_token: accessToken
        }
      }
    );

    // Process the insights data into a more usable format
    const processedInsights = {};
    if (response.data.data) {
      response.data.data.forEach(metric => {
        processedInsights[metric.name] = metric.values[0]?.value || 0;
      });
    }

    return processedInsights;
  } catch (error) {
    console.error(`Error fetching insights for media ${mediaId}:`, error.response?.data || error.message);
    // Don't throw here as we want to continue processing other media items
    return {};
  }
};

/**
 * Fetch and store Instagram posts
 * @param {string} pageId - Facebook page ID
 * @param {number} limit - Number of posts to fetch
 * @param {string} region - Optional region identifier
 * @returns {Promise<Array>} List of posts stored
 */
const fetchAndStoreInstagramPosts = async (pageId, limit = 25, region = null) => {
  try {
    // Get Instagram business account ID
    const instagramAccountId = await getInstagramBusinessAccount(pageId);
    
    // Fetch media from Instagram
    const mediaItems = await fetchInstagramMedia(instagramAccountId, limit);
    
    const storedPosts = [];
    
    // Process each media item
    for (const media of mediaItems) {
      try {
        // Fetch insights for this media
        const insights = await fetchMediaInsights(media.id);
        
        console.log(insights ,"===================insight")
        // Calculate engagement rate
        const engagementRate = calculateEngagementRate(media, insights);
        
        // Extract hashtags and mentions from caption
        const { hashtags, mentions } = extractHashtagsAndMentions(media.caption || '');
        
        // Create or update post in database
        const post = await InstagramPost.findOneAndUpdate(
          { postId: media.id },
          {
            postId: media.id,
            mediaType: media.media_type,
            caption: media.caption || '',
            permalink: media.permalink,
            mediaUrl: media.media_url || '',
            thumbnailUrl: media.thumbnail_url || '',
            timestamp: new Date(media.timestamp),
            likeCount: media.like_count || 0,
            commentsCount: media.comments_count || 0,
            reachCount: insights.reach || 0,
            viewCount: insights.views || 0,
            savedCount: insights.saved || 0,
            sharesCount: insights.shares || 0,
            engagementRate,
            hashtags,
            mentions,
            ...(region && { region }), // Only set region if provided
            $push: {
              performanceSnapshots: {
                date: new Date(),
                likeCount: media.like_count || 0,
                commentsCount: media.comments_count || 0,
                reachCount: insights.reach || 0,
                viewCount: insights.views || 0,
                savedCount: insights.saved || 0,
                sharesCount: insights.shares || 0,
                engagementRate
              }
            },
            lastUpdated: new Date()
          },
          { new: true, upsert: true }
        );
        
        storedPosts.push(post);
      } catch (itemError) {
        console.error(`Error processing media item ${media.id}:`, itemError);
        // Continue with next item
      }
    }
    
    return storedPosts;
  } catch (error) {
    console.error('Error in fetchAndStoreInstagramPosts:', error);
    throw error;
  }
};

/**
 * Calculate engagement rate for a post
 * @param {Object} media - Media item data
 * @param {Object} insights - Insights data
 * @returns {number} Engagement rate as a percentage
 */
const calculateEngagementRate = (media, insights) => {
  // Update to include likes, comments, saves, and shares in interactions
  const interactions = (media.like_count || 0) + 
                       (media.comments_count || 0) + 
                       (insights.saved || 0) + 
                       (insights.shares || 0);
  
  // Use reach instead of views for engagement rate calculation
  // as reach represents unique users, which is more appropriate for engagement metrics
  const reach = insights.reach || 0;
  
  if (!reach) return 0;
  
  return parseFloat(((interactions / reach) * 100).toFixed(2));
};

/**
 * Extract hashtags and mentions from caption
 * @param {string} caption - Post caption
 * @returns {Object} Object containing arrays of hashtags and mentions
 */
const extractHashtagsAndMentions = (caption) => {
  const hashtags = [];
  const mentions = [];
  
  // Extract hashtags (#example)
  const hashtagRegex = /#[\w\u0590-\u05FF]+/g;
  const hashtagMatches = caption.match(hashtagRegex);
  if (hashtagMatches) {
    hashtagMatches.forEach(tag => {
      hashtags.push(tag.slice(1)); // Remove # symbol
    });
  }
  
  // Extract mentions (@example)
  const mentionRegex = /@[\w\.]+/g;
  const mentionMatches = caption.match(mentionRegex);
  if (mentionMatches) {
    mentionMatches.forEach(mention => {
      mentions.push(mention.slice(1)); // Remove @ symbol
    });
  }
  
  return { hashtags, mentions };
};

/**
 * Get Instagram posts with filters
 * @param {Object} filters - Query filters
 * @returns {Promise<Array>} List of posts matching filters
 */
const getInstagramPosts = async (filters = {}) => {
  try {
    const query = {};
    
    // Apply filters
    if (filters.mediaType) {
      query.mediaType = filters.mediaType;
    }
    
    if (filters.region) {
      query.region = filters.region;
    }
    
    if (filters.startDate) {
      query.timestamp = { $gte: filters.startDate };
    }
    
    if (filters.endDate) {
      if (query.timestamp) {
        query.timestamp.$lte = filters.endDate;
      } else {
        query.timestamp = { $lte: filters.endDate };
      }
    }
    
    let posts = await InstagramPost.find(query)
      .sort({ timestamp: -1 }) // Sort by most recent first
      .limit(filters.limit || 100);
      
    return posts;
  } catch (error) {
    console.error('Error retrieving Instagram posts:', error);
    throw error;
  }
};

/**
 * Analyze Instagram Reels performance
 * @param {Array} reels - Array of Instagram Reels data
 * @param {string} timeframe - Description of the timeframe
 * @returns {Promise<Object>} Analysis results
 */
const analyzeReelsPerformance = async (reels, timeframe) => {
  try {
    if (!reels || reels.length === 0) {
      return {
        success: false,
        error: 'No reels data provided for analysis'
      };
    }
    
    // Sort reels by engagement rate (highest to lowest)
    const sortedReels = [...reels].sort((a, b) => b.engagementRate - a.engagementRate);
    
    // Get top and bottom performers (30% each)
    const topCount = Math.max(1, Math.ceil(sortedReels.length * 0.3));
    const topPerformers = sortedReels.slice(0, topCount);
    const bottomPerformers = sortedReels.slice(-topCount);
    
    // Prepare the prompt for Gemini
    const prompt = `
      You are an expert social media analyst specializing in Instagram Reels. 
      I need you to analyze a set of ${reels.length} Instagram Reels from ${timeframe}.
      
      Here are the details of the top-performing reels by engagement rate:
      ${topPerformers.map((reel, i) => `
      ${i + 1}. Posted on: ${new Date(reel.timestamp).toLocaleDateString()}
         Caption: ${reel.caption}
         Engagement Rate: ${reel.engagementRate}%
         Likes: ${reel.likeCount}
         Comments: ${reel.commentsCount}
         Reach: ${reel.reachCount}
         Saved: ${reel.savedCount}
         Hashtags: ${reel.hashtags || 'None'}
      `).join('\n')}
      
      Here are the details of the bottom-performing reels by engagement rate:
      ${bottomPerformers.map((reel, i) => `
      ${i + 1}. Posted on: ${new Date(reel.timestamp).toLocaleDateString()}
         Caption: ${reel.caption}
         Engagement Rate: ${reel.engagementRate}%
         Likes: ${reel.likeCount}
         Comments: ${reel.commentsCount}
         Reach: ${reel.reachCount}
         Saved: ${reel.savedCount}
         Hashtags: ${reel.hashtags || 'None'}
      `).join('\n')}
      
      Please analyze:
      1. Key content patterns that performed well
      2. What didn't work with the low-performing reels
      3. Best day/time to post based on this data
      4. Optimal caption length and hashtag use
      5. Specific recommendations for future reels
      
      Format your response with clear bullets under each section.
    `;
    
    try {
      // Try with geminiProModel first
      const result = await geminiProModel.generateContent(prompt);
      const response = await result.response;
      return {
        success: true,
        analysis: response.text(),
        topPerformers: topPerformers.map(r => r.postId),
        bottomPerformers: bottomPerformers.map(r => r.postId),
        reelsCount: reels.length,
        timeframe,
        modelUsed: 'gemini-1.5-pro'
      };
    } catch (proError) {
      console.log('Error with gemini-1.5-pro, falling back to gemini-1.5-flash', proError.message);
      
      // Fallback to the flash model if the pro model fails
      const fallbackResult = await geminiFlashModel.generateContent(prompt);
      const fallbackResponse = await fallbackResult.response;
      return {
        success: true,
        analysis: fallbackResponse.text(),
        topPerformers: topPerformers.map(r => r.postId),
        bottomPerformers: bottomPerformers.map(r => r.postId),
        reelsCount: reels.length,
        timeframe,
        modelUsed: 'gemini-1.5-flash',
        fallbackUsed: true
      };
    }
  } catch (error) {
    console.error('Error analyzing reels with Gemini:', error);
    return {
      success: false,
      error: error.message,
      reelsCount: reels.length,
      timeframe
    };
  }
};

/**
 * Fetch details of a Facebook page using an access token
 * @param {string} accessToken - Facebook Graph API access token
 * @returns {Promise<Array>} Array of page details objects
 */
const getPageDetails = async (accessToken) => {
  try {
    if (!accessToken) {
      throw new Error('Access token is required');
    }
    
    const response = await axios.get(
      `https://graph.facebook.com/v22.0/me/accounts`,
      {
        params: {
          access_token: accessToken
        }
      }
    );

    return response.data.data || [];
  } catch (error) {
    console.error('Error fetching page details:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Fetch details of a specific Facebook page by ID
 * @param {string} pageId - Facebook page ID
 * @param {string} accessToken - Facebook Graph API access token
 * @returns {Promise<Object>} Page details object
 */
const getPageDetailsById = async (pageId, accessToken) => {
  try {
    if (!pageId) {
      throw new Error('Page ID is required');
    }
    
    if (!accessToken) {
      throw new Error('Access token is required');
    }
    
    const response = await axios.get(
      `https://graph.facebook.com/v22.0/${pageId}`,
      {
        params: {
          fields: 'id,name,category,category_list,about,description,fan_count,website,phone,emails,location,link',
          access_token: accessToken
        }
      }
    );

    return response.data || {};
  } catch (error) {
    console.error(`Error fetching page details for ID ${pageId}:`, error.response?.data || error.message);
    throw error;
  }
};

/**
 * Get page ID by region
 * @param {string} region - Region name (e.g., 'bhojpuri', 'haryanvi', 'rajasthani')
 * @returns {Promise<string>} Facebook page ID for the specified region
 */
const getPageIdByRegion = async (region) => {
  try {
    const accessToken = process.env.INSTA_ACCESS_TOKEN;
    
    if (!accessToken) {
      throw new Error('Instagram access token not found in environment variables');
    }
    
    // Get all pages associated with the access token
    const pages = await getPageDetails(accessToken);
    
    if (!pages || pages.length === 0) {
      throw new Error('No pages found for the access token');
    }
    
    // Normalize the region for comparison
    const normalizedRegion = region.toLowerCase().trim();
    
    // Map of normalized region names to their Hindi/native representations
    const regionMap = {
      'bhojpuri': 'भोजपुरी',
      'haryanvi': 'हरियाणवी',
      'rajasthani': 'राजस्थानी'
    };
    
    // Find the page that matches the region
    const matchedPage = pages.find(page => {
      const pageName = page.name.toLowerCase();
      return pageName.includes(normalizedRegion) || 
             (regionMap[normalizedRegion] && pageName.includes(regionMap[normalizedRegion].toLowerCase()));
    });
    
    if (!matchedPage) {
      throw new Error(`No page found for region: ${region}`);
    }
    
    return matchedPage.id;
  } catch (error) {
    console.error('Error getting page ID by region:', error);
    throw error;
  }
};

/**
 * Fetch and store Instagram posts for all regions
 * @param {number} limit - Number of posts to fetch per region
 * @returns {Promise<Object>} Results of the operation for each region
 */
const fetchPostsAndSave = async (limit = 25) => {
  try {
    const regions = ['bhojpuri', 'haryanvi', 'rajasthani'];
    const results = {};
    const allPosts = [];
    
    // Fetch posts for each region
    for (const region of regions) {
      try {
        const pageId = await getPageIdByRegion(region);
        const posts = await fetchAndStoreInstagramPosts(pageId, limit, region);
        
        results[region] = {
          success: true,
          count: posts.length,
          message: `Fetched ${posts.length} posts for ${region}`
        };
        
        allPosts.push(...posts);
      } catch (regionError) {
        console.error(`Error fetching posts for region ${region}:`, regionError);
        results[region] = {
          success: false,
          error: regionError.message
        };
      }
    }
    
    return {
      success: true,
      regions: results,
      totalPosts: allPosts.length,
      posts: allPosts
    };
  } catch (error) {
    console.error('Error in fetchPostsAndSave:', error);
    throw error;
  }
};

/**
 * Fetch posts for a specific region
 * @param {string} region - Region name (e.g., 'bhojpuri', 'haryanvi', 'rajasthani')
 * @returns {Promise<Array>} List of Instagram posts for the region
 */
const fetchPostsForRegion = async (region) => {
  try {
    // Get page ID for the specified region
    const pageId = await getPageIdByRegion(region);
    
    // Use existing function to fetch media
    const instagramAccountId = await getInstagramBusinessAccount(pageId);
    const mediaItems = await fetchInstagramMedia(instagramAccountId, 50);
    
    // Process media items without storing them
    const posts = mediaItems.map(media => ({
      id: media.id,
      mediaType: media.media_type,
      caption: media.caption || '',
      permalink: media.permalink,
      region: region,
      mediaUrl: media.media_url || '',
      thumbnailUrl: media.thumbnail_url || '',
      timestamp: media.timestamp,
      likeCount: media.like_count || 0,
      commentsCount: media.comments_count || 0
    }));
    
    return posts;
  } catch (error) {
    console.error(`Error in fetchPostsForRegion for region ${region}:`, error);
    throw error;
  }
};

/**
 * Fetch and store Instagram posts for a specific region
 * @param {string} region - Region name (e.g., 'bhojpuri', 'haryanvi', 'rajasthani')
 * @param {number} limit - Number of posts to fetch
 * @returns {Promise<Array>} List of Instagram posts stored for the region
 */
const fetchAndStoreInstagramPostsByRegion = async (region, limit = 25) => {
  try {
    // Get page ID for the specified region
    const pageId = await getPageIdByRegion(region);
    
    // Fetch Instagram Business Account ID for the page
    const instagramAccountId = await getInstagramBusinessAccount(pageId);
    
    // Fetch media items from the Instagram account
    const mediaItems = await fetchInstagramMedia(instagramAccountId, limit);
    
    // Array to store processed posts
    const storedPosts = [];
    
    // Process each media item
    for (const media of mediaItems) {
      try {
        // Fetch insights for the media
        const insights = await fetchMediaInsights(media.id);
        
        // Calculate engagement rate
        const engagementRate = calculateEngagementRate(media, insights);
        
        // Extract hashtags and mentions from caption
        const { hashtags, mentions } = extractHashtagsAndMentions(media.caption || '');
        
        // Find existing post or create new one
        const post = await InstagramPost.findOneAndUpdate(
          { postId: media.id },
          {
            postId: media.id,
            mediaType: media.media_type,
            caption: media.caption || '',
            permalink: media.permalink,
            region: region, // Set the region field
            mediaUrl: media.media_url || '',
            thumbnailUrl: media.thumbnail_url || '',
            timestamp: new Date(media.timestamp),
            likeCount: media.like_count || 0,
            commentsCount: media.comments_count || 0,
            reachCount: insights.reach || 0,
            viewCount: insights.views || 0,
            savedCount: insights.saved || 0,
            sharesCount: insights.shares || 0,
            engagementRate,
            hashtags,
            mentions,
            $push: {
              performanceSnapshots: {
                date: new Date(),
                likeCount: media.like_count || 0,
                commentsCount: media.comments_count || 0,
                reachCount: insights.reach || 0,
                viewCount: insights.views || 0,
                savedCount: insights.saved || 0,
                sharesCount: insights.shares || 0,
                engagementRate
              }
            },
            lastUpdated: new Date()
          },
          { new: true, upsert: true }
        );
        
        storedPosts.push(post);
      } catch (itemError) {
        console.error(`Error processing media item ${media.id} for region ${region}:`, itemError);
        // Continue with next item
      }
    }
    
    return storedPosts;
  } catch (error) {
    console.error(`Error in fetchAndStoreInstagramPostsByRegion for region ${region}:`, error);
    throw error;
  }
};

module.exports = {
  isAccessTokenValid,
  getInstagramBusinessAccount,
  fetchInstagramMedia,
  fetchMediaInsights,
  fetchAndStoreInstagramPosts,
  fetchAndStoreInstagramPostsByRegion,
  getInstagramPosts,
  analyzeReelsPerformance,
  getPageDetails,
  getPageDetailsById,
  getPageIdByRegion,
  fetchPostsAndSave,
  fetchPostsForRegion
}; 