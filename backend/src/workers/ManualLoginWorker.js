import { loginQueue } from '../services/QueueService.js';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import Account from '../models/Account.js';
import path from 'path';
import fs from 'fs';
import speakeasy from 'speakeasy';
import { connectDB } from '../config/database.js';

puppeteer.use(StealthPlugin());

// Connect to MongoDB before processing jobs
let dbConnected = false;

(async () => {
  try {
    await connectDB();
    dbConnected = true;
    console.log('[MANUAL LOGIN WORKER] ✓ MongoDB connected successfully');
  } catch (err) {
    console.error('[MANUAL LOGIN WORKER] ✗ MongoDB connection failed:', err);
    process.exit(1);
  }
})();

// Process manual login jobs
loginQueue.process('manual-login', async (job) => {
  const { accountId, email, password, twoFASecret } = job.data;
  
  // Wait for DB connection
  if (!dbConnected) {
    console.log('[MANUAL LOGIN] Waiting for MongoDB connection...');
    await new Promise(resolve => {
      const checkInterval = setInterval(() => {
        if (dbConnected) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }
  
  console.log(`[MANUAL LOGIN] Starting for ${email}`);
  
  let browser = null;
  
  try {
    // Create profile directory
    const profilePath = process.env.PROFILE_PATH || '/opt/whisk-automation/data/profiles';
    const profileDir = path.join(profilePath, accountId);
    
    if (!fs.existsSync(profileDir)) {
      fs.mkdirSync(profileDir, { recursive: true });
    }

    // Launch Chrome with visible UI
    browser = await puppeteer.launch({
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        `--user-data-dir=${profileDir}`,
        '--window-size=1280,720',
        '--start-maximized'
      ],
      defaultViewport: null
    });

    const page = await browser.newPage();

    // Set user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Navigate to Gmail login
    await page.goto('https://accounts.google.com/signin/v2/identifier', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    // Wait a bit for page to load
    await page.waitForTimeout(2000);

    // Fill email
    const emailInput = await page.$('input[type="email"]');
    if (emailInput) {
      await emailInput.type(email, { delay: 100 });
      await page.waitForTimeout(1000);
      
      // Click Next
      await page.keyboard.press('Enter');
      await page.waitForTimeout(3000);
    }

    // Fill password
    const passwordInput = await page.$('input[type="password"]');
    if (passwordInput) {
      await passwordInput.type(password, { delay: 100 });
      await page.waitForTimeout(1000);
      
      // Click Next
      await page.keyboard.press('Enter');
      await page.waitForTimeout(5000);
    }

    // Handle 2FA if needed
    if (twoFASecret) {
      try {
        const totpInput = await page.$('input[type="tel"]');
        if (totpInput) {
          const token = speakeasy.totp({
            secret: twoFASecret,
            encoding: 'base32'
          });
          
          await totpInput.type(token, { delay: 100 });
          await page.waitForTimeout(1000);
          await page.keyboard.press('Enter');
          await page.waitForTimeout(5000);
        }
      } catch (err) {
        console.log('[MANUAL LOGIN] 2FA not required or error:', err.message);
      }
    }

    // Wait for user to complete any additional steps
    console.log('[MANUAL LOGIN] Waiting for login completion (max 5 minutes)...');
    
    // Wait for either success or timeout
    await Promise.race([
      page.waitForNavigation({ 
        waitUntil: 'networkidle2',
        timeout: 300000 // 5 minutes
      }),
      page.waitForFunction(
        () => window.location.hostname.includes('google.com') && 
              !window.location.pathname.includes('signin'),
        { timeout: 300000 }
      )
    ]);

    // Extract cookies
    const cookies = await page.cookies();
    
    // Update account in database
    await Account.findByIdAndUpdate(accountId, {
      cookies: cookies,
      status: 'active',
      lastLogin: new Date(),
      lastCookieUpdate: new Date(),
      loginAttempts: 0,
      'metadata.userAgent': await page.evaluate(() => navigator.userAgent),
      'metadata.profilePath': profileDir
    });

    console.log(`[MANUAL LOGIN] Success for ${email}. Cookies saved.`);

    // Keep browser open for 30 seconds so user can verify
    await page.waitForTimeout(30000);

    return {
      success: true,
      email,
      cookiesCount: cookies.length,
      profilePath: profileDir,
      message: 'Login successful, cookies extracted'
    };

  } catch (error) {
    console.error(`[MANUAL LOGIN] Error for ${email}:`, error.message);

    // Update account status
    await Account.findByIdAndUpdate(accountId, {
      status: 'error',
      $inc: { loginAttempts: 1 }
    });

    throw error;

  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

// Start worker
console.log('[MANUAL LOGIN WORKER] Started and ready to process jobs');

export default loginQueue;