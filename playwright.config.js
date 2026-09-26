import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

const localChrome = process.platform === 'win32' && existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe');
export default defineConfig({
  testDir: './tests/browser', timeout: 45000, fullyParallel: false, workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:5174', viewport: { width: 1440, height: 1000 },
    channel: !process.env.CI && localChrome ? 'chrome' : undefined,
    trace: 'retain-on-failure', screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --port 5174', url: 'http://127.0.0.1:5174',
    reuseExistingServer: false, timeout: 60000,
  },
});
