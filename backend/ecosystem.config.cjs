module.exports = {
  apps: [
    // API Server
    {
      name: 'whisk-api',
      script: './src/app.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        MONGODB_URI: 'mongodb://localhost:27017/whisk-automation',
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379
      },
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      merge_logs: true,
      time: true
    },

    // Manual Login Worker (Auto-fill email/password)
    {
      name: 'whisk-worker-login',
      script: './src/workers/ManualLoginWorker.js',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        DISPLAY: ':0',
        MONGODB_URI: 'mongodb://localhost:27017/whisk-automation',
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
        PROFILE_PATH: '/opt/whisk-automation/data/profiles'
      },
      error_file: './logs/worker-login-error.log',
      out_file: './logs/worker-login-out.log',
      merge_logs: true,
      time: true
    },

    // Simple Login Worker (100% Manual)
    {
      name: 'whisk-worker-simple-login',
      script: './src/workers/SimpleLoginWorker.js',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        DISPLAY: ':0',
        MONGODB_URI: 'mongodb://localhost:27017/whisk-automation',
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
        PROFILE_PATH: '/opt/whisk-automation/data/profiles'
      },
      error_file: './logs/worker-simple-login-error.log',
      out_file: './logs/worker-simple-login-out.log',
      merge_logs: true,
      time: true
    },

    // Profile Worker
    {
      name: 'whisk-worker-profile',
      script: './src/workers/ProfileWorker.js',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        DISPLAY: ':0',
        MONGODB_URI: 'mongodb://localhost:27017/whisk-automation',
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
        PROFILE_PATH: '/opt/whisk-automation/data/profiles'
      },
      error_file: './logs/worker-profile-error.log',
      out_file: './logs/worker-profile-out.log',
      merge_logs: true,
      time: true
    },

    // Cookie Worker (Extract session cookies)
    {
      name: 'whisk-worker-cookie',
      script: './src/workers/CookieWorker.js',
      instances: 2,
      env: {
        NODE_ENV: 'production',
        MONGODB_URI: 'mongodb://localhost:27017/whisk-automation',
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
        PROFILE_PATH: '/opt/whisk-automation/data/profiles'
      },
      error_file: './logs/worker-cookie-error.log',
      out_file: './logs/worker-cookie-out.log',
      merge_logs: true,
      time: true
    },

    // Project Worker
    {
      name: 'whisk-worker-project',
      script: './src/workers/ProjectWorker.js',
      instances: 2,
      env: {
        NODE_ENV: 'production',
        MONGODB_URI: 'mongodb://localhost:27017/whisk-automation',
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379
      },
      error_file: './logs/worker-project-error.log',
      out_file: './logs/worker-project-out.log',
      merge_logs: true,
      time: true
    },

    // Image Worker
    {
      name: 'whisk-worker-image',
      script: './src/workers/ImageWorker.js',
      instances: 4,
      env: {
        NODE_ENV: 'production',
        MONGODB_URI: 'mongodb://localhost:27017/whisk-automation',
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379
      },
      error_file: './logs/worker-image-error.log',
      out_file: './logs/worker-image-out.log',
      merge_logs: true,
      time: true
    }
  ]
};