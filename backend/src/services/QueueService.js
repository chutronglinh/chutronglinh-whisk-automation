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

// Project creation queue
export const projectQueue = new Queue('project-creation', { 
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 3000
    },
    removeOnComplete: 50,
    removeOnFail: 50
  }
});

// Image generation queue
export const imageGenerationQueue = new Queue('image-generation', { 
  redis: redisConfig,
  defaultJobOptions: {
    attempts: parseInt(process.env.JOB_ATTEMPTS || '3'),
    backoff: {
      type: 'exponential',
      delay: parseInt(process.env.JOB_BACKOFF_DELAY || '5000')
    },
    timeout: parseInt(process.env.IMAGE_GENERATION_TIMEOUT || '120000'),
    removeOnComplete: 100,
    removeOnFail: 100
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

  queue.on('stalled', (job) => {
    console.warn(`[${name}] Job ${job.id} stalled`);
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