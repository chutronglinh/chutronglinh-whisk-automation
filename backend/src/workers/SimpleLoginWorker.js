import puppeteer from 'puppeteer';
import Account from '../models/Account.js';
import { connectDB } from '../config/database.js';
import Bull from 'bull';
import path from 'path';
import fs from 'fs';

// Redis config
const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null,
  enableReadyCheck: false
};

// Create queue
const simpleLoginQueue = new Bull('simple-login', {
  redis: REDIS_CONFIG,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: true,
    removeOnFail: false
  }
});

// Profile base path
const PROFILE_BASE_PATH = process.env.PROFILE_PATH || '/opt/whisk-automation/data/profiles';

class SimpleLoginWorker {
  constructor() {
    this.isProcessing = false;
  }

  async init() {
    try {
      await connectDB();
      console.log('[SIMPLE LOGIN WORKER] Started and ready for manual logins');
      console.log('[SIMPLE LOGIN WORKER] ✓ MongoDB connected');
      
      // Ensure profile directory exists
      if (!fs.existsSync(PROFILE_BASE_PATH)) {
        fs.mkdirSync(PROFILE_BASE_PATH, { recursive: true });
        console.log('[SIMPLE LOGIN WORKER] Created profile directory:', PROFILE_BASE_PATH);
      }

      this.startProcessing();
    } catch (error) {
      console.error('[SIMPLE LOGIN WORKER] Init error:', error);
      process.exit(1);
    }
  }

  startProcessing() {
    // Process jobs from queue
    simpleLoginQueue.process(async (job) => {
      return this.processSimpleLogin(job.data);
    });

    // Also poll database for pending accounts
    setInterval(() => this.pollPendingAccounts(), 10000);

    // Queue event listeners
    simpleLoginQueue.on('completed', (job, result) => {
      console.log(`[SIMPLE LOGIN QUEUE] Job ${job.id} completed:`, result);
    });

    simpleLoginQueue.on('failed', (job, err) => {
      console.error(`[SIMPLE LOGIN QUEUE] Job ${job.id} failed:`, err.message);
    });

    simpleLoginQueue.on('stalled', (job) => {
      console.warn(`[SIMPLE LOGIN QUEUE] Job ${job.id} stalled`);
    });
  }

  async pollPendingAccounts() {
    if (this.isProcessing) return;

    try {
      const pendingAccount = await Account.findOne({
        status: 'simple-login-pending'
      }).sort({ 'metadata.simpleLoginRequested': 1 });

      if (pendingAccount) {
        console.log('[SIMPLE LOGIN WORKER] Found pending account:', pendingAccount.email);
        await this.processSimpleLogin({
          accountId: pendingAccount._id.toString(),
          email: pendingAccount.email
        });
      }
    } catch (error) {
      console.error('[SIMPLE LOGIN WORKER] Poll error:', error);
    }
  }

  async processSimpleLogin(data) {
    const { accountId, email } = data;
    this.isProcessing = true;

    let browser = null;
    const profilePath = path.join(PROFILE_BASE_PATH, accountId);

    try {
      console.log(`[SIMPLE LOGIN] Starting manual login for ${email}`);
      console.log(`[SIMPLE LOGIN] Profile path: ${profilePath}`);

      // Create profile directory if not exists
      if (!fs.existsSync(profilePath)) {
        fs.mkdirSync(profilePath, { recursive: true });
        console.log(`[SIMPLE LOGIN] Created profile directory for ${email}`);
      }

      // Update account status
      await Account.findByIdAndUpdate(accountId, {
        $set: {
          status: 'simple-login-pending',
          'metadata.loginStarted': new Date()
        }
      });

      // Launch browser with DISPLAY for Ubuntu Desktop
      console.log(`[SIMPLE LOGIN] Launching browser with DISPLAY=${process.env.DISPLAY || ':0'}`);
      
      browser = await puppeteer.launch({
        headless: false, // MUST be false to show on screen
        executablePath: '/usr/bin/google-chrome',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled',
          '--start-maximized',
          '--disable-infobars',
          '--window-size=1920,1080',
          `--display=${process.env.DISPLAY || ':0'}` // Force display
        ],
        userDataDir: profilePath,
        defaultViewport: null
      });

      const page = await browser.newPage();

      // Navigate to Whisk - FIX URL HERE
      console.log('[SIMPLE LOGIN] Navigating to Whisk...');
      await page.goto('https://labs.google/fx/tools/whisk', {
        waitUntil: 'networkidle2',
        timeout: 60000
      });

      // Wait a bit for page to load
      await page.waitForTimeout(3000);

      console.log(`[SIMPLE LOGIN] Browser opened for ${email}`);
      console.log('[SIMPLE LOGIN] Waiting for user to complete login manually...');
      console.log('[SIMPLE LOGIN] Browser will stay open until user completes login or closes it');

      // Wait for user to login (check for session cookie)
      let loginCompleted = false;
      let checkCount = 0;
      const maxChecks = 180; // 15 minutes (180 * 5 seconds)

      while (!loginCompleted && checkCount < maxChecks) {
        await page.waitForTimeout(5000);
        checkCount++;

        try {
          // Check if login completed by looking for session cookie
          const cookies = await page.cookies();
          const sessionCookie = cookies.find(c => 
            c.name === '__Secure-1PSID' || 
            c.name === '__Secure-3PSID' ||
            c.domain.includes('google.com')
          );

          if (sessionCookie) {
            console.log(`[SIMPLE LOGIN] ✓ Login detected for ${email}!`);
            loginCompleted = true;

            // Save cookies to database
            await Account.findByIdAndUpdate(accountId, {
              $set: {
                status: 'active',
                sessionCookie: sessionCookie.value,
                cookies: cookies,
                lastCookieUpdate: new Date(),
                'metadata.profilePath': profilePath,
                'metadata.profileReady': true,
                'metadata.cookieStatus': 'active',
                'metadata.loginCompleted': new Date()
              }
            });

            console.log(`[SIMPLE LOGIN] ✓ Cookies saved for ${email}`);
          }
        } catch (error) {
          // Continue checking
        }

        // Check if browser is still open
        if (!browser.isConnected()) {
          console.log(`[SIMPLE LOGIN] Browser closed for ${email}`);
          break;
        }
      }

      if (!loginCompleted && checkCount >= maxChecks) {
        console.log(`[SIMPLE LOGIN] Timeout waiting for login completion for ${email}`);
        await Account.findByIdAndUpdate(accountId, {
          $set: {
            status: 'login-required',
            'metadata.loginTimeout': new Date()
          }
        });
      }

      if (!loginCompleted && browser.isConnected()) {
        // User closed browser without completing login
        await Account.findByIdAndUpdate(accountId, {
          $set: {
            status: 'login-required',
            'metadata.loginCancelled': new Date()
          }
        });
      }

      return {
        success: loginCompleted,
        email,
        message: loginCompleted ? 'Login completed successfully' : 'Login not completed'
      };

    } catch (error) {
      console.error(`[SIMPLE LOGIN] Error for ${email}:`, error.message);

      await Account.findByIdAndUpdate(accountId, {
        $set: {
          status: 'login-required',
          'metadata.lastError': error.message,
          'metadata.lastErrorTime': new Date()
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
}

// Start worker
const worker = new SimpleLoginWorker();
worker.init();

export default worker;