import { loginQueue } from '../services/QueueService.js';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import Account from '../models/Account.js';
import path from 'path';
import fs from 'fs';

puppeteer.use(StealthPlugin());

// Process simple manual login - user does everything
loginQueue.process('simple-manual-login', async (job) => {
  const { accountId, email } = job.data;
  
  console.log(`[SIMPLE LOGIN] Opening browser for ${email} - User will login manually`);
  
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

    console.log(`[SIMPLE LOGIN] Browser opened. Waiting for user to complete login (max 10 minutes)...`);
    
    // Wait for user to login - detect when they reach Gmail or Google homepage
    await Promise.race([
      // Wait for Gmail
      page.waitForFunction(
        () => window.location.hostname.includes('mail.google.com'),
        { timeout: 600000 } // 10 minutes
      ),
      // Or Google homepage
      page.waitForFunction(
        () => window.location.hostname === 'www.google.com' && 
              !window.location.pathname.includes('signin'),
        { timeout: 600000 }
      ),
      // Or any Google service logged in
      page.waitForFunction(
        () => {
          const loggedIn = document.querySelector('[aria-label*="Google Account"]') !== null ||
                          document.querySelector('[data-ogsr-up]') !== null ||
                          document.querySelector('a[href*="SignOutOptions"]') !== null;
          return loggedIn;
        },
        { timeout: 600000 }
      )
    ]);

    console.log(`[SIMPLE LOGIN] Login detected! Profile ready.`);

    // Update account in database with retry logic
    let updateSuccess = false;
    let retryCount = 0;
    const maxRetries = 3;

    while (!updateSuccess && retryCount < maxRetries) {
      try {
        await Account.findByIdAndUpdate(accountId, {
          status: 'pending', // Not active yet - need to extract cookie
          lastLogin: new Date(),
          loginAttempts: 0,
          'metadata.userAgent': await page.evaluate(() => navigator.userAgent),
          'metadata.profilePath': profileDir,
          'metadata.profileReady': true // Profile is ready for cookie extraction
        });
        updateSuccess = true;
        console.log(`[SIMPLE LOGIN] Database updated for ${email}`);
      } catch (dbError) {
        retryCount++;
        console.error(`[SIMPLE LOGIN] Database update failed (attempt ${retryCount}):`, dbError.message);
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          throw new Error(`Failed to update database after ${maxRetries} attempts`);
        }
      }
    }

    console.log(`[SIMPLE LOGIN] Success! Profile ready for ${email}`);
    console.log(`[SIMPLE LOGIN] Next step: Click "Get Cookie" button to extract session cookie`);

    // Keep browser open for 5 seconds
    await page.waitForTimeout(5000);

    return {
      success: true,
      email,
      profilePath: profileDir,
      message: 'Login successful. Profile ready. Please click "Get Cookie" to extract session cookie.'
    };

  } catch (error) {
    console.error(`[SIMPLE LOGIN] Error for ${email}:`, error.message);

    // Update account status
    try {
      await Account.findByIdAndUpdate(accountId, {
        status: 'error',
        $inc: { loginAttempts: 1 }
      });
    } catch (dbError) {
      console.error(`[SIMPLE LOGIN] Failed to update error status:`, dbError.message);
    }

    throw error;

  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

console.log('[SIMPLE LOGIN WORKER] Started and ready for manual logins');

export default loginQueue;