import { loginQueue } from '../services/QueueService.js';
import puppeteer from 'puppeteer';
import Account from '../models/Account.js';
import path from 'path';
import fs from 'fs';
import { connectDB } from '../config/database.js';

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
      executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        `--user-data-dir=${profileDir}`,
        '--window-size=1280,720',
        '--start-maximized',
        `--display=${process.env.DISPLAY || ':0'}`
      ],
      defaultViewport: null
    });

    const page = await browser.newPage();

    // Navigate to Whisk (let Google SSO handle login)
    console.log('[MANUAL LOGIN] Navigating to Whisk...');
    await page.goto('https://labs.google/fx/tools/whisk', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    console.log('[MANUAL LOGIN] ✓ Browser opened for manual login');
    console.log('[MANUAL LOGIN] Please login manually and close the browser when done...');

    // Wait for browser to be closed by user
    await new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!browser.isConnected()) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 1000);
    });

    console.log('[MANUAL LOGIN] ✓ Browser closed by user');

    // Reopen browser headless to extract cookies
    browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ],
      userDataDir: profileDir
    });

    const cookiePage = await browser.newPage();
    await cookiePage.goto('https://labs.google/fx/tools/whisk', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await cookiePage.waitForTimeout(2000);

    // Extract cookies
    const cookies = await cookiePage.cookies();

    // Find the session cookie
    const COOKIE_NAME = '__Secure-next-auth.session-token';
    const sessionCookie = cookies.find(c => c.name === COOKIE_NAME);

    if (!sessionCookie) {
      throw new Error('Session cookie not found. Please ensure you logged in correctly.');
    }

    console.log('[MANUAL LOGIN] ✓ Session cookie found');

    // Update account in database
    await Account.findByIdAndUpdate(accountId, {
      sessionCookie: sessionCookie.value,
      cookies: cookies,
      status: 'ACTIVE',
      lastLogin: new Date(),
      lastCookieUpdate: new Date(),
      loginAttempts: 0,
      'metadata.cookieStatus': 'active',
      'metadata.profilePath': profileDir,
      'metadata.profileReady': true
    });

    console.log(`[MANUAL LOGIN] Success for ${email}. Session cookie saved.`);

    return {
      success: true,
      email,
      sessionCookie: sessionCookie.value.substring(0, 30) + '...',
      cookiesCount: cookies.length,
      profilePath: profileDir,
      message: 'Login successful, session cookie extracted'
    };

  } catch (error) {
    console.error(`[MANUAL LOGIN] Error for ${email}:`, error.message);

    // Update account status
    await Account.findByIdAndUpdate(accountId, {
      status: 'NEW',
      'metadata.lastError': error.message,
      'metadata.lastErrorTime': new Date(),
      $inc: { loginAttempts: 1 }
    });

    throw error;

  } finally {
    if (browser && browser.isConnected()) {
      try {
        await browser.close();
      } catch (e) {
        // Browser already closed
      }
    }
  }
});

// Start worker
console.log('[MANUAL LOGIN WORKER] Started and ready to process jobs');

export default loginQueue;