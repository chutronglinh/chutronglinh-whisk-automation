import Bull from 'bull';

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined
};

export const profileQueue = new Bull('profile-setup', { redis: redisConfig });
export const cookieQueue = new Bull('cookie-extract', { redis: redisConfig });
export const projectQueue = new Bull('project-creation', { redis: redisConfig });
export const imageQueue = new Bull('image-generation', { redis: redisConfig });

// Clean completed jobs after 24 hours
const cleanOptions = { grace: 24 * 3600 * 1000 };

profileQueue.on('completed', () => profileQueue.clean(cleanOptions.grace));
cookieQueue.on('completed', () => cookieQueue.clean(cleanOptions.grace));
projectQueue.on('completed', () => projectQueue.clean(cleanOptions.grace));
imageQueue.on('completed', () => imageQueue.clean(cleanOptions.grace));