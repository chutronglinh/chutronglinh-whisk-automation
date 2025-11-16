import puppeteer from 'puppeteer';
import { cookieQueue } from '../config/queue.js';
import Account from '../models/Account.js';
import Job from '../models/Job.js';
import { getAccessToken } from '../utils/auth-helper.js';
import { io } from '../app.js';

const WHISK_URL = 'https://labs.google/fx/tools/whisk';
const COOKIE_NAME = '__Secure-next-auth.session-token';
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

cookieQueue.process(async (job) => {
  const { accountId, profilePath } = job.data;

  const jobRecord = await Job.create({
    jobType: 'EXTRACT_COOKIE',
    status: 'processing',
    data: job.data,
    accountId
  });

  try {
    const account = await Account.findOne({ accountId });
    if (!account) throw new Error('Account not found');
    if (!profilePath) throw new Error('Profile path not found');

    job.progress(20);
    io.emit('job:progress', { jobId: jobRecord._id, progress: 20 });

    const browser = await puppeteer.launch({
      userDataDir: profilePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    try {
      const page = await browser.newPage();
      await page.goto(WHISK_URL, { waitUntil: 'networkidle2', timeout: 30000 });
      await delay(3000);

      job.progress(60);
      io.emit('job:progress', { jobId: jobRecord._id, progress: 60 });

      const cookies = await page.cookies();
      const sessionCookie = cookies.find(c => c.name === COOKIE_NAME);

      if (!sessionCookie) throw new Error('Session cookie not found');

      job.progress(80);
      io.emit('job:progress', { jobId: jobRecord._id, progress: 80 });

      // Validate cookie
      const validation = await getAccessToken(sessionCookie.value);
      if (!validation.valid) throw new Error(`Cookie validation failed: ${validation.error}`);

      account.sessionCookie = sessionCookie.value;
      account.status = 'active';
      account.lastChecked = new Date();
      await account.save();

      jobRecord.status = 'completed';
      jobRecord.progress = 100;
      jobRecord.result = { validated: true };
      await jobRecord.save();

      io.emit('job:completed', { jobId: jobRecord._id });
      return { success: true };
    } finally {
      await browser.close();
    }
  } catch (error) {
    jobRecord.status = 'failed';
    jobRecord.error = error.message;
    await jobRecord.save();

    const account = await Account.findOne({ accountId });
    if (account) {
      account.status = 'blocked';
      account.blockReason = 'COOKIE_EXTRACTION_FAILED';
      account.blockError = error.message;
      await account.save();
    }

    io.emit('job:failed', { jobId: jobRecord._id, error: error.message });
    throw error;
  }
});

console.log('✓ CookieWorker started');