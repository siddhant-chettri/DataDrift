const express = require('express');
const router = express.Router();
const browserController = require('../controllers/browserController');

/**
 * @swagger
 * /api/browser/status:
 *   get:
 *     summary: Get browser status
 *     description: Returns the current status of the browser instance
 *     tags: [Browser]
 *     responses:
 *       200:
 *         description: Browser status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 isActive:
 *                   type: boolean
 *                   example: false
 *                 isLoggedIn:
 *                   type: boolean
 *                   example: false
 *       500:
 *         description: Server error
 */
router.get('/status', browserController.getStatus);

/**
 * @swagger
 * /api/browser/init:
 *   post:
 *     summary: Initialize browser
 *     description: Initialize a new browser instance for scraping
 *     tags: [Browser]
 *     responses:
 *       200:
 *         description: Browser initialized successfully
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
 *                   example: Browser initialized successfully
 *       500:
 *         description: Server error
 */
router.post('/init', browserController.initializeBrowser);

/**
 * @swagger
 * /api/browser/login:
 *   post:
 *     summary: Login to Instagram
 *     description: Login to Instagram with provided credentials
 *     tags: [Browser]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: Instagram username
 *               password:
 *                 type: string
 *                 description: Instagram password
 *     responses:
 *       200:
 *         description: Login successful
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
 *                   example: Logged in successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Login failed
 *       500:
 *         description: Server error
 */
router.post('/login', browserController.login);

/**
 * @swagger
 * /api/browser/close:
 *   post:
 *     summary: Close browser
 *     description: Close the browser instance
 *     tags: [Browser]
 *     responses:
 *       200:
 *         description: Browser closed successfully
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
 *                   example: Browser closed successfully
 *       500:
 *         description: Server error
 */
router.post('/close', browserController.closeBrowser);

module.exports = router; 