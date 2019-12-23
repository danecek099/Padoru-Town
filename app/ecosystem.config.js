module.exports = {
  apps : [
    {
      name: 'APP 1',
      script: 'server/main.js',
      args: '1',
      instances: 1,
      autorestart: true,
      max_memory_restart: '800M'
    },
    {
      name: 'APP 2',
      script: 'server/main.js',
      args: '2',
      instances: 1,
      autorestart: true,
      max_memory_restart: '800M'
    },
    {
      name: 'APP 3',
      script: 'server/main.js',
      args: '3',
      instances: 1,
      autorestart: true,
      max_memory_restart: '800M'
    },
    {
      name: 'APP 4',
      script: 'server/main.js',
      args: '4',
      instances: 1,
      autorestart: true,
      max_memory_restart: '800M'
    },
  ]
};
