module.exports = {
  apps: [
    // API Server (2 instances)
    {
      name: 'whisk-api',
      script: './src/app.js',
      cwd: '/opt/whisk-automation/backend',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        MONGODB_URI: 'mongodb://localhost:27017/whisk-automation',
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
        PROFILE_PATH: '/opt/whisk-automation/data/profiles',
        UPLOAD_PATH: '/opt/whisk-automation/data/uploads',
        OUTPUT_PATH: '/opt/whisk-automation/data/output/images',
        DISPLAY: ':0',
        CHROME_PATH: '/usr/bin/google-chrome'
      },
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    },
    
    // Manual Login Worker (1 instance)
    {
      name: 'whisk-worker-login',
      script: './src/workers/ManualLoginWorker.js',
      cwd: '/opt/whisk-automation/backend',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        MONGODB_URI: 'mongodb://localhost:27017/whisk-automation',
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
        PROFILE_PATH: '/opt/whisk-automation/data/profiles',
        DISPLAY: ':0',
        CHROME_PATH: '/usr/bin/google-chrome'
      },
      error_file: './logs/worker-login-error.log',
      out_file: './logs/worker-login-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    },
    
    // Simple Login Worker (1 instance)
    {
      name: 'whisk-worker-simple-login',
      script: './src/workers/SimpleLoginWorker.js',
      cwd: '/opt/whisk-automation/backend',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        MONGODB_URI: 'mongodb://localhost:27017/whisk-automation',
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
        PROFILE_PATH: '/opt/whisk-automation/data/profiles',
        DISPLAY: ':0',
        CHROME_PATH: '/usr/bin/google-chrome'
      },
      error_file: './logs/worker-simple-login-error.log',
      out_file: './logs/worker-simple-login-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    },
    
    // Profile Setup Worker (1 instance)
    {
      name: 'whisk-worker-profile',
      script: './src/workers/ProfileWorker.js',
      cwd: '/opt/whisk-automation/backend',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        MONGODB_URI: 'mongodb://localhost:27017/whisk-automation',
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
        PROFILE_PATH: '/opt/whisk-automation/data/profiles',
        DISPLAY: ':0',
        CHROME_PATH: '/usr/bin/google-chrome'
      },
      error_file: './logs/worker-profile-error.log',
      out_file: './logs/worker-profile-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    },
    
    // Cookie Extraction Worker (2 instances)
    {
      name: 'whisk-worker-cookie',
      script: './src/workers/CookieWorker.js',
      cwd: '/opt/whisk-automation/backend',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        MONGODB_URI: 'mongodb://localhost:27017/whisk-automation',
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
        PROFILE_PATH: '/opt/whisk-automation/data/profiles',
        DISPLAY: ':0',
        CHROME_PATH: '/usr/bin/google-chrome'
      },
      error_file: './logs/worker-cookie-error.log',
      out_file: './logs/worker-cookie-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    },
    
    // Project Creation Worker (2 instances)
    {
      name: 'whisk-worker-project',
      script: './src/workers/ProjectCreationWorker.js',
      cwd: '/opt/whisk-automation/backend',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        MONGODB_URI: 'mongodb://localhost:27017/whisk-automation',
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379
      },
      error_file: './logs/worker-project-error.log',
      out_file: './logs/worker-project-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    },
    
    // Image Generation Worker (4 instances) ✨ NEW
    {
      name: 'whisk-worker-image',
      script: './src/workers/ImageGenerationWorker.js',
      cwd: '/opt/whisk-automation/backend',
      instances: 4,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        MONGODB_URI: 'mongodb://localhost:27017/whisk-automation',
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
        OUTPUT_PATH: '/opt/whisk-automation/data/output/images',
        IMAGE_MODEL: 'IMAGEN_3_5',
        DEFAULT_ASPECT_RATIO: 'IMAGE_ASPECT_RATIO_LANDSCAPE',
        MEDIA_CATEGORY: 'MEDIA_CATEGORY_BOARD'
      },
      error_file: './logs/worker-image-error.log',
      out_file: './logs/worker-image-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    }
  ]
};