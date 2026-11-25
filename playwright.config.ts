import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: 'http://127.0.0.1:3005',
    headless: true,
  },
  webServer: {
    command: 'node dist/src/server.js',
    url: 'http://127.0.0.1:3005/api/health',
    reuseExistingServer: false,
    env: {
      PORT: '3005',
      APP_ORIGIN: 'http://127.0.0.1:3005',
      NODE_ENV: 'test',
    },
  },
});
