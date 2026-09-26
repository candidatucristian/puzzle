import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

const localChrome = process.platform === 'win32' && existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe');
export default defineConfig({
  testDir: './tests/production', timeout: 180000, workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report/production' }]],
  outputDir: 'test-results/production',
  use: {
    baseURL: 'http://127.0.0.1:4173', viewport: { width: 1440, height: 1000 },
    channel: !process.env.CI && localChrome ? 'chrome' : undefined,
    trace: 'retain-on-failure', screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node scripts/serve-build.js', url: 'http://127.0.0.1:4173/puzzle/',
    reuseExistingServer: false, timeout: 30000,
  },
});
