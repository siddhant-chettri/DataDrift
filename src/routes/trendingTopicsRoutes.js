const express = require('express');
const { 
  fetchTrendingTopicsHandler, 
  getTrendingTopicsHandler,
  convertTrendingTopicsToHashtags
} = require('../controllers/trendingTopicsController');

const router = express.Router();

/**
 * @swagger
 * /api/trending-topics:
 *   post:
 *     summary: Get trending topics with filters
 *     description: Retrieve trending topics with optional filters for region and date range
 *     tags: [Trending Topics]
 *     parameters:
 *       - in: query
 *         name: region
 *         schema:
 *           type: string
 *         description: Region geo code (e.g., 'US', 'IN', 'IN-HR', 'IN-UP')
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering (ISO format)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering (ISO format)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Maximum number of results to return
 *     responses:
 *       200:
 *         description: List of trending topics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       500:
 *         description: Server error
 */
router.post('/', getTrendingTopicsHandler);

/**
 * @swagger
 * /api/trending-topics/fetch:
 *   post:
 *     summary: Fetch and store trending topics
 *     description: >
 *       Fetch trending topics from SerpAPI for one or multiple regions and store them in the database.
 *       If no regions are specified, the API will use the default Indian regions:
 *       Haryana (IN-HR), Bihar (IN-BR), Uttar Pradesh (IN-UP), and Rajasthan (IN-RJ).
 *     tags: [Trending Topics]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Human-readable region name (for single region)
 *                 example: India
 *               geo:
 *                 type: string
 *                 description: Region geo code (for single region)
 *                 example: IN
 *               regions:
 *                 type: array
 *                 description: Array of regions to fetch trends for (if provided, overrides name and geo)
 *                 items:
 *                   type: object
 *                   required:
 *                     - name
 *                     - geo
 *                   properties:
 *                     name:
 *                       type: string
 *                       description: Human-readable region name
 *                       example: Haryana
 *                     geo:
 *                       type: string
 *                       description: Region geo code
 *                       example: IN-HR
 *           examples:
 *             defaultRegions:
 *               summary: Default Regions
 *               value: {}
 *               description: If no body is provided, default Indian regions will be used (Haryana, Bihar, UP, Rajasthan)
 *             singleRegion:
 *               summary: Single Region
 *               value:
 *                 name: India
 *                 geo: IN
 *             multipleRegions:
 *               summary: Multiple Regions
 *               value:
 *                 regions:
 *                   - name: Haryana
 *                     geo: IN-HR
 *                   - name: Bihar
 *                     geo: IN-BR
 *                   - name: Delhi
 *                     geo: IN-DL
 *     responses:
 *       200:
 *         description: Topics successfully fetched and stored
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       region:
 *                         type: string
 *                       geo:
 *                         type: string
 *                       count:
 *                         type: integer
 *                       topics:
 *                         type: array
 *                         items:
 *                           type: object
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       region:
 *                         type: string
 *                       geo:
 *                         type: string
 *                       error:
 *                         type: string
 *       400:
 *         description: Invalid input parameters
 *       500:
 *         description: Server error
 */
router.post('/fetch', fetchTrendingTopicsHandler);

/**
 * @swagger
 * /api/trending-topics/hashtags:
 *   post:
 *     summary: Convert trending topics to hashtags
 *     description: Processes trending topics and converts them to optimized hashtags using AI
 *     tags: [Trending Topics]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum number of topics to convert
 *       - in: query
 *         name: region
 *         schema:
 *           type: string
 *         description: >
 *           Region geo code for filtering topics. Use ISO country codes or regional codes.
 *           Examples:
 *           - IN (India)
 *           - US (United States)
 *           - IN-HR (Haryana, India)
 *           - IN-UP (Uttar Pradesh, India)
 *           - IN-RJ (Rajasthan, India)
 *           - IN-BR (Bihar, India)
 *       - in: query
 *         name: tone
 *         schema:
 *           type: string
 *           default: "engaging"
 *         description: Desired tone for the hashtags (e.g., engaging, professional, casual)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               response_url:
 *                 type: string
 *                 description: Slack response URL for asynchronous responses
 *             required:
 *               - response_url
 *     responses:
 *       200:
 *         description: Immediate acknowledgment with asynchronous processing
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 response_type:
 *                   type: string
 *                 text:
 *                   type: string
 *       500:
 *         description: Server error
 */
router.post('/hashtags', convertTrendingTopicsToHashtags);

module.exports = router; 