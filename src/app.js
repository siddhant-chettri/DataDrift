require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const { connectDB } = require('./config/database');
const browserRoutes = require('./routes/browserRoutes');
const trendingAudioRoutes = require('./routes/trendingAudioRoutes');
const geminiRoutes = require('./routes/geminiRoutes');
const { initRoutes: initScrapeRoutes } = require('./routes/scrapeRoutes');
const swaggerConfig = require('./config/swagger');
const { startSlackBot, stopSlackBot } = require('./slack');
const axios = require('axios');

// Initialize Express
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('Client connected');
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// API Routes
app.use('/api/browser', browserRoutes);
app.use('/api/trending-audios', trendingAudioRoutes);
app.use('/api/gemini', geminiRoutes);
app.use('/api/scrape', initScrapeRoutes(io));

// Swagger documentation
app.use('/', swaggerConfig.serve, swaggerConfig.setup);

// Status endpoint
/**
 * @swagger
 * /api/status:
 *   get:
 *     summary: Get server status
 *     description: Returns the current status of the server
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Server status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 uptime:
 *                   type: number
 *                   description: Server uptime in seconds
 *                   example: 3600
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2023-01-01T00:00:00.000Z"
 */
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Slack bot controls
/**
 * @swagger
 * /api/slack/start:
 *   post:
 *     summary: Start the Slack bot
 *     description: Starts the Slack bot integration
 *     tags: [Slack]
 *     responses:
 *       200:
 *         description: Slack bot status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */
app.post('/api/slack/start', async (req, res) => {
  try {
    const success = await startSlackBot();
    if (success) {
      res.json({ success: true, message: 'Slack bot started successfully' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to start Slack bot' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/slack/stop:
 *   post:
 *     summary: Stop the Slack bot
 *     description: Stops the Slack bot integration
 *     tags: [Slack]
 *     responses:
 *       200:
 *         description: Slack bot status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */
app.post('/api/slack/stop', async (req, res) => {
  try {
    const success = await stopSlackBot();
    if (success) {
      res.json({ success: true, message: 'Slack bot stopped successfully' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to stop Slack bot' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Root route
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: 'public' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'production' ? null : err.message
  });
});

// Start server
const PORT = process.env.PORT || 3000;
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Start listening
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`API Documentation available at http://localhost:${PORT}`);
      
      // Auto-start Slack bot if environment variables are set
      if (process.env.SLACK_BOT_TOKEN && process.env.SLACK_SIGNING_SECRET) {
        startSlackBot().then(success => {
          if (success) {
            console.log('Slack bot auto-started successfully');
          } else {
            console.warn('Failed to auto-start Slack bot');
          }
        });
      } else {
        console.log('Slack bot not configured. Set SLACK_BOT_TOKEN and SLACK_SIGNING_SECRET to enable.');
      }
    });
    
    // Handle server shutdown
    process.on('SIGINT', async () => {
      console.log('Shutting down gracefully...');
      await stopSlackBot();
      process.exit();
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

module.exports = { app, server, startServer }; 