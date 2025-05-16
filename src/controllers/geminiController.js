const { analyzeAudio, analyzeRegionalRelevance, geminiProModel, geminiFlashModel } = require('../services/geminiService');
const TrendingAudio = require('../models/TrendingAudio');

/**
 * Analyze a trending audio by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const analyzeAudioById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find audio in database
    const audio = await TrendingAudio.findById(id);
    if (!audio) {
      return res.status(404).json({
        success: false,
        message: 'Trending audio not found'
      });
    }
    
    // Analyze with Gemini
    const analysis = await analyzeAudio(audio);
    
    return res.status(200).json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Error in analyzeAudioById:', error);
    return res.status(500).json({
      success: false,
      message: 'Error analyzing audio',
      error: error.message
    });
  }
};

/**
 * Analyze all trending audio
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const analyzeAllAudio = async (req, res) => {
  try {
    // Optional query parameters
    const { limit = 10, sort = 'frequency', order = 'desc' } = req.query;
    
    // Find trending audios from database
    const audios = await TrendingAudio.find()
      .sort({ [sort]: order === 'desc' ? -1 : 1 })
      .limit(parseInt(limit));
    
    if (!audios.length) {
      return res.status(404).json({
        success: false,
        message: 'No trending audios found'
      });
    }
    
    // Analyze first audio (to avoid rate limiting)
    const analysis = await analyzeAudio(audios[0]);
    
    return res.status(200).json({
      success: true,
      data: analysis,
      totalAudios: audios.length
    });
  } catch (error) {
    console.error('Error in analyzeAllAudio:', error);
    return res.status(500).json({
      success: false,
      message: 'Error analyzing audios',
      error: error.message
    });
  }
};

/**
 * Custom prompt analysis for audios
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const customPromptAnalysis = async (req, res) => {
  try {
    const { prompt, audioId, model = 'flash' } = req.body;
    
    if (!prompt) {
      return res.status(400).json({
        success: false,
        message: 'Prompt is required'
      });
    }
    
    let audio;
    if (audioId) {
      // If audioId provided, fetch that specific audio
      audio = await TrendingAudio.findById(audioId);
      if (!audio) {
        return res.status(404).json({
          success: false,
          message: 'Trending audio not found'
        });
      }
    } else {
      // Otherwise get the most frequent audio
      audio = await TrendingAudio.findOne().sort({ frequency: -1 });
    }
    
    // Choose model based on request
    const selectedModel = model.toLowerCase() === 'pro' ? geminiProModel : geminiFlashModel;
    
    try {
      // Generate content with custom prompt
      const result = await selectedModel.generateContent(prompt);
      const response = await result.response;
      
      return res.status(200).json({
        success: true,
        data: {
          audioData: audio,
          userPrompt: prompt,
          analysis: response.text(),
          modelUsed: model.toLowerCase() === 'pro' ? 'gemini-1.5-pro' : 'gemini-1.5-flash'
        }
      });
    } catch (aiError) {
      console.error('Error with primary model, trying fallback:', aiError);
      
      // Try with alternative model if first fails
      const fallbackModel = model.toLowerCase() === 'pro' ? geminiFlashModel : geminiProModel;
      const fallbackResult = await fallbackModel.generateContent(prompt);
      const fallbackResponse = await fallbackResult.response;
      
      return res.status(200).json({
        success: true,
        data: {
          audioData: audio,
          userPrompt: prompt,
          analysis: fallbackResponse.text(),
          modelUsed: model.toLowerCase() === 'pro' ? 'gemini-1.5-flash' : 'gemini-1.5-pro',
          fallbackUsed: true
        }
      });
    }
  } catch (error) {
    console.error('Error in customPromptAnalysis:', error);
    return res.status(500).json({
      success: false,
      message: 'Error processing custom prompt',
      error: error.message
    });
  }
};

/**
 * Analyze trending audios for regional relevance - optimized for Slack commands
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object 
 */
const analyzeRegionalAudios = async (req, res) => {
  try {
    // Get optional parameters
    const { 
      limit = 10, // Reduced default limit to avoid quota issues
      region = "Rajasthani, Haryanvi, Bhojpuri",
      minFrequency = 1,
      response_url // Slack response_url for async replies
    } = req.body;
    
    // Send immediate acknowledgment response to avoid timeout
    res.status(200).json({
      response_type: "ephemeral", // Only visible to the user who triggered the command
      text: "Analyzing trending audios for regional relevance. Results will be posted shortly..."
    });
    
    // Process the request asynchronously
    (async () => {
      try {
        // Find trending audios from database
        const audios = await TrendingAudio.find({ 
          frequency: { $gte: parseInt(minFrequency) } 
        })
          .sort({ frequency: -1 })
          .limit(parseInt(limit));
        
        let responseBody;
        
        if (!audios.length) {
          responseBody = {
            response_type: "ephemeral",
            text: "No trending audios found matching your criteria."
          };
        } else {
          try {
            // Get Gemini's analysis for regional relevance
            const analysis = await analyzeRegionalRelevance(audios, region);
            
            // Format the analysis for Slack - keeping it simple to avoid payload issues
            const analysisText = typeof analysis === 'string' 
              ? analysis 
              : "Analysis completed. Check dashboard for full details.";
            
            // Create a stylized list of audio tracks instead of comma-separated values
            const audioListBlocks = audios.map(audio => {
              return {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `*${audio.name}*\n${audio.audioAuthor ? `👤 ${audio.audioAuthor}` : "👤 Unknown artist"}\n🔄 Used ${audio.frequency} times`
                }
              };
            });
            
            // Add a divider before the analysis section
            const dividerBlock = {
              type: "divider"
            };
            
            // Add a header for the analysis section
            const analysisHeaderBlock = {
              type: "header",
              text: {
                type: "plain_text",
                text: "Analysis",
                emoji: true
              }
            };
            
            // Format the analysis as its own section
            const analysisBlock = {
              type: "section",
              text: {
                type: "mrkdwn",
                text: analysisText.length > 2800 
                  ? analysisText.substring(0, 2800) + "... [truncated, see dashboard for full details]" 
                  : analysisText
              }
            };
              
            responseBody = {
              response_type: "in_channel", // Visible to everyone in the channel
              text: `*Regional Audio Analysis for ${region}*\n${audios.length} audios analyzed`,
              blocks: [
                {
                  type: "header",
                  text: {
                    type: "plain_text",
                    text: `Regional Audio Analysis for ${region}`,
                    emoji: true
                  }
                },
                {
                  type: "section",
                  text: {
                    type: "mrkdwn",
                    text: `Found ${audios.length} trending audio tracks for ${region} regions.`
                  }
                },
                dividerBlock,
                ...audioListBlocks,
                dividerBlock,
                analysisHeaderBlock,
                analysisBlock
              ]
            };
          } catch (aiError) {
            console.error('AI analysis error:', aiError);
            
            // Create styled audio blocks for fallback response
            const audioListBlocks = audios.map(audio => {
              return {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `*${audio.name}*\n👤 ${audio.audioAuthor || 'Unknown artist'}\n🔄 Used ${audio.frequency} times`
                }
              };
            });
            
            // Fallback: Return a simple error message
            responseBody = {
              response_type: "ephemeral",
              text: `AI analysis failed: ${aiError.message}`,
              blocks: [
                {
                  type: "header",
                  text: {
                    type: "plain_text",
                    text: "Regional Audio Analysis Failed",
                    emoji: true
                  }
                },
                {
                  type: "section",
                  text: {
                    type: "mrkdwn",
                    text: `Error: ${aiError.message}`
                  }
                },
                {
                  type: "divider"
                },
                {
                  type: "section",
                  text: {
                    type: "mrkdwn",
                    text: `Found ${audios.length} trending audios for region: ${region}`
                  }
                },
                {
                  type: "divider"
                },
                ...audioListBlocks
              ]
            };
          }
        }
        
        // Send the delayed response via response_url if available
        if (response_url) {
          try {
            // Using axios or fetch to post back to the response_url
            const axios = require('axios');
            await axios.post(response_url, responseBody);
          } catch (slackError) {
            console.error('Error sending response to Slack:', slackError);
            console.error('Response payload:', JSON.stringify(responseBody).substring(0, 200) + '...');
            
            // Try with a minimal fallback response if original fails
            const fallbackResponse = {
              response_type: "ephemeral",
              text: "Analysis completed but response too large for Slack. Please check the dashboard."
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
          const axios = require('axios');
          try {
            await axios.post(response_url, {
              response_type: "ephemeral",
              text: `Error analyzing regional audio relevance: ${asyncError.message}`
            });
          } catch (slackError) {
            console.error('Failed to send error message to Slack:', slackError);
          }
        }
      }
    })();
    
  } catch (error) {
    console.error('Error in analyzeRegionalAudios:', error);
    return res.status(500).json({
      text: "Error processing your request",
      response_type: "ephemeral"
    });
  }
};

module.exports = {
  analyzeAudioById,
  analyzeAllAudio,
  customPromptAnalysis,
  analyzeRegionalAudios
}; 