import { simpleLoginQueue } from '../services/QueueService.js';
import puppeteer from 'puppeteer';
import Account from '../models/Account.js';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';

// Connect to MongoDB
if (mongoose.connection.readyState === 0) {
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/whisk-automation')
    .then(() => console.log('[SIMPLE LOGIN WORKER] ✓ MongoDB connected'))
    .catch(err => console.error('[SIMPLE LOGIN WORKER] ✗ MongoDB error:', err));
}

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

    const { email } = account;

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

    // Navigate to Whisk (not Google accounts page)
    // Whisk will redirect to Google login automatically
    await page.goto('https://labs.google/fx/tools/whisk', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    console.log(`[SIMPLE LOGIN] Browser opened. Waiting for user to complete login (max 10 minutes)...`);

    // Wait for login completion - check for Whisk page after authentication
    await page.waitForFunction(
      () => {
        const url = window.location.href;
        // Check if logged in to Whisk (not on signin page)
        return url.includes('labs.google/fx/tools/whisk') && 
               !url.includes('signin') &&
               !url.includes('accounts.google.com') &&
               !url.includes('ServiceLogin');
      },
      { timeout: 600000 } // 10 minutes
    );

    console.log(`[SIMPLE LOGIN] Login detected! Whisk authenticated. Profile ready.`);

    // Get user agent
    const userAgent = await page.evaluate(() => navigator.userAgent);

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
          'metadata.userAgent': userAgent,
          'metadata.profilePath': profileDir,
          'metadata.profileReady': true,
          'metadata.whiskAuthenticated': true
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

    console.log(`[SIMPLE LOGIN] Success! Whisk profile ready for ${email}`);
    console.log(`[SIMPLE LOGIN] Next step: Click "Get Cookie" button to extract session cookie`);

    return {
      success: true,
      email,
      profilePath: profileDir,
      message: 'Login successful. Whisk authenticated. Please click "Get Cookie" to extract session cookie.'
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