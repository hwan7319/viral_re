module.exports = {
  apps: [
    {
      name: 'viral-re',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '800M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
