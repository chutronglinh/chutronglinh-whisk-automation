import puppeteer from 'puppeteer';
import Account from '../models/Account.js';
import { connectDB } from '../config/database.js';
import fs from 'fs';

const WHISK_URL = 'https://labs.google/fx/tools/whisk';
const COOKIE_NAME = '__Secure-next-auth.session-token';

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
        executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ],
        userDataDir: profilePath
      });

      const page = await browser.newPage();

      console.log('[COOKIE EXTRACT] Navigating to Whisk...');
      await page.goto(WHISK_URL, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      await page.waitForTimeout(2000);

      const cookies = await page.cookies();
      console.log(`[COOKIE EXTRACT] Extracted ${cookies.length} cookies`);

      // Find the correct session cookie
      const sessionCookie = cookies.find(c => c.name === COOKIE_NAME);

      if (!sessionCookie) {
        throw new Error('Session cookie not found. Please login again.');
      }

      console.log(`[COOKIE EXTRACT] ✓ Found session cookie`);

      // Validate cookie format
      if (!this.validateCookieFormat(sessionCookie.value)) {
        throw new Error('Invalid cookie format');
      }

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
        try {
          await browser.close();
        } catch (e) {
          // Browser already closed
        }
      }
      this.isProcessing = false;
    }
  }

  validateCookieFormat(cookie) {
    if (!cookie) return false;
    if (typeof cookie !== 'string') return false;
    
    // Session token should start with eyJhbGci (base64 encoded JWT)
    if (!cookie.startsWith('eyJhbGci')) return false;
    
    // Reasonable length check
    if (cookie.length < 100 || cookie.length > 5000) return false;
    
    // Should have JWT structure (header.payload.signature)
    const parts = cookie.split('.');
    if (parts.length < 2) return false;
    
    return true;
  }
}

const worker = new CookieWorker();
worker.init();

export default worker;