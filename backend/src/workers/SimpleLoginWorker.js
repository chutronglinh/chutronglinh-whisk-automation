import { simpleLoginQueue } from '../services/QueueService.js';
import puppeteer from 'puppeteer';
import Account from '../models/Account.js';
import path from 'path';
import fs from 'fs';

console.log('[SIMPLE LOGIN WORKER] Started and ready for manual logins');

const processSimpleLogin = async (job) => {
  const { accountId } = job.data;
  
  console.log(`[SIMPLE LOGIN] Starting manual login process for account ${accountId}`);

  let browser;
  try {
    const account = await Account.findById(accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    const { email, password } = account;

    // Create profile directory
    const profileDir = path.join(process.env.PROFILE_PATH || '/opt/whisk-automation/data/profiles', accountId);
    if (!fs.existsSync(profileDir)) {
      fs.mkdirSync(profileDir, { recursive: true });
    }

    console.log(`[SIMPLE LOGIN] Opening browser for ${email} - User will login manually`);

    // Launch browser with profile
    browser = await puppeteer.launch({
      headless: false,
      executablePath: '/usr/bin/google-chrome',
      userDataDir: profileDir,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--window-size=1280,720'
      ]
    });

    const page = await browser.newPage();

    // Navigate to Google login
    await page.goto('https://accounts.google.com/', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    console.log(`[SIMPLE LOGIN] Browser opened. Waiting for user to complete login (max 10 minutes)...`);

    // Wait for login completion - check for Google account page
    await page.waitForFunction(
      () => {
        const url = window.location.href;
        // Check if logged in (myaccount page or drive/gmail)
        return url.includes('myaccount.google.com') || 
               url.includes('drive.google.com') ||
               url.includes('mail.google.com') ||
               document.querySelector('a[href*="SignOutOptions"]') !== null;
      },
      { timeout: 600000 } // 10 minutes
    );

    console.log(`[SIMPLE LOGIN] Login detected! Profile ready.`);

    await browser.close();

    // Update database with retry mechanism
    let retryCount = 0;
    const maxRetries = 3;
    let updateSuccess = false;

    while (retryCount < maxRetries && !updateSuccess) {
      try {
        await Account.findByIdAndUpdate(accountId, {
          status: 'pending',
          lastLogin: new Date(),
          loginAttempts: 0,
          'metadata.userAgent': await page.evaluate(() => navigator.userAgent),
          'metadata.profilePath': profileDir,
          'metadata.profileReady': true
        });
        updateSuccess = true;
        console.log(`[SIMPLE LOGIN] Database updated for ${email}`);
      } catch (dbError) {
        retryCount++;
        if (retryCount >= maxRetries) {
          throw new Error(`Database update failed after ${maxRetries} retries: ${dbError.message}`);
        }
        console.log(`[SIMPLE LOGIN] Database update retry ${retryCount}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }

    console.log(`[SIMPLE LOGIN] Success! Profile ready for ${email}`);
    console.log(`[SIMPLE LOGIN] Next step: Click "Get Cookie" button to extract session cookie`);

    return {
      success: true,
      email,
      profilePath: profileDir,
      message: 'Login successful. Profile ready. Please click "Get Cookie" to extract session cookie.'
    };

  } catch (error) {
    console.error(`[SIMPLE LOGIN] Error for ${account?.email || accountId}:`, error.message);

    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error(`[SIMPLE LOGIN] Error closing browser:`, closeError.message);
      }
    }

    // Update error status
    try {
      await Account.findByIdAndUpdate(accountId, {
        status: 'error',
        $inc: { loginAttempts: 1 }
      });
    } catch (dbError) {
      console.error(`[SIMPLE LOGIN] Failed to update error status:`, dbError.message);
    }

    throw error;
  }
};

// Process queue
simpleLoginQueue.process(1, processSimpleLogin);

simpleLoginQueue.on('completed', (job, result) => {
  console.log(`[LOGIN QUEUE] Job ${job.id} completed:`, result);
});

simpleLoginQueue.on('failed', (job, error) => {
  console.error(`[LOGIN QUEUE] Job ${job.id} failed:`, error.message);
});

export default simpleLoginQueue;