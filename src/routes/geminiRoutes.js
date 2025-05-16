const express = require('express');
const router = express.Router();
const geminiController = require('../controllers/geminiController');

/**
 * @swagger
 * tags:
 *   name: AI Analysis
 *   description: Gemini AI analysis of trending audio data
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     AudioAnalysis:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           description: Whether the analysis was successful
 *         data:
 *           type: object
 *           properties:
 *             analysis:
 *               type: string
 *               description: AI-generated analysis text
 *             audioData:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   description: MongoDB ID
 *                 name:
 *                   type: string
 *                   description: Name of the audio
 *                 audioAuthor:
 *                   type: string
 *                   description: Author/creator of the audio
 *                 frequency:
 *                   type: number
 *                   description: How many times the audio has been used
 *                 source:
 *                   type: string
 *                   enum: [instagram, tiktok, other]
 *                   description: Source platform
 *                 firstSeen:
 *                   type: string
 *                   format: date-time
 *                   description: When the audio was first observed
 *                 lastSeen:
 *                   type: string
 *                   format: date-time
 *                   description: When the audio was last observed
 *             modelUsed:
 *               type: string
 *               description: The Gemini model used for analysis
 *               enum: [gemini-1.5-pro, gemini-1.5-flash]
 *             fallbackUsed:
 *               type: boolean
 *               description: Whether a fallback approach was used due to API limitations
 *     RegionalAnalysis:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           description: Whether the analysis was successful
 *         data:
 *           type: object
 *           properties:
 *             analysis:
 *               type: string
 *               description: AI-generated analysis and recommendations
 *             sortedAudios:
 *               type: array
 *               description: Trending audios sorted by relevance to the specified region
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                     description: MongoDB ID
 *                   name:
 *                     type: string
 *                     description: Name of the audio
 *                   audioAuthor:
 *                     type: string
 *                     description: Author/creator of the audio
 *                   frequency:
 *                     type: number
 *                     description: How many times the audio has been used
 *                   relevanceScore:
 *                     type: number
 *                     description: Relevance score for the specified region (1-10)
 *             region:
 *               type: string
 *               description: The regional audience that was analyzed
 *             modelUsed:
 *               type: string
 *               description: The Gemini model used for analysis
 *               enum: [gemini-1.5-pro, gemini-1.5-flash]
 *             fallback:
 *               type: boolean
 *               description: Whether fallback scoring was used instead of AI due to rate limits
 *         totalAudiosAnalyzed:
 *           type: number
 *           description: Total number of audios analyzed
 */

/**
 * @swagger
 * /api/gemini/analyze/{id}:
 *   get:
 *     summary: Analyze a trending audio by ID using Gemini AI
 *     description: Get AI analysis for a specific trending audio track
 *     tags: [AI Analysis]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: MongoDB ID of the trending audio
 *     responses:
 *       200:
 *         description: Successful analysis
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AudioAnalysis'
 *       404:
 *         description: Audio not found
 *       500:
 *         description: Server error
 */
router.get('/analyze/:id', geminiController.analyzeAudioById);

/**
 * @swagger
 * /api/gemini/analyze:
 *   get:
 *     summary: Analyze trending audios
 *     description: Get AI analysis for the most trending audio tracks
 *     tags: [AI Analysis]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum number of audios to return
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           default: frequency
 *         description: Field to sort by (frequency, firstSeen, lastSeen)
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order (asc or desc)
 *     responses:
 *       200:
 *         description: Successful analysis
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AudioAnalysis'
 *       404:
 *         description: No trending audios found
 *       500:
 *         description: Server error
 */
router.get('/analyze', geminiController.analyzeAllAudio);

/**
 * @swagger
 * /api/gemini/analyze-regional:
 *   get:
 *     summary: Analyze trending audios for regional relevance
 *     description: Get AI analysis of which trending audios are most relevant for specific regional audiences. Uses rate-limited API with fallbacks.
 *     tags: [AI Analysis]
 *     parameters:
 *       - in: query
 *         name: region
 *         schema:
 *           type: string
 *           default: "Rajasthani, Haryanvi, Bhojpuri"
 *         description: Regional audience to analyze relevance for
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum number of audios to analyze (keep low to avoid rate limits)
 *       - in: query
 *         name: minFrequency
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Minimum frequency (number of uses) to include in analysis
 *     responses:
 *       200:
 *         description: Successful regional analysis (may use fallback if AI rate-limited)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RegionalAnalysis'
 *       404:
 *         description: No trending audios found
 *       500:
 *         description: Server error
 */
router.get('/analyze-regional', geminiController.analyzeRegionalAudios);

/**
 * @swagger
 * /api/gemini/custom-prompt:
 *   post:
 *     summary: Custom prompt for Gemini AI
 *     description: Send a custom prompt to Gemini AI for audio analysis. Includes fallback to alternative model if primary fails.
 *     tags: [AI Analysis]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prompt
 *             properties:
 *               prompt:
 *                 type: string
 *                 description: The custom prompt to send to Gemini
 *                 example: "What genres would use this audio and why is it trending?"
 *               audioId:
 *                 type: string
 *                 description: Optional MongoDB ID of a specific audio to analyze
 *                 example: "60d21b4667d0d8992e610c85"
 *               model:
 *                 type: string
 *                 enum: [pro, flash]
 *                 default: flash
 *                 description: Which Gemini model to use (pro is higher quality but more rate-limited)
 *     responses:
 *       200:
 *         description: Successful analysis
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     audioData:
 *                       type: object
 *                       description: Audio data if audioId was provided
 *                     userPrompt:
 *                       type: string
 *                       description: The prompt that was sent
 *                       example: "What genres would use this audio and why is it trending?"
 *                     analysis:
 *                       type: string
 *                       description: AI-generated analysis text
 *                     modelUsed:
 *                       type: string
 *                       description: The model that generated the response
 *                       enum: [gemini-1.5-pro, gemini-1.5-flash]
 *                     fallbackUsed:
 *                       type: boolean
 *                       description: Whether a fallback model was used due to API limitations
 *       400:
 *         description: Missing prompt
 *       404:
 *         description: Audio not found (if audioId provided)
 *       500:
 *         description: Server error
 */
router.post('/custom-prompt', geminiController.customPromptAnalysis);

module.exports = router; 