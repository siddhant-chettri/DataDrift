const express = require('express');
const router = express.Router();
const {
  getInstagramPostsHandler,
  analyzeReelsPerformanceHandler,
  analyzeReelsPerformanceForSlack,
  getPageDetailsHandler,
  fetchPostsAndSaveHandler,
  fetchPostsForRegionHandler,
  checkAccessTokenHandler
} = require('../controllers/instagramController');

/**
 * @swagger
 * /api/instagram/token-status:
 *   get:
 *     summary: Check if the Instagram access token is valid
 *     description: Verifies the validity of the Instagram access token stored in environment variables
 *     tags: [Instagram]
 *     responses:
 *       200:
 *         description: Access token is valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Instagram access token is valid"
 *       401:
 *         description: Access token is invalid or expired
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Instagram access token is invalid or expired. Please refresh your token."
 *       500:
 *         description: Server error
 */
router.get('/token-status', checkAccessTokenHandler);

/**
 * @swagger
 * /api/instagram/posts:
 *   get:
 *     summary: Get Instagram posts with filters
 *     description: Retrieve Instagram posts from the database with various filters
 *     tags: [Instagram]
 *     parameters:
 *       - in: query
 *         name: mediaType
 *         schema:
 *           type: string
 *           enum: [REEL, CAROUSEL_ALBUM, IMAGE, VIDEO]
 *         description: Filter by media type
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter posts published on or after this date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter posts published on or before this date (YYYY-MM-DD)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Maximum number of posts to return
 *     responses:
 *       200:
 *         description: List of Instagram posts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 10
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/InstagramPost'
 *       500:
 *         description: Server error
 */
router.get('/posts', getInstagramPostsHandler);

/**
 * @swagger
 * /api/instagram/reels/analyze:
 *   get:
 *     summary: Analyze Instagram Reels performance
 *     description: Uses Gemini AI to analyze the performance of Instagram Reels
 *     tags: [Instagram, AI Analysis]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter reels published on or after this date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter reels published on or before this date (YYYY-MM-DD)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 20
 *           default: 10
 *         description: Maximum number of reels to analyze
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *         description: Description of the timeframe (e.g., "last month")
 *     responses:
 *       200:
 *         description: Analysis of Instagram Reels performance
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 reelsCount:
 *                   type: integer
 *                   example: 10
 *                 timeframe:
 *                   type: string
 *                   example: "last month"
 *                 analysis:
 *                   type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                     analysis:
 *                       type: string
 *                     topPerformers:
 *                       type: array
 *                       items:
 *                         type: string
 *                     bottomPerformers:
 *                       type: array
 *                       items:
 *                         type: string
 *                     modelUsed:
 *                       type: string
 *       404:
 *         description: No reels found for the specified period
 *       500:
 *         description: Server error
 */
router.get('/reels/analyze', analyzeReelsPerformanceHandler);

/**
 * @swagger
 * /api/instagram/slack/reels-performance/{region}/{limit}:
 *   post:
 *     summary: Analyze Instagram Reels performance for Slack
 *     description: Analyzes Instagram Reels performance and sends the results to Slack using response_url
 *     tags: [Instagram, Slack]
 *     parameters:
 *       - in: path
 *         name: region
 *         schema:
 *           type: string
 *         required: false
 *         description: Region to filter reels by (e.g., 'bhojpuri', 'haryanvi', 'rajasthani')
 *       - in: path
 *         name: limit
 *         schema:
 *           type: integer
 *         required: false
 *         description: Maximum number of reels to analyze (default is 20)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - response_url
 *             properties:
 *               response_url:
 *                 type: string
 *                 description: Slack webhook response URL for sending asynchronous response
 *     responses:
 *       200:
 *         description: Initial acknowledgment of the request (full response will be sent to Slack)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 response_type:
 *                   type: string
 *                   example: "ephemeral"
 *                 text:
 *                   type: string
 *                   example: "Analyzing Instagram Reels performance. Results will be posted shortly..."
 *       400:
 *         description: Bad request (missing response_url)
 *       500:
 *         description: Server error
 */
router.post('/slack/reels-performance/:region?/:limit?', analyzeReelsPerformanceForSlack);

/**
 * @swagger
 * /api/instagram/pages:
 *   get:
 *     summary: Get Facebook page details
 *     description: Retrieve Facebook page details using the provided access token
 *     tags: [Instagram, Facebook]
 *     parameters:
 *       - in: query
 *         name: access_token
 *         required: true
 *         description: Facebook Graph API access token
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully retrieved Facebook page details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 3
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       access_token:
 *                         type: string
 *                       category:
 *                         type: string
 *                       name:
 *                         type: string
 *                       id:
 *                         type: string
 *                       tasks:
 *                         type: array
 *                         items:
 *                           type: string
 *       400:
 *         description: Bad request (missing access token)
 *       500:
 *         description: Server error
 */
router.get('/pages', getPageDetailsHandler);

/**
 * @swagger
 * /api/instagram/posts-and-save:
 *   post:
 *     summary: Fetch and store Instagram posts for all regions
 *     description: Retrieves posts from Instagram Graph API for all configured regions and stores them in the database
 *     tags: [Instagram]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               limit:
 *                 type: number
 *                 description: Number of posts to fetch per region
 *                 default: 25
 *     responses:
 *       200:
 *         description: Successfully fetched and stored Instagram posts for all regions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Fetched and stored 75 Instagram posts across all regions"
 *                 regions:
 *                   type: object
 *                 totalCount:
 *                   type: number
 *                   example: 75
 *       400:
 *         description: Bad request (access token not in env variables)
 *       500:
 *         description: Server error
 */
router.post('/posts-and-save', fetchPostsAndSaveHandler);

/**
 * @swagger
 * /api/instagram/region/{region}/posts:
 *   get:
 *     summary: Fetch posts for a specific region
 *     description: Retrieves posts from Instagram Graph API for a specific region without storing them
 *     tags: [Instagram]
 *     parameters:
 *       - in: path
 *         name: region
 *         required: true
 *         description: Region name (e.g., 'bhojpuri', 'haryanvi', 'rajasthani')
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully fetched Instagram posts for the region
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Fetched 25 Instagram posts for region: bhojpuri"
 *                 count:
 *                   type: number
 *                   example: 25
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       mediaType:
 *                         type: string
 *                       caption:
 *                         type: string
 *                       permalink:
 *                         type: string
 *                       mediaUrl:
 *                         type: string
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                       likeCount:
 *                         type: number
 *                       commentsCount:
 *                         type: number
 *       400:
 *         description: Bad request (missing region or access token not in env variables)
 *       500:
 *         description: Server error
 */
router.get('/region/:region/posts', fetchPostsForRegionHandler);

/**
 * @swagger
 * components:
 *   schemas:
 *     InstagramPost:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Post MongoDB ID
 *         postId:
 *           type: string
 *           description: Instagram post ID
 *         mediaType:
 *           type: string
 *           enum: [REEL, CAROUSEL_ALBUM, IMAGE, VIDEO]
 *           description: Type of Instagram media
 *         caption:
 *           type: string
 *           description: Post caption
 *         permalink:
 *           type: string
 *           description: URL to the post
 *         mediaUrl:
 *           type: string
 *           description: URL to the media
 *         thumbnailUrl:
 *           type: string
 *           description: URL to the thumbnail
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: When the post was published
 *         likeCount:
 *           type: number
 *           description: Number of likes
 *         commentsCount:
 *           type: number
 *           description: Number of comments
 *         reachCount:
 *           type: number
 *           description: Number of unique accounts that saw the post
 *         impressionCount:
 *           type: number
 *           description: Total number of times the post was viewed
 *         savedCount:
 *           type: number
 *           description: Number of times the post was saved
 *         playsCount:
 *           type: number
 *           description: Number of times the video was played (only for reels/videos)
 *         engagementRate:
 *           type: number
 *           description: Engagement rate as a percentage
 *         hashtags:
 *           type: array
 *           items:
 *             type: string
 *           description: Hashtags used in the post
 *         mentions:
 *           type: array
 *           items:
 *             type: string
 *           description: Mentions used in the post
 */
module.exports = router; 