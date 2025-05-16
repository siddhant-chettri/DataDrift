require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const puppeteer = require('puppeteer');
const { MongoClient } = require('mongodb');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// MongoDB connection URI
const mongoURI = 'mongodb+srv://siddhantchtriofficial:AEhXqcgYu7-CZ64@cluster0.aenzcev.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
let db;

// Connect to MongoDB
async function connectToMongoDB() {
  try {
    const client = new MongoClient(mongoURI);
    await client.connect();
    console.log('Connected to MongoDB');
    
    db = client.db('instagramData');
    
    // Create collections if they don't exist
    await db.createCollection('trendingAudios');
    console.log('Database and collections initialized');
    
    return client;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Store the browser and page instances
let browser;
let page;
let isLoggedIn = false;

// Initialize puppeteer
async function initPuppeteer() {
  try {
    // Launch browser with visible UI
    browser = await puppeteer.launch({
      headless: false,
      args: ['--start-maximized', '--disable-features=site-per-process', '--disable-web-security'],
      defaultViewport: null
    });
    
    page = await browser.newPage();
    
    // Set up request interception
    await page.setRequestInterception(true);
    
    // Handle request interception - optimize by blocking unnecessary resources
    page.on('request', request => {
      const resourceType = request.resourceType();
      // Block unnecessary resources to speed up loading
      if (['image', 'media', 'font', 'stylesheet'].includes(resourceType)) {
        request.abort();
      } else {
        request.continue();
      }
    });
    
    // Set user agent to avoid detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36');
    
    console.log('Browser initialized successfully');
    return { success: true, message: 'Browser initialized successfully' };
    
  } catch (error) {
    console.error('Error initializing puppeteer:', error);
    if (browser) await browser.close();
    browser = null;
    page = null;
    isLoggedIn = false;
    return { success: false, message: error.message };
  }
}

// Login to Instagram with credentials provided via endpoint
async function loginToInstagram(username, password) {
  if (!browser || !page) {
    return { success: false, message: 'Browser not initialized' };
  }
  
  try {
    console.log('Navigating to Instagram...');
    
    // Use a longer timeout for initial navigation
    await page.goto('https://www.instagram.com/accounts/login/', { 
      waitUntil: 'domcontentloaded', 
      timeout: 60000 
    });
    
    // Wait for cookie dialog and accept if present
    try {
      const acceptCookieButton = await page.waitForSelector('[role="dialog"] button:nth-child(2)', { timeout: 5000 });
      if (acceptCookieButton) {
        await acceptCookieButton.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.log('No cookie dialog found or already accepted');
    }
    
    console.log('Logging in...');
    
    // More reliable way to wait for login fields
    await page.waitForFunction(() => {
      return document.querySelector('input[name="username"]') !== null && 
             document.querySelector('input[name="password"]') !== null;
    }, { timeout: 10000 }).catch(err => {
      console.log('Could not find username/password fields using standard selector');
    });
    
    // Try alternative selectors if the standard ones fail
    const usernameInput = await page.$('input[name="username"]') || 
                          await page.$('input[aria-label="Phone number, username, or email"]') ||
                          await page.$('input[type="text"]');
                          
    const passwordInput = await page.$('input[name="password"]') || 
                          await page.$('input[aria-label="Password"]') ||
                          await page.$('input[type="password"]');
    
    if (!usernameInput || !passwordInput) {
      throw new Error('Could not find login fields');
    }
    
    // Clear fields first
    await usernameInput.click({ clickCount: 3 });
    await usernameInput.type(username);
    
    await passwordInput.click({ clickCount: 3 });
    await passwordInput.type(password);
    
    // Find login button more reliably
    const loginButton = await page.$('button[type="submit"]') ||
                       await page.$('button:has-text("Log in")') ||
                       await page.$('button[role="button"]');
                       
    if (!loginButton) {
      throw new Error('Could not find login button');
    }
    
    await loginButton.click();
    
    // Wait for login to complete - using a more reliable approach
    console.log('Waiting for login to complete...');
    
    // Use a longer timeout and a combination of strategies
    const loginSuccessful = await Promise.race([
      // Strategy 1: Wait for navigation to complete
      page.waitForNavigation({ timeout: 45000 }).then(() => true).catch(() => false),
      
      // Strategy 2: Check for home icon to appear
      page.waitForSelector('svg[aria-label="Home"]', { timeout: 45000 })
        .then(() => true)
        .catch(() => false),
        
      // Strategy 3: Check for feed elements
      page.waitForSelector('[role="feed"]', { timeout: 45000 })
        .then(() => true)
        .catch(() => false),
        
      // Strategy 4: Check for profile icon/avatar
      page.waitForSelector('img[data-testid="user-avatar"]', { timeout: 45000 })
        .then(() => true)
        .catch(() => false)
    ]);
    
    if (loginSuccessful) {
      console.log('Successfully logged in to Instagram');
      isLoggedIn = true;
      
      // Dismiss notifications dialog if it appears
      try {
        const notNowButton = await page.waitForSelector('button:nth-child(2)', { timeout: 5000 });
        if (notNowButton) {
          await notNowButton.click();
        }
      } catch (error) {
        console.log('No notifications dialog found');
      }
      
      return { success: true, message: 'Logged in successfully' };
    } else {
      throw new Error('Login attempt timed out or failed');
    }
    
  } catch (error) {
    console.error('Error logging in to Instagram:', error);
    isLoggedIn = false;
    return { success: false, message: error.message };
  }
}

// Helper function to store trending audios in MongoDB
async function storeTrendingAudios(trendingAudios) {
  if (!db) {
    console.error('Database not connected');
    return { success: false, message: 'Database not connected' };
  }
  
  try {
    const collection = db.collection('trendingAudios');
    
    // Prepare documents to insert
    const audiosToInsert = trendingAudios.map(audio => ({
      name: audio,
      timestamp: new Date(),
      source: 'instagram'
    }));
    
    // Check for existing entries to avoid duplicates
    const bulkOps = audiosToInsert.map(audio => {
      return {
        updateOne: {
          filter: { name: audio.name },
          update: { $set: audio },
          upsert: true
        }
      };
    });
    
    if (bulkOps.length > 0) {
      const result = await collection.bulkWrite(bulkOps);
      console.log(`Stored ${result.upsertedCount} new trending audios, updated ${result.modifiedCount} existing entries`);
      return { 
        success: true, 
        message: `Stored ${result.upsertedCount} new trending audios, updated ${result.modifiedCount} existing entries` 
      };
    } else {
      return { success: true, message: 'No trending audios to store' };
    }
  } catch (error) {
    console.error('Error storing trending audios:', error);
    return { success: false, message: error.message };
  }
}

// Route to check status
app.get('/api/status', (req, res) => {
  res.json({
    isLoggedIn,
    browserActive: !!browser
  });
});

// Route to initialize browser
app.post('/api/init', async (req, res) => {
  if (browser) {
    res.json({ message: 'Browser already initialized', isLoggedIn });
    return;
  }
  
  const result = await initPuppeteer();
  res.json(result);
});

// Route for login with provided credentials
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    res.status(400).json({ success: false, message: 'Username and password are required' });
    return;
  }
  
  if (!browser || !page) {
    const initResult = await initPuppeteer();
    if (!initResult.success) {
      res.status(500).json(initResult);
      return;
    }
  }
  
  const result = await loginToInstagram(username, password);
  res.json(result);
});

// Route to scrape Instagram reels
app.post('/api/scrape/reels', async (req, res) => {
  if (!browser || !page || !isLoggedIn) {
    res.status(400).json({ success: false, message: 'Not logged in to Instagram' });
    return;
  }
  
  try {
    // Notify clients that scraping has started
    io.emit('scrapeStatus', { status: 'started', message: 'Starting to scrape reels' });
    
    // Navigate to Instagram reels
    console.log('Navigating to Instagram reels...');
    
    // Try to navigate to reels multiple ways if needed
    try {
      await page.goto('https://www.instagram.com/reels/', { 
        waitUntil: 'domcontentloaded',
        timeout: 45000 
      });
    } catch (error) {
      console.log('Initial navigation to reels failed, trying alternative approach');
      
      // Try to navigate to home first
      await page.goto('https://www.instagram.com/', { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      
      // Then try to find and click on a reels link/button
      const reelsLink = await page.$('a[href="/reels/"]') || 
                        await page.$('a[href*="reels"]');
      
      if (reelsLink) {
        await reelsLink.click();
        // Use setTimeout instead of waitForTimeout
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        console.log('Could not find reels link, proceeding with current page');
      }
    }
    
    io.emit('scrapeStatus', { status: 'navigating', message: 'Navigated to reels section' });
    
    // Don't rely on article selector which might not be present
    // Instead, wait a bit for the page to load using setTimeout
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Scroll down to load more reels
    const scrollCount = req.body.scrollCount || 3;
    for (let i = 0; i < scrollCount; i++) {
      await page.evaluate(() => {
        window.scrollBy(0, window.innerHeight);
      });
      
      // Wait longer between scrolls to ensure data loads using setTimeout
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      io.emit('scrapeStatus', { 
        status: 'scrolling', 
        message: `Scrolling to load more reels (${i+1}/${scrollCount})` 
      });
      
      // Try to click "See more" buttons if they exist
      try {
        const seeMoreButtons = await page.$$('button:has-text("See more")');
        for (const button of seeMoreButtons) {
          await button.click().catch(() => {});
        }
      } catch (error) {
        // Ignore errors
      }
    }
    
    // Wait longer for any pending content to load
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Use DOM scraping to extract reels data
    const reelsData = await page.evaluate(() => {
      const reels = [];
      const trendingAudios = new Set();
      
      // Try multiple selector strategies to find reels
      const selectorOptions = [
        '.x78zum5.xedcshv', // Current specific class approach
        'article',  // General article elements
        'div[role="presentation"] div[role="button"]', // Role-based approach
        'div[style*="flex-direction"] > div > div' // Style-based approach
      ];
      
      let reelElements = [];
      
      // Try each selector until we find elements
      for (const selector of selectorOptions) {
        reelElements = document.querySelectorAll(selector);
        if (reelElements && reelElements.length > 0) {
          console.log(`Found ${reelElements.length} reel elements using selector: ${selector}`);
          break;
        }
      }
      
      // If we still have no elements, try a more aggressive approach
      if (!reelElements || reelElements.length === 0) {
        // Look for any div that might be a container for video content
        const possibleContainers = document.querySelectorAll('div:not([class]):not([id])');
        reelElements = Array.from(possibleContainers).filter(el => {
          return el.querySelector('video') || 
                el.querySelector('img[srcset]') || 
                el.querySelector('a[href*="/reel/"]');
        });
      }
      
      console.log(`Found ${reelElements.length} potential reel elements`);
      
      // Process found elements
      Array.from(reelElements).forEach((reelElement, index) => {
        try {
          // Multiple strategies for username extraction
          let username = 'Unknown';
          
          // Strategy 1: Try the specific class selector
          const usernameElement1 = reelElement.querySelector('.x1lliihq.x1plvlek.xryxfnj.x1n2onr6.x1ji0vk5.x18bv5gf.x193iq5w.xeuugli.x1fj9vlw.x13faqbe.x1vvkbs.x1s928wv.xhkezso.x1gmr53x.x1cpjm7i.x1fgarty.x1943h6x.x1i0vuye.xvs91rp.x1s688f.x9bdzbf.x1tu3fi.x3x7a5m.x10wh9bi.x1wdrske.x8viiok.x18hxmgj');
          
          // Strategy 2: Try to find username by role and attribute patterns
          const usernameElement2 = reelElement.querySelector('a[role="link"] > div > div > div > span');
          
          // Strategy 3: Try the header section which typically contains username
          const usernameElement3 = reelElement.querySelector('header span');
          
          // Use the first successful strategy
          if (usernameElement1 && usernameElement1.textContent) {
            username = usernameElement1.textContent;
          } else if (usernameElement2 && usernameElement2.textContent) {
            username = usernameElement2.textContent;
          } else if (usernameElement3 && usernameElement3.textContent) {
            username = usernameElement3.textContent;
          }
          
          // Getting likes count with multiple strategies
          let likeCount = 'Unknown';
          const likeCountElement1 = reelElement.querySelector('section span');
          const likeCountElement2 = reelElement.querySelector('div[role="button"] > div > span');
          
          if (likeCountElement1 && likeCountElement1.textContent) {
            likeCount = likeCountElement1.textContent;
          } else if (likeCountElement2 && likeCountElement2.textContent) {
            likeCount = likeCountElement2.textContent;
          }
          
          // Getting caption with multiple strategies
          let caption = 'No caption';
          const captionElement1 = reelElement.querySelector('ul li span');
          const captionElement2 = reelElement.querySelector('div[role="button"] > span');
          
          if (captionElement1 && captionElement1.textContent) {
            caption = captionElement1.textContent;
          } else if (captionElement2 && captionElement2.textContent) {
            caption = captionElement2.textContent;
          }
          
          // Get video source if available
          const videoElement = reelElement.querySelector('video');
          const videoSrc = videoElement ? videoElement.src : null;
          
          // Get post URL with multiple strategies
          let postUrl = null;
          const postLinkElement1 = reelElement.querySelector('a[role="link"][tabindex="0"]');
          const postLinkElement2 = reelElement.querySelector('a[href*="/reel/"]');
          
          if (postLinkElement1 && postLinkElement1.href) {
            postUrl = postLinkElement1.href;
          } else if (postLinkElement2 && postLinkElement2.href) {
            postUrl = postLinkElement2.href;
          }
          
          // Extract timestamp from post URL or use current time
          let timestamp = new Date().toISOString();
          if (postUrl) {
            const matches = postUrl.match(/\/p\/([^\/]+)\/|\/reel\/([^\/]+)\//);
            if (matches && (matches[1] || matches[2])) {
              const shortcode = matches[1] || matches[2];
              // Could decode Instagram's shortcode to get the actual timestamp
              // But for now, we'll just include the shortcode
              timestamp = shortcode;
            }
          }
          
          // Check for trending audio using the specified SVG path
          // First approach: Find the SVG with the specific path
          let hasTrendingAudio = false;
          let audioName = null;
          let audioAuthor = null;
          
          // Check for SVG with the specific path that indicates audio link
          const svgElements = reelElement.querySelectorAll('svg');
          for (const svg of svgElements) {
            const pathElement = svg.querySelector('path[d="M18.5 4h-9a1.5 1.5 0 0 0 0 3h5.379L4.293 17.586a1.5 1.5 0 1 0 2.121 2.121L17 9.121V14.5a1.5 1.5 0 0 0 3 0v-9A1.5 1.5 0 0 0 18.5 4Z"]');
            if (pathElement) {
              hasTrendingAudio = true;
              
              // Once we found the trending audio icon, look for the audio name using the specified class
              const audioElement = reelElement.querySelector('.x1lliihq.x193iq5w.x6ikm8r.x10wlt62.xlyipyv.xuxw1ft');
              if (audioElement) {
                audioName = audioElement.textContent;
                trendingAudios.add(audioName);
              }
              
              // Try to find the audio author as well - typically near the audio name
              if (audioElement) {
                // Look for siblings or nearby elements that might contain the author name
                const possibleAuthorElement = audioElement.nextElementSibling || 
                                              audioElement.closest('div')?.querySelector('span:not(.x1lliihq.x193iq5w.x6ikm8r.x10wlt62.xlyipyv.xuxw1ft)');
                if (possibleAuthorElement) {
                  audioAuthor = possibleAuthorElement.textContent;
                }
              }
              
              break;
            }
          }
          
          reels.push({
            id: index,
            username,
            likeCount,
            caption,
            videoSrc,
            postUrl,
            timestamp,
            shortcode: postUrl ? postUrl.split('/').filter(Boolean).pop() : null,
            hasTrendingAudio,
            audioName,
            audioAuthor
          });
        } catch (error) {
          console.error('Error extracting reel data:', error);
        }
      });
      
      console.log('DOM Scraping Results:');
      console.log(`Total reels found: ${reels.length}`);
      
      // Convert trending audios Set to Array for the response
      const trendingAudiosArray = Array.from(trendingAudios);
      console.log(`Found ${trendingAudiosArray.length} trending audios`);
      
      if (reels.length > 0) {
        console.log('Sample reel data:');
        console.log(JSON.stringify(reels[0], null, 2));
      }
      
      return {
        reels,
        trendingAudios: trendingAudiosArray
      };
    });
    
    // Store trending audios in MongoDB if any were found
    if (reelsData.trendingAudios && reelsData.trendingAudios.length > 0) {
      const storageResult = await storeTrendingAudios(reelsData.trendingAudios);
      console.log('MongoDB storage result:', storageResult);
    }
    
    io.emit('scrapeStatus', { 
      status: 'completed', 
      message: `Scraping completed. Found ${reelsData.reels.length} reels and ${reelsData.trendingAudios.length} trending audios.`,
      data: reelsData.reels,
      trendingAudios: reelsData.trendingAudios
    });
    
    console.log('Final Response (DOM Scraping Method):');
    console.log(`Total reels in response: ${reelsData.reels.length}`);
    console.log(`Total trending audios found: ${reelsData.trendingAudios.length}`);
    if (reelsData.trendingAudios.length > 0) {
      console.log('Trending audios:');
      console.log(JSON.stringify(reelsData.trendingAudios, null, 2));
    }
    
    res.json({ 
      success: true, 
      message: `Successfully scraped ${reelsData.reels.length} reels and found ${reelsData.trendingAudios.length} trending audios`, 
      data: reelsData.reels,
      trendingAudios: reelsData.trendingAudios
    });
    
  } catch (error) {
    console.error('Error scraping reels:', error);
    io.emit('scrapeStatus', { status: 'error', message: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

// Route to get all trending audios from MongoDB
app.get('/api/trending-audios', async (req, res) => {
  if (!db) {
    return res.status(500).json({ success: false, message: 'Database not connected' });
  }
  
  try {
    const collection = db.collection('trendingAudios');
    const trendingAudios = await collection.find({}).toArray();
    
    res.json({
      success: true,
      count: trendingAudios.length,
      data: trendingAudios
    });
  } catch (error) {
    console.error('Error retrieving trending audios:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Route to close browser
app.post('/api/close', async (req, res) => {
  if (browser) {
    await browser.close();
    browser = null;
    page = null;
    isLoggedIn = false;
    res.json({ success: true, message: 'Browser closed successfully' });
  } else {
    res.json({ success: false, message: 'No active browser session' });
  }
});

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('Client connected');
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Visit http://localhost:3000 to view the application');
  
  // Connect to MongoDB
  try {
    await connectToMongoDB();
  } catch (error) {
    console.error('Failed to connect to MongoDB on startup:', error);
  }
});

// Handle server shutdown
process.on('SIGINT', async () => {
  if (browser) {
    await browser.close();
  }
  process.exit();
}); 