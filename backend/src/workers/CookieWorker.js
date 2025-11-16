import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { cookieQueue } from '../services/QueueService.js';
import Account from '../models/Account.js';
import { getAccessToken } from '../utils/auth-helper.js';

puppeteer.use(StealthPlugin());

const WHISK_URL = 'https://labs.google/fx/tools/whisk';
const COOKIE_NAME = '__Secure-next-auth.session-token';
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

cookieQueue.process('extract-cookie', async (job) => {
  const { accountId } = job.data;

  console.log(`[COOKIE EXTRACT] Starting for account ${accountId}`);

  try {
    const account = await Account.findById(accountId);
    if (!account) throw new Error('Account not found');

    const profilePath = account.metadata?.profilePath;
    if (!profilePath) {
      throw new Error('Profile path not found. Please login first.');
    }

    console.log(`[COOKIE EXTRACT] Using profile: ${profilePath}`);

    // Launch headless browser with existing profile
    const browser = await puppeteer.launch({
      userDataDir: profilePath,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    try {
      const page = await browser.newPage();

      console.log(`[COOKIE EXTRACT] Navigating to Whisk...`);

      // Navigate to Whisk
      await page.goto(WHISK_URL, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Wait for page to fully load
      await delay(3000);

      // Extract cookies
      const cookies = await page.cookies();
      const sessionCookie = cookies.find(c => c.name === COOKIE_NAME);

      if (!sessionCookie) {
        throw new Error('Session cookie not found. Profile may not be logged in to Whisk.');
      }

      console.log(`[COOKIE EXTRACT] Cookie found: ${sessionCookie.value.substring(0, 30)}...`);

      // Validate cookie
      console.log(`[COOKIE EXTRACT] Validating cookie...`);
      const validation = await getAccessToken(sessionCookie.value);
      
      if (!validation.valid) {
        throw new Error(`Cookie validation failed: ${validation.error}`);
      }

      console.log(`[COOKIE EXTRACT] Cookie validated successfully`);
      console.log(`[COOKIE EXTRACT] User: ${validation.userInfo?.email || 'N/A'}`);

      // Update account with retry logic
      let updateSuccess = false;
      let retryCount = 0;
      const maxRetries = 3;

      while (!updateSuccess && retryCount < maxRetries) {
        try {
          await Account.findByIdAndUpdate(accountId, {
            sessionCookie: sessionCookie.value,
            cookies: cookies,
            status: 'active',
            lastCookieUpdate: new Date(),
            'metadata.cookieExtracted': true,
            'metadata.cookieValidated': true
          });
          updateSuccess = true;
          console.log(`[COOKIE EXTRACT] Database updated`);
        } catch (dbError) {
          retryCount++;
          console.error(`[COOKIE EXTRACT] Database update failed (attempt ${retryCount}):`, dbError.message);
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            throw new Error(`Failed to update database after ${maxRetries} attempts`);
          }
        }
      }

      console.log(`[COOKIE EXTRACT] Success for ${account.email}`);

      return {
        success: true,
        email: account.email,
        cookieLength: sessionCookie.value.length,
        validated: true
      };

    } finally {
      await browser.close();
    }

  } catch (error) {
    console.error(`[COOKIE EXTRACT] Error:`, error.message);

    // Update account status
    try {
      await Account.findByIdAndUpdate(accountId, {
        status: 'error'
      });
    } catch (dbError) {
      console.error(`[COOKIE EXTRACT] Failed to update error status:`, dbError.message);
    }

    throw error;
  }
});

console.log('[COOKIE WORKER] Started and ready to extract cookies');

export default cookieQueue;