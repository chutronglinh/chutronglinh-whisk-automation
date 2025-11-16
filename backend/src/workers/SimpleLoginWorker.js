import puppeteer from 'puppeteer';
import Account from '../models/Account.js';
import { connectDB } from '../config/database.js';
import path from 'path';
import fs from 'fs';

const PROFILE_BASE_PATH = process.env.PROFILE_PATH || '/opt/whisk-automation/data/profiles';

class SimpleLoginWorker {
  constructor() {
    this.isProcessing = false;
  }

  async init() {
    try {
      await connectDB();
      console.log('[SIMPLE LOGIN WORKER] Started');
      console.log('[SIMPLE LOGIN WORKER] ✓ MongoDB connected');
      
      if (!fs.existsSync(PROFILE_BASE_PATH)) {
        fs.mkdirSync(PROFILE_BASE_PATH, { recursive: true });
      }

      this.startProcessing();
    } catch (error) {
      console.error('[SIMPLE LOGIN WORKER] Init error:', error);
      process.exit(1);
    }
  }

  startProcessing() {
    setInterval(() => this.pollPendingAccounts(), 5000);
  }

  async pollPendingAccounts() {
    if (this.isProcessing) return;

    try {
      const pendingAccount = await Account.findOne({
        status: 'simple-login-pending'
      }).sort({ 'metadata.simpleLoginRequested': 1 });

      if (pendingAccount) {
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
      console.log(`[SIMPLE LOGIN] Opening browser for ${email}`);
      console.log(`[SIMPLE LOGIN] Profile: ${profilePath}`);

      if (!fs.existsSync(profilePath)) {
        fs.mkdirSync(profilePath, { recursive: true });
      }

      await Account.findByIdAndUpdate(accountId, {
        $set: {
          'metadata.loginStarted': new Date()
        }
      });

      console.log(`[SIMPLE LOGIN] Launching with DISPLAY=${process.env.DISPLAY || ':0'}`);
      
      browser = await puppeteer.launch({
        headless: false,
        executablePath: '/usr/bin/google-chrome',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled',
          '--start-maximized',
          `--display=${process.env.DISPLAY || ':0'}`
        ],
        userDataDir: profilePath,
        defaultViewport: null
      });

      const page = await browser.newPage();

      console.log('[SIMPLE LOGIN] Navigating to Whisk...');
      await page.goto('https://labs.google/fx/tools/whisk', {
        waitUntil: 'networkidle2',
        timeout: 60000
      });

      console.log(`[SIMPLE LOGIN] ✓ Browser opened for ${email}`);
      console.log('[SIMPLE LOGIN] Waiting for user to login and close browser...');

      // KHÔNG CHECK COOKIE!
      // KHÔNG TỰ ĐÓNG BROWSER!
      // CHỈ ĐỢI BROWSER ĐÓNG
      
      await new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (!browser.isConnected()) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 1000);
      });

      console.log(`[SIMPLE LOGIN] ✓ Browser closed for ${email}`);

      // Update status to SYNCED
      await Account.findByIdAndUpdate(accountId, {
        $set: {
          status: 'SYNCED',
          'metadata.profilePath': profilePath,
          'metadata.profileReady': true,
          'metadata.loginCompleted': new Date()
        }
      });

      console.log(`[SIMPLE LOGIN] ✓ Profile synced for ${email}`);

      return {
        success: true,
        email,
        message: 'Profile synced. Ready to extract cookie.'
      };

    } catch (error) {
      console.error(`[SIMPLE LOGIN] Error for ${email}:`, error.message);

      await Account.findByIdAndUpdate(accountId, {
        $set: {
          status: 'NEW',
          'metadata.lastError': error.message,
          'metadata.lastErrorTime': new Date()
        }
      });

      throw error;

    } finally {
      if (browser && browser.isConnected()) {
        try {
          await browser.close();
        } catch (e) {}
      }
      this.isProcessing = false;
    }
  }
}

const worker = new SimpleLoginWorker();
worker.init();

export default worker;