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
 * Analyze trending audios for regional relevance
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object 
 */
const analyzeRegionalAudios = async (req, res) => {
  try {
    // Get optional parameters
    const { 
      limit = 10, // Reduced default limit to avoid quota issues
      region = "Rajasthani, Haryanvi, Bhojpuri",
      minFrequency = 1
    } = req.query;
    
    // Find trending audios from database
    const audios = await TrendingAudio.find({ 
      frequency: { $gte: parseInt(minFrequency) } 
    })
      .sort({ frequency: -1 })
      .limit(parseInt(limit));
    
    if (!audios.length) {
      return res.status(404).json({
        success: false,
        message: 'No trending audios found'
      });
    }
    
    try {
      // Get Gemini's analysis for regional relevance
      const analysis = await analyzeRegionalRelevance(audios, region);
      
      return res.status(200).json({
        success: true,
        data: analysis,
        totalAudiosAnalyzed: audios.length
      });
    } catch (aiError) {
      console.error('AI analysis error:', aiError);
      
      // Fallback: Return raw audios without AI analysis
      return res.status(200).json({
        success: true,
        message: 'AI analysis failed, returning raw audios',
        error: aiError.message,
        data: {
          audios: audios.map(audio => audio.toObject()),
          region,
          fallbackUsed: true
        },
        totalAudiosAnalyzed: audios.length
      });
    }
  } catch (error) {
    console.error('Error in analyzeRegionalAudios:', error);
    return res.status(500).json({
      success: false,
      message: 'Error analyzing regional audio relevance',
      error: error.message
    });
  }
};

module.exports = {
  analyzeAudioById,
  analyzeAllAudio,
  customPromptAnalysis,
  analyzeRegionalAudios
}; 