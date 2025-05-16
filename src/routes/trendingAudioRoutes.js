const express = require('express');
const router = express.Router();
const trendingAudioController = require('../controllers/trendingAudioController');

/**
 * @swagger
 * components:
 *   schemas:
 *     TrendingAudio:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated ID of the audio
 *         audioName:
 *           type: string
 *           description: The name of the audio
 *         usageCount:
 *           type: integer
 *           description: Number of times the audio has been used
 *         recentReels:
 *           type: array
 *           description: Recent reels using this audio
 *           items:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               caption:
 *                 type: string
 *               likeCount:
 *                 type: integer
 *               postUrl:
 *                 type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/trending-audios:
 *   get:
 *     summary: Get all trending audios
 *     description: Retrieve a list of all trending audios
 *     tags: [Trending Audios]
 *     responses:
 *       200:
 *         description: A list of trending audios
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/TrendingAudio'
 *       500:
 *         description: Server error
 */
router.get('/', trendingAudioController.getAllTrendingAudios);

/**
 * @swagger
 * /api/trending-audios/top:
 *   get:
 *     summary: Get top trending audios
 *     description: Retrieve a list of the most popular trending audios
 *     tags: [Trending Audios]
 *     responses:
 *       200:
 *         description: A list of top trending audios
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/TrendingAudio'
 *       500:
 *         description: Server error
 */
router.get('/top', trendingAudioController.getTopTrendingAudios);

/**
 * @swagger
 * /api/trending-audios/recent:
 *   get:
 *     summary: Get recent trending audios
 *     description: Retrieve a list of recent trending audios
 *     tags: [Trending Audios]
 *     responses:
 *       200:
 *         description: A list of recent trending audios
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/TrendingAudio'
 *       500:
 *         description: Server error
 */
router.get('/recent', trendingAudioController.getRecentTrendingAudios);

/**
 * @swagger
 * /api/trending-audios/{name}:
 *   get:
 *     summary: Get trending audio by name
 *     description: Retrieve a specific trending audio by its name
 *     tags: [Trending Audios]
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the trending audio
 *     responses:
 *       200:
 *         description: The trending audio
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TrendingAudio'
 *       404:
 *         description: Trending audio not found
 *       500:
 *         description: Server error
 */
router.get('/:name', trendingAudioController.getTrendingAudioByName);

module.exports = router; 