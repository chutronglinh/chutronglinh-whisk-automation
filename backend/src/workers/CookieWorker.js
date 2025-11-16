import puppeteer from 'puppeteer';
import Account from '../models/Account.js';
import { connectDB } from '../config/database.js';
import fs from 'fs';

class CookieWorker {
  constructor() {
    this.isProcessing = false;
  }

  async init() {
    try {
      await connectDB();
      console.log('[COOKIE WORKER] Started');
      console.log('[COOKIE WORKER] ✓ MongoDB connected');

      this.startProcessing();
    } catch (error) {
      console.error('[COOKIE WORKER] Init error:', error);
      process.exit(1);
    }
  }

  startProcessing() {
    setInterval(() => this.pollPendingExtractions(), 5000);
  }

  async pollPendingExtractions() {
    if (this.isProcessing) return;

    try {
      const pendingAccount = await Account.findOne({
        'metadata.cookieExtractionRequested': { $exists: true },
        'metadata.profileReady': true
      }).sort({ 'metadata.cookieExtractionRequested': 1 });

      if (pendingAccount) {
        console.log('[COOKIE WORKER] Found pending:', pendingAccount.email);
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
      console.log(`[COOKIE EXTRACT] Starting for ${email}`);

      if (!profilePath || !fs.existsSync(profilePath)) {
        throw new Error('Profile not found. Please login first.');
      }

      browser = await puppeteer.launch({
        headless: true,
        executablePath: '/usr/bin/google-chrome',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage'
        ],
        userDataDir: profilePath
      });

      const page = await browser.newPage();

      console.log('[COOKIE EXTRACT] Navigating to Whisk...');
      await page.goto('https://labs.google/fx/tools/whisk', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      await page.waitForTimeout(2000);

      const cookies = await page.cookies();
      console.log(`[COOKIE EXTRACT] Extracted ${cookies.length} cookies`);

      const sessionCookie = cookies.find(c => 
        c.name === '__Secure-1PSID' || 
        c.name === '__Secure-3PSID'
      );

      if (!sessionCookie) {
        throw new Error('Session cookie not found. Please login again.');
      }

      console.log(`[COOKIE EXTRACT] ✓ Found session cookie`);

      await Account.findByIdAndUpdate(accountId, {
        $set: {
          status: 'ACTIVE',
          sessionCookie: sessionCookie.value,
          cookies: cookies,
          lastCookieUpdate: new Date(),
          'metadata.cookieStatus': 'active',
          'metadata.cookieExtractionRequested': null
        }
      });

      console.log(`[COOKIE EXTRACT] ✓ Saved for ${email}`);

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

const worker = new CookieWorker();
worker.init();

export default worker;