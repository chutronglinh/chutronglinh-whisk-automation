import puppeteer from 'puppeteer';
import Account from '../models/Account.js';
import { connectDB } from '../config/database.js';
import Bull from 'bull';
import fs from 'fs';

// Redis config
const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null,
  enableReadyCheck: false
};

// Create queue
const cookieQueue = new Bull('cookie-extraction', {
  redis: REDIS_CONFIG,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: true,
    removeOnFail: false
  }
});

class CookieWorker {
  constructor() {
    this.isProcessing = false;
  }

  async init() {
    try {
      await connectDB();
      console.log('[COOKIE WORKER] Started and ready');
      console.log('[COOKIE WORKER] ✓ MongoDB connected');

      this.startProcessing();
    } catch (error) {
      console.error('[COOKIE WORKER] Init error:', error);
      process.exit(1);
    }
  }

  startProcessing() {
    // Process jobs from queue
    cookieQueue.process(async (job) => {
      return this.extractCookie(job.data);
    });

    // Poll database for pending extractions
    setInterval(() => this.pollPendingExtractions(), 10000);

    // Queue event listeners
    cookieQueue.on('completed', (job, result) => {
      console.log(`[COOKIE QUEUE] Job ${job.id} completed:`, result);
    });

    cookieQueue.on('failed', (job, err) => {
      console.error(`[COOKIE QUEUE] Job ${job.id} failed:`, err.message);
    });
  }

  async pollPendingExtractions() {
    if (this.isProcessing) return;

    try {
      const pendingAccount = await Account.findOne({
        'metadata.cookieExtractionRequested': { $exists: true },
        'metadata.profileReady': true
      }).sort({ 'metadata.cookieExtractionRequested': 1 });

      if (pendingAccount) {
        console.log('[COOKIE WORKER] Found pending extraction:', pendingAccount.email);
        await this.extractCookie({
          accountId: pendingAccount._id.toString(),
          email: pendingAccount.email,
          profilePath: pendingAccount.metadata.profilePath
        });
      }
    } catch (error) {
      console.error('[COOKIE WORKER] Poll error:', error);
    }
  }

  async extractCookie(data) {
    const { accountId, email, profilePath } = data;
    this.isProcessing = true;

    let browser = null;

    try {
      console.log(`[COOKIE EXTRACT] Starting for account ${accountId}`);

      if (!profilePath || !fs.existsSync(profilePath)) {
        throw new Error('Profile not found. Please login first.');
      }

      console.log(`[COOKIE EXTRACT] Using profile: ${profilePath}`);

      // Launch browser with existing profile
      browser = await puppeteer.launch({
        headless: true,
        executablePath: '/usr/bin/google-chrome',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled'
        ],
        userDataDir: profilePath
      });

      const page = await browser.newPage();

      // Navigate to Whisk
      console.log('[COOKIE EXTRACT] Navigating to Whisk...');
      await page.goto('https://labs.google.com/search/whisk', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      await page.waitForTimeout(2000);

      // Extract cookies
      const cookies = await page.cookies();
      console.log(`[COOKIE EXTRACT] Extracted ${cookies.length} cookies`);

      // Find session cookie
      const sessionCookie = cookies.find(c => 
        c.name === '__Secure-1PSID' || 
        c.name === '__Secure-3PSID'
      );

      if (!sessionCookie) {
        throw new Error('Session cookie not found. Please login first.');
      }

      console.log(`[COOKIE EXTRACT] ✓ Found session cookie for ${email}`);

      // Save to database
      await Account.findByIdAndUpdate(accountId, {
        $set: {
          sessionCookie: sessionCookie.value,
          cookies: cookies,
          lastCookieUpdate: new Date(),
          'metadata.cookieStatus': 'active',
          'metadata.cookieExtractionRequested': null
        }
      });

      console.log(`[COOKIE EXTRACT] ✓ Cookies saved to database for ${email}`);

      return {
        success: true,
        email,
        cookieCount: cookies.length
      };

    } catch (error) {
      console.error(`[COOKIE EXTRACT] Error:`, error.message);

      await Account.findByIdAndUpdate(accountId, {
        $set: {
          'metadata.lastError': error.message,
          'metadata.lastErrorTime': new Date(),
          'metadata.cookieExtractionRequested': null
        }
      });

      throw error;

    } finally {
      if (browser) {
        await browser.close();
      }
      this.isProcessing = false;
    }
  }
}

// Start worker
const worker = new CookieWorker();
worker.init();

export default worker;