const puppeteer = require('puppeteer');

class PuppeteerService {
  constructor() {
    this.browser = null;
    this.page = null;
    this.isLoggedIn = false;
  }

  async initializeBrowser() {
    try {
      if (this.browser) {
        return { success: true, message: 'Browser already initialized' };
      }

      // Launch browser with visible UI
      this.browser = await puppeteer.launch({
        headless: false,
        args: ['--start-maximized', '--disable-features=site-per-process', '--disable-web-security'],
        defaultViewport: null
      });
      
      this.page = await this.browser.newPage();
      
      // Set up request interception
      await this.page.setRequestInterception(true);
      
      // Handle request interception - optimize by blocking unnecessary resources
      this.page.on('request', request => {
        const resourceType = request.resourceType();
        // Block unnecessary resources to speed up loading
        if (['image', 'media', 'font', 'stylesheet'].includes(resourceType)) {
          request.abort();
        } else {
          request.continue();
        }
      });
      
      // Set user agent to avoid detection
      await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36');
      
      console.log('Browser initialized successfully');
      return { success: true, message: 'Browser initialized successfully' };
      
    } catch (error) {
      console.error('Error initializing puppeteer:', error);
      if (this.browser) await this.browser.close();
      this.browser = null;
      this.page = null;
      this.isLoggedIn = false;
      return { success: false, message: error.message };
    }
  }

  async login(username, password) {
    if (!this.browser || !this.page) {
      return { success: false, message: 'Browser not initialized' };
    }
    
    try {
      console.log('Navigating to Instagram...');
      
      // Use a longer timeout for initial navigation
      await this.page.goto('https://www.instagram.com/accounts/login/', { 
        waitUntil: 'domcontentloaded', 
        timeout: 60000 
      });
      
      // Wait for cookie dialog and accept if present
      try {
        const acceptCookieButton = await this.page.waitForSelector('[role="dialog"] button:nth-child(2)', { timeout: 5000 });
        if (acceptCookieButton) {
          await acceptCookieButton.click();
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.log('No cookie dialog found or already accepted');
      }
      
      console.log('Logging in...');
      
      // More reliable way to wait for login fields
      await this.page.waitForFunction(() => {
        return document.querySelector('input[name="username"]') !== null && 
               document.querySelector('input[name="password"]') !== null;
      }, { timeout: 10000 }).catch(err => {
        console.log('Could not find username/password fields using standard selector');
      });
      
      // Try alternative selectors if the standard ones fail
      const usernameInput = await this.page.$('input[name="username"]') || 
                            await this.page.$('input[aria-label="Phone number, username, or email"]') ||
                            await this.page.$('input[type="text"]');
                            
      const passwordInput = await this.page.$('input[name="password"]') || 
                            await this.page.$('input[aria-label="Password"]') ||
                            await this.page.$('input[type="password"]');
      
      if (!usernameInput || !passwordInput) {
        throw new Error('Could not find login fields');
      }
      
      // Clear fields first
      await usernameInput.click({ clickCount: 3 });
      await usernameInput.type(username);
      
      await passwordInput.click({ clickCount: 3 });
      await passwordInput.type(password);
      
      // Find login button more reliably
      const loginButton = await this.page.$('button[type="submit"]') ||
                         await this.page.$('button:has-text("Log in")') ||
                         await this.page.$('button[role="button"]');
                         
      if (!loginButton) {
        throw new Error('Could not find login button');
      }
      
      await loginButton.click();
      
      // Wait for login to complete - using a more reliable approach
      console.log('Waiting for login to complete...');
      
      // Use a longer timeout and a combination of strategies
      const loginSuccessful = await Promise.race([
        // Strategy 1: Wait for navigation to complete
        this.page.waitForNavigation({ timeout: 45000 }).then(() => true).catch(() => false),
        
        // Strategy 2: Check for home icon to appear
        this.page.waitForSelector('svg[aria-label="Home"]', { timeout: 45000 })
          .then(() => true)
          .catch(() => false),
          
        // Strategy 3: Check for feed elements
        this.page.waitForSelector('[role="feed"]', { timeout: 45000 })
          .then(() => true)
          .catch(() => false),
          
        // Strategy 4: Check for profile icon/avatar
        this.page.waitForSelector('img[data-testid="user-avatar"]', { timeout: 45000 })
          .then(() => true)
          .catch(() => false)
      ]);
      
      if (loginSuccessful) {
        console.log('Successfully logged in to Instagram');
        this.isLoggedIn = true;
        
        // Dismiss notifications dialog if it appears
        try {
          const notNowButton = await this.page.waitForSelector('button:nth-child(2)', { timeout: 5000 });
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
      this.isLoggedIn = false;
      return { success: false, message: error.message };
    }
  }

  async navigateToReels() {
    if (!this.browser || !this.page || !this.isLoggedIn) {
      return { success: false, message: 'Not logged in to Instagram' };
    }
    
    try {
      console.log('Navigating to Instagram reels...');
      
      // Try to navigate to reels multiple ways if needed
      try {
        await this.page.goto('https://www.instagram.com/reels/', { 
          waitUntil: 'domcontentloaded',
          timeout: 45000 
        });
      } catch (error) {
        console.log('Initial navigation to reels failed, trying alternative approach');
        
        // Try to navigate to home first
        await this.page.goto('https://www.instagram.com/', { 
          waitUntil: 'domcontentloaded',
          timeout: 30000 
        });
        
        // Then try to find and click on a reels link/button
        const reelsLink = await this.page.$('a[href="/reels/"]') || 
                          await this.page.$('a[href*="reels"]');
        
        if (reelsLink) {
          await reelsLink.click();
          await new Promise(resolve => setTimeout(resolve, 5000));
        } else {
          console.log('Could not find reels link, proceeding with current page');
        }
      }
      
      // Wait for page to load
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      return { success: true, message: 'Navigated to reels page' };
    } catch (error) {
      console.error('Error navigating to reels:', error);
      return { success: false, message: error.message };
    }
  }

  async scrollAndExtractReels(scrollCount = 3) {
    if (!this.browser || !this.page || !this.isLoggedIn) {
      return { success: false, message: 'Not logged in to Instagram' };
    }
    
    try {
      for (let i = 0; i < scrollCount; i++) {
        await this.page.evaluate(() => {
          window.scrollBy(0, window.innerHeight);
        });
        
        // Wait longer between scrolls to ensure data loads
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log(`Scrolling to load more reels (${i+1}/${scrollCount})`);
        
        // Try to click "See more" buttons if they exist
        try {
          const seeMoreButtons = await this.page.$$('button:has-text("See more")');
          for (const button of seeMoreButtons) {
            await button.click().catch(() => {});
          }
        } catch (error) {
          // Ignore errors
        }
      }
      
      // Wait longer for any pending content to load
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Extract reel data using DOM scraping
      const scrapedData = await this.page.evaluate(() => {
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
            
            // Extract shortcode from post URL
            let shortcode = null;
            if (postUrl) {
              const matches = postUrl.match(/\/p\/([^\/]+)\/|\/reel\/([^\/]+)\//);
              if (matches && (matches[1] || matches[2])) {
                shortcode = matches[1] || matches[2];
              } else {
                shortcode = postUrl.split('/').filter(Boolean).pop();
              }
            }
            
            // Check for trending audio using the specified SVG path
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
            
            if (shortcode) {
              reels.push({
                shortcode,
                username,
                likeCount,
                caption,
                videoSrc,
                postUrl,
                hasTrendingAudio,
                audioName,
                audioAuthor
              });
            }
          } catch (error) {
            console.error('Error extracting reel data:', error);
          }
        });
        
        return {
          reels,
          trendingAudios: Array.from(trendingAudios)
        };
      });
      
      return { 
        success: true, 
        data: scrapedData.reels,
        trendingAudios: scrapedData.trendingAudios
      };
    } catch (error) {
      console.error('Error scraping reels:', error);
      return { success: false, message: error.message };
    }
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      this.isLoggedIn = false;
      return { success: true, message: 'Browser closed successfully' };
    }
    return { success: false, message: 'No active browser session' };
  }

  getStatus() {
    return {
      isLoggedIn: this.isLoggedIn,
      browserActive: !!this.browser
    };
  }
}

// Create a singleton instance
const puppeteerService = new PuppeteerService();

module.exports = puppeteerService; 