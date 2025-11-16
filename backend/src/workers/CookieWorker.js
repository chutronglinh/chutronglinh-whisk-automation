import { cookieQueue } from '../services/QueueService.js';
import puppeteer from 'puppeteer';
import Account from '../models/Account.js';

console.log('[COOKIE WORKER] Started and ready to extract cookies');

const processCookieExtraction = async (job) => {
  const { accountId } = job.data;
  
  console.log(`[COOKIE EXTRACT] Starting for account ${accountId}`);

  let browser;
  try {
    const account = await Account.findById(accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    const profilePath = account.metadata?.profilePath;
    if (!profilePath) {
      throw new Error('Profile path not found');
    }

    console.log(`[COOKIE EXTRACT] Using profile: ${profilePath}`);

    // Launch browser với profile
    browser = await puppeteer.launch({
      headless: true,
      executablePath: '/usr/bin/google-chrome',
      userDataDir: profilePath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote'
      ]
    });

    const page = await browser.newPage();

    // Navigate to Whisk
    console.log(`[COOKIE EXTRACT] Navigating to Whisk...`);
    await page.goto('https://whisk.google.com', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    // Wait để page load
    await page.waitForTimeout(3000);

    // Extract cookies
    const cookies = await page.cookies();
    const sessionCookie = cookies.find(c => 
      c.name === '__Secure-1PSID' || 
      c.name === 'SID' ||
      c.name.includes('session')
    );

    if (!sessionCookie) {
      throw new Error('Session cookie not found. Please login first.');
    }

    console.log(`[COOKIE EXTRACT] Cookie found: ${sessionCookie.value.substring(0, 50)}...`);

    // Validate cookie
    console.log(`[COOKIE EXTRACT] Validating cookie...`);
    const response = await page.goto('https://whisk.google.com/api/user', {
      waitUntil: 'networkidle2',
      timeout: 15000
    });

    if (!response || response.status() !== 200) {
      throw new Error('Cookie validation failed. May be expired.');
    }

    const userData = await response.json();
    console.log(`[COOKIE EXTRACT] Cookie validated successfully`);
    console.log(`[COOKIE EXTRACT] User: ${userData.email || account.email}`);

    await browser.close();

    // Update database với retry
    let retryCount = 0;
    const maxRetries = 3;
    let updateSuccess = false;

    while (retryCount < maxRetries && !updateSuccess) {
      try {
        await Account.findByIdAndUpdate(accountId, {
          sessionCookie: sessionCookie.value,
          cookies: cookies,
          status: 'active',
          lastCookieUpdate: new Date(),
          'metadata.cookieExtracted': true,
          'metadata.cookieValidated': true,
          'metadata.cookieStatus': 'active',
          'metadata.cookieError': null
        });
        updateSuccess = true;
        console.log(`[COOKIE EXTRACT] Database updated`);
      } catch (dbError) {
        retryCount++;
        if (retryCount >= maxRetries) {
          throw new Error(`Database update failed after ${maxRetries} retries: ${dbError.message}`);
        }
        console.log(`[COOKIE EXTRACT] Database update retry ${retryCount}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }

    console.log(`[COOKIE EXTRACT] Success for ${account.email}`);

    return {
      success: true,
      email: account.email,
      cookieLength: sessionCookie.value.length,
      validated: true
    };

  } catch (error) {
    console.error(`[COOKIE EXTRACT] Error:`, error.message);

    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error(`[COOKIE EXTRACT] Error closing browser:`, closeError.message);
      }
    }

    // Update database với error status
    try {
      await Account.findByIdAndUpdate(accountId, {
        status: 'error',
        'metadata.cookieStatus': 'failed',
        'metadata.cookieError': error.message
      });
    } catch (dbError) {
      console.error(`[COOKIE EXTRACT] Failed to update error status:`, dbError.message);
    }

    throw error;
  }
};

// Process queue
cookieQueue.process(2, processCookieExtraction);

cookieQueue.on('completed', (job, result) => {
  console.log(`[COOKIE QUEUE] Job ${job.id} completed:`, result);
});

cookieQueue.on('failed', (job, error) => {
  console.error(`[COOKIE QUEUE] Job ${job.id} failed:`, error.message);
});

export default cookieQueue;