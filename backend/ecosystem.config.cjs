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
        PORT: 3000
      },
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '1G'
    },

    // Auto Login Worker (auto-fill email/password)
    {
      name: 'whisk-worker-login',
      script: './src/workers/ManualLoginWorker.js',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        DISPLAY: ':0'
      },
      error_file: './logs/worker-login-error.log',
      out_file: './logs/worker-login-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      autorestart: true,
      max_restarts: 5,
      min_uptime: '10s',
      max_memory_restart: '500M'
    },

    // Simple Manual Login Worker - MỚI (100% manual)
    {
      name: 'whisk-worker-simple-login',
      script: './src/workers/SimpleLoginWorker.js',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        DISPLAY: ':0'
      },
      error_file: './logs/worker-simple-login-error.log',
      out_file: './logs/worker-simple-login-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      autorestart: true,
      max_restarts: 5,
      min_uptime: '10s',
      max_memory_restart: '500M'
    },

    // Profile Setup Worker
    {
      name: 'whisk-worker-profile',
      script: './src/workers/ProfileWorker.js',
      instances: 1,
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/worker-profile-error.log',
      out_file: './logs/worker-profile-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      autorestart: true,
      max_memory_restart: '500M'
    },

    // Cookie Extraction Worker
    {
      name: 'whisk-worker-cookie',
      script: './src/workers/CookieWorker.js',
      instances: 2,
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/worker-cookie-error.log',
      out_file: './logs/worker-cookie-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      autorestart: true,
      max_memory_restart: '500M'
    },

    // Project Creation Worker
    {
      name: 'whisk-worker-project',
      script: './src/workers/ProjectWorker.js',
      instances: 2,
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/worker-project-error.log',
      out_file: './logs/worker-project-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      autorestart: true,
      max_memory_restart: '500M'
    },

    // Image Generation Worker
    {
      name: 'whisk-worker-image',
      script: './src/workers/ImageWorker.js',
      instances: 4,
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/worker-image-error.log',
      out_file: './logs/worker-image-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      autorestart: true,
      max_memory_restart: '800M'
    }
  ]
};