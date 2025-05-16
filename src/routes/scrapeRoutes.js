const express = require('express');
const router = express.Router();
const scrapeController = require('../controllers/scrapeController');

// Middleware to inject Socket.io instance
const withIO = (io) => (req, res, next) => {
  res.locals.io = io;
  next();
};

// This route will be initialized with io in server.js
const initRoutes = (io) => {
  /**
   * @swagger
   * /api/scrape/reels:
   *   post:
   *     summary: Scrape Instagram reels
   *     description: Scrape Instagram reels and store trending audios
   *     tags: [Scraping]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               scrollCount:
   *                 type: integer
   *                 description: Number of times to scroll in the feed
   *                 default: 3
   *                 minimum: 1
   *                 maximum: 20
   *     responses:
   *       200:
   *         description: Scraping process started
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
   *                   example: Scraping process started
   *       400:
   *         description: Bad request
   *       401:
   *         description: Not logged in
   *       500:
   *         description: Server error
   */
  router.post('/reels', withIO(io), (req, res) => {
    scrapeController.scrapeReels(req, res, io);
  });

  return router;
};

module.exports = { initRoutes }; 