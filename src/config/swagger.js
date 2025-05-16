const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Instagram Scraper & AI Analysis API',
      version: '1.1.0',
      description: `
# Instagram Scraper & AI Analysis API Documentation

This API allows you to scrape Instagram reels, extract trending audio information, and analyze it with Google's Gemini AI.

## Features

- Browser management (initialization, login, status checking)
- Instagram reels scraping
- Trending audio tracking and analysis
- AI-powered audio trend analysis with Google Gemini
- Instagram post metrics and Reels performance analysis
- Slack integration for data insights

## Authentication

Most endpoints require you to first initialize a browser and login to Instagram
using valid credentials before they can be used.

## WebSocket Integration

This API uses WebSockets to provide real-time updates during the scraping process.
Connect to the WebSocket server to receive progress updates.

## Gemini AI Integration

The API includes integration with Google's Gemini AI for analyzing trending audio data and Instagram Reels performance.
Use the /api/gemini and /api/instagram endpoints to access AI-generated insights.
      `,
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      }
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}`,
        description: 'Development server'
      }
    ],
    tags: [
      {
        name: 'Browser',
        description: 'Browser management endpoints'
      },
      {
        name: 'Scraping',
        description: 'Endpoints for scraping Instagram content'
      },
      {
        name: 'Trending Audios',
        description: 'Endpoints for retrieving trending audio data'
      },
      {
        name: 'Instagram',
        description: 'Endpoints for Instagram Graph API integration and Reels performance analysis'
      },
      {
        name: 'AI Analysis',
        description: 'Endpoints for AI-powered analysis of trending audio using Google Gemini'
      },
      {
        name: 'System',
        description: 'System status and information'
      },
      {
        name: 'Slack',
        description: 'Slack integration endpoints'
      }
    ]
  },
  apis: ['./src/routes/*.js', './src/app.js'] // Path to the API routes files
};

const specs = swaggerJsdoc(options);

const uiOptions = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Instagram Scraper & AI Analysis API',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    defaultModelsExpandDepth: 3,
    defaultModelExpandDepth: 3,
    docExpansion: 'list'
  }
};

module.exports = {
  serve: swaggerUi.serve,
  setup: swaggerUi.setup(specs, uiOptions)
};