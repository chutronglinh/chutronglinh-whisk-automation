import Queue from 'bull';
import Redis from 'ioredis';

// Redis connection
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false
};

// Create queues
export const loginQueue = new Queue('manual-login', {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: 100,
    removeOnFail: 100
  }
});

export const cookieQueue = new Queue('cookie-extraction', {
  redis: redisConfig
});

export const imageQueue = new Queue('image-generation', {
  redis: redisConfig
});

// Queue event handlers
loginQueue.on('completed', (job, result) => {
  console.log(`[LOGIN QUEUE] Job ${job.id} completed:`, result);
});

loginQueue.on('failed', (job, err) => {
  console.error(`[LOGIN QUEUE] Job ${job.id} failed:`, err.message);
});

loginQueue.on('stalled', (job) => {
  console.warn(`[LOGIN QUEUE] Job ${job.id} stalled`);
});

export default {
  loginQueue,
  cookieQueue,
  imageQueue
};