import Queue from 'bull';

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined
};

// Existing queues
export const loginQueue = new Queue('manual-login', { redis: redisConfig });
export const simpleLoginQueue = new Queue('simple-login', { redis: redisConfig });
export const cookieQueue = new Queue('cookie-extraction', { redis: redisConfig });
export const profileQueue = new Queue('profile-setup', { redis: redisConfig });
export const projectQueue = new Queue('project-creation', { redis: redisConfig });

// New queue for image generation
export const imageGenerationQueue = new Queue('image-generation', { 
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 100      // Keep last 100 failed jobs
  }
});

// Queue event logging
const setupQueueLogging = (queue, name) => {
  queue.on('error', (error) => {
    console.error(`[${name}] Queue error:`, error);
  });

  queue.on('waiting', (jobId) => {
    console.log(`[${name}] Job ${jobId} is waiting`);
  });

  queue.on('active', (job) => {
    console.log(`[${name}] Job ${job.id} started processing`);
  });

  queue.on('completed', (job, result) => {
    console.log(`[${name}] Job ${job.id} completed`);
  });

  queue.on('failed', (job, err) => {
    console.error(`[${name}] Job ${job.id} failed:`, err.message);
  });
};

// Setup logging for all queues
setupQueueLogging(loginQueue, 'LOGIN');
setupQueueLogging(simpleLoginQueue, 'SIMPLE-LOGIN');
setupQueueLogging(cookieQueue, 'COOKIE');
setupQueueLogging(profileQueue, 'PROFILE');
setupQueueLogging(projectQueue, 'PROJECT');
setupQueueLogging(imageGenerationQueue, 'IMAGE-GEN');

console.log('✓ Queue service initialized');