module.exports = {
  apps: [
    {
      name: 'uc-central-backend',
      script: './backend/server.js',
      instances: 'max', // Spawns an instance per available CPU core
      exec_mode: 'cluster', // Enables Node PM2 cluster load balancer
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development',
        PORT: 5000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      merge_logs: true
    }
  ]
};
