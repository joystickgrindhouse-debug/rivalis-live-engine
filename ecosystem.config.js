/**
 * PM2 Ecosystem Configuration
 * Optimized for Android Termux low-resource environment
 * Both services run independently with memory restart limits
 */

module.exports = {
  apps: [
    {
      name: 'rivalis-live',
      script: './live-server/server.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      ignore_watch: [
        'node_modules',
        'logs',
      ],
      max_memory_restart: '250M',
      env: {
        NODE_ENV: 'production',
        PORT: 8080,
      },
      error_file: 'logs/live-error.log',
      out_file: 'logs/live-out.log',
      log_file: 'logs/live-combined.log',
      time: true,
      // Graceful shutdown
      kill_timeout: 10000,
      wait_ready: true,
      listen_timeout: 5000,
      shutdown_with_message: true,
    },
    {
      name: 'rivalis-bot',
      script: './discord-bot/bot.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      ignore_watch: [
        'node_modules',
        'logs',
      ],
      max_memory_restart: '150M',
      env: {
        NODE_ENV: 'production',
        BOT_PORT: 5000,
      },
      error_file: 'logs/bot-error.log',
      out_file: 'logs/bot-out.log',
      log_file: 'logs/bot-combined.log',
      time: true,
      // Graceful shutdown
      kill_timeout: 10000,
      wait_ready: true,
      listen_timeout: 5000,
      shutdown_with_message: true,
    },
  ],

  // Global settings
  deploy: {
    production: {
      user: 'node',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'https://github.com/your-repo/rivalis-live-engine.git',
      path: '/var/www/rivalis',
      'post-deploy': 'npm install && pm2 startOrRestart ecosystem.config.js --env production',
    },
  },
};
