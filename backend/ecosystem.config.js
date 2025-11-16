export default {
  apps: [
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
    {
      name: 'whisk-worker-profile',
      script: './src/workers/ProfileWorker.js',
      instances: 1,
      error_file: './logs/worker-profile-error.log',
      out_file: './logs/worker-profile-out.log',
      autorestart: true
    },
    {
      name: 'whisk-worker-cookie',
      script: './src/workers/CookieWorker.js',
      instances: 2,
      error_file: './logs/worker-cookie-error.log',
      out_file: './logs/worker-cookie-out.log',
      autorestart: true
    },
    {
      name: 'whisk-worker-project',
      script: './src/workers/ProjectWorker.js',
      instances: 2,
      error_file: './logs/worker-project-error.log',
      out_file: './logs/worker-project-out.log',
      autorestart: true
    },
    {
      name: 'whisk-worker-image',
      script: './src/workers/ImageWorker.js',
      instances: 4,
      error_file: './logs/worker-image-error.log',
      out_file: './logs/worker-image-out.log',
      autorestart: true
    }
  ]
};