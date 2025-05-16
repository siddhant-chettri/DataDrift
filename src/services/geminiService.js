const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize the Gemini API with the provided API key
const API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

// Configure multiple models for fallback options
const geminiProModel = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
const geminiFlashModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }); // Lower resource model

// Add rate limiting controls
const rateLimiter = {
  lastRequestTime: 0,
  minDelayBetweenRequests: 1000, // Milliseconds between requests
  requestsInLastMinute: 0,
  requestsPerMinuteLimit: 5, // Conservative limit for free tier
  resetTime: Date.now(),
  
  async throttle() {
    const now = Date.now();
    
    // Reset counter after a minute
    if (now - this.resetTime > 60000) {
      this.requestsInLastMinute = 0;
      this.resetTime = now;
    }
    
    // Check if we're over the per-minute limit
    if (this.requestsInLastMinute >= this.requestsPerMinuteLimit) {
      const waitTime = 60000 - (now - this.resetTime) + 1000;
      console.log(`Rate limit reached. Waiting ${waitTime}ms before next request`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.requestsInLastMinute = 0;
      this.resetTime = Date.now();
    }
    
    // Ensure minimum delay between requests
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minDelayBetweenRequests) {
      const delayNeeded = this.minDelayBetweenRequests - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delayNeeded));
    }
    
    this.lastRequestTime = Date.now();
    this.requestsInLastMinute++;
  }
};

/**
 * Function to analyze audio data with Gemini API
 * @param {Object} audioData - The trending audio data to analyze
 * @returns {Promise<Object>} - Gemini's analysis response
 */
const analyzeAudio = async (audioData) => {
  try {
    await rateLimiter.throttle();
    
    const prompt = `
      Analyze this trending audio data from ${audioData.source}:
      
      Name: ${audioData.name}
      Author: ${audioData.audioAuthor || 'Unknown'}
      Frequency: Used in ${audioData.frequency} reels/videos
      First seen: ${audioData.firstSeen}
      Last seen: ${audioData.lastSeen}
      
      Please provide:
      1. Why might this audio be trending?
      2. What type of content is this audio typically used for?
      3. Any cultural or social significance of this audio
      4. Recommendations for content creators about using this audio
    `;

    try {
      // Try with primary model first
      const result = await geminiProModel.generateContent(prompt);
      const response = await result.response;
      return {
        success: true,
        analysis: response.text(),
        audioData,
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
        audioData,
        modelUsed: 'gemini-1.5-flash',
        fallbackUsed: true
      };
    }
  } catch (error) {
    console.error('Error analyzing audio with Gemini:', error);
    return {
      success: false,
      error: error.message,
      audioData
    };
  }
};

/**
 * Analyze multiple audios for regional relevance with simplified approach
 * @param {Array} audios - Array of trending audio data
 * @param {String} region - Region to analyze for (e.g., "Rajasthani, Haryanvi, Bhojpuri")
 * @returns {Promise<Object>} - Gemini's analysis response with sorted audios
 */
const analyzeRegionalRelevance = async (audios, region = "Rajasthani, Haryanvi, Bhojpuri") => {
  try {
    await rateLimiter.throttle();
    
    // Reduce the size of the prompt to avoid quota issues
    // Only include essential information about each audio
    const audioSummaries = audios.slice(0, 10).map((audio, index) => 
      `Audio ${index + 1}: "${audio.name}" by ${audio.audioAuthor || 'Unknown'}`
    ).join('\n');

    const prompt = `
      As an expert in Indian regional content, which of these audio tracks would appeal most to ${region} audiences?
      
      ${audioSummaries}
      
      Rate each audio's relevance (1-10) for ${region} audiences. Consider:
      - Regional language match
      - Cultural references
      - Regional music style
      - Local trends
      
      For each audio provide:
      1. Relevance score/10
      2. Brief reason
      
      Then list the top 3 most relevant audios in order.
    `;

    let analysisText;
    let modelUsed;
    
    try {
      // Try with flash model first since it has higher quota limits
      const result = await geminiFlashModel.generateContent(prompt);
      const response = await result.response;
      analysisText = response.text();
      modelUsed = 'gemini-1.5-flash';
    } catch (flashError) {
      console.log('Error with gemini-1.5-flash, trying with pro model:', flashError.message);
      
      // Wait before trying the pro model to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      try {
        const proResult = await geminiProModel.generateContent(prompt);
        const proResponse = await proResult.response;
        analysisText = proResponse.text();
        modelUsed = 'gemini-1.5-pro';
      } catch (proError) {
        // If both models fail, return a simpler analysis based on the audio name
        return generateFallbackAnalysis(audios, region);
      }
    }
    
    // Extract relevance scores with improved regex pattern
    const scoredAudios = audios.slice(0, 10).map((audio, index) => {
      const audioNumber = index + 1;
      // Various patterns to match scores in different formats
      const patterns = [
        new RegExp(`Audio\\s*${audioNumber}[^\\d]*(\\d+)[\\s/]*10`),
        new RegExp(`Audio\\s*${audioNumber}[^\\d]*score\\s*:?\\s*(\\d+)`),
        new RegExp(`${index + 1}\\.\\s*[^\\d]*(\\d+)[\\s/]*10`),
        new RegExp(`\\*\\*Audio\\s*${audioNumber}\\*\\*[^\\d]*(\\d+)`)
      ];
      
      let relevanceScore = 0;
      for (const pattern of patterns) {
        const match = analysisText.match(pattern);
        if (match && match[1]) {
          relevanceScore = parseInt(match[1], 10);
          break;
        }
      }
      
      // If no score was found, make an educated guess based on audio name
      if (relevanceScore === 0) {
        relevanceScore = estimateRegionalRelevance(audio, region);
      }
      
      return {
        ...audio.toObject(),
        relevanceScore,
        audioNumber
      };
    });
    
    // Sort by relevance score
    const sortedAudios = scoredAudios.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    return {
      success: true,
      analysis: analysisText,
      sortedAudios,
      region,
      modelUsed
    };
  } catch (error) {
    console.error('Error analyzing regional relevance with Gemini:', error);
    return generateFallbackAnalysis(audios, region);
  }
};

/**
 * Generate fallback analysis without using AI
 * @param {Array} audios - Array of audio data
 * @param {String} region - Target region
 * @returns {Object} - Fallback analysis
 */
function generateFallbackAnalysis(audios, region) {
  const regionKeywords = {
    'rajasthani': ['rajasthani', 'marwari', 'rajasthan', 'folk', 'ghoomar', 'kesariya', 'balam', 'padharo'],
    'haryanvi': ['haryanvi', 'haryana', 'jaat', 'sapna', 'desi', 'ragini', 'solid', 'swag'],
    'bhojpuri': ['bhojpuri', 'bihar', 'up', 'purvanchal', 'lollipop', 'raat', 'piya', 'lahariya']
  };
  
  // Score each audio based on name and author matching regional keywords
  const scoredAudios = audios.map(audio => {
    let relevanceScore = 5; // Default middle score
    
    const audioText = (audio.name + ' ' + (audio.audioAuthor || '')).toLowerCase();
    
    // Check for regional keyword matches
    Object.entries(regionKeywords).forEach(([regionalName, keywords]) => {
      if (region.toLowerCase().includes(regionalName)) {
        keywords.forEach(keyword => {
          if (audioText.includes(keyword)) {
            relevanceScore += 1; // Increase score for each keyword match
          }
        });
      }
    });
    
    // Cap the score at 10
    relevanceScore = Math.min(10, relevanceScore);
    
    return {
      ...audio.toObject(),
      relevanceScore
    };
  });
  
  const sortedAudios = scoredAudios.sort((a, b) => b.relevanceScore - a.relevanceScore);
  
  return {
    success: true,
    analysis: `Fallback analysis for ${region} region without using AI due to API limitations. 
               Audios have been scored based on name matching with regional keywords.`,
    sortedAudios,
    region,
    fallback: true
  };
}

/**
 * Estimate regional relevance based on audio name and region
 * @param {Object} audio - Audio object
 * @param {String} region - Target region
 * @returns {Number} - Estimated relevance score (1-10)
 */
function estimateRegionalRelevance(audio, region) {
  const audioName = (audio.name || '').toLowerCase();
  const author = (audio.audioAuthor || '').toLowerCase();
  const combinedText = audioName + ' ' + author;
  
  const regionParts = region.toLowerCase().split(/[,\s]+/);
  
  // Basic score starts at 5
  let score = 5;
  
  // Check for exact region name matches
  for (const part of regionParts) {
    if (part.length > 3 && combinedText.includes(part)) {
      score += 3;
    }
  }
  
  // Regional language indicators
  const regionalWords = {
    'rajasthani': ['padharo', 'balam', 'kesariya', 'marwari', 'rajasthan'],
    'haryanvi': ['haryana', 'jaat', 'desi', 'sapna'],
    'bhojpuri': ['bihar', 'bhojpur', 'purvanchal', 'lollipop']
  };
  
  // Check for regional words
  for (const [region, words] of Object.entries(regionalWords)) {
    for (const word of words) {
      if (combinedText.includes(word)) {
        score += 1;
      }
    }
  }
  
  // Limit score to 1-10 range
  return Math.max(1, Math.min(10, score));
}

module.exports = {
  analyzeAudio,
  analyzeRegionalRelevance,
  geminiProModel,
  geminiFlashModel
}; 