import puppeteer from 'puppeteer';
import fs from 'fs-extra';
import { profileQueue } from '../services/QueueService.js';
import Account from '../models/Account.js';
import Job from '../models/Job.js';
import { io } from '../app.js';

const WHISK_URL = 'https://labs.google/fx/tools/whisk';

profileQueue.process(async (job) => {
  const { accountId, email } = job.data;
  
  const jobRecord = await Job.create({
    jobType: 'SETUP_PROFILE',
    status: 'processing',
    data: job.data,
    accountId
  });

  try {
    const account = await Account.findOne({ accountId });
    if (!account) throw new Error('Account not found');

    const profilePath = `${process.env.PROFILE_PATH}/${accountId}`;
    await fs.ensureDir(profilePath);

    job.progress(50);
    io.emit('job:progress', { jobId: jobRecord._id, progress: 50 });

    // Note: Profile setup requires manual login
    // This worker just creates the directory structure
    account.profilePath = profilePath;
    account.status = 'pending';
    await account.save();

    jobRecord.status = 'completed';
    jobRecord.progress = 100;
    jobRecord.result = { profilePath };
    await jobRecord.save();

    io.emit('job:completed', { jobId: jobRecord._id });
    return { success: true, profilePath };
  } catch (error) {
    jobRecord.status = 'failed';
    jobRecord.error = error.message;
    await jobRecord.save();

    io.emit('job:failed', { jobId: jobRecord._id, error: error.message });
    throw error;
  }
});

console.log('✓ ProfileWorker started');