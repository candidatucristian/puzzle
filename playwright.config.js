import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

const localChrome = process.platform === 'win32' && existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe');
const channel = !process.env.CI && localChrome ? 'chrome' : undefined;
export default defineConfig({
  testDir: './tests/browser', timeout: 45000, fullyParallel: false, workers: 1,
  // on CI the GitHub reporter turns each failure into a check annotation, so
  // the failing test and its error are readable without downloading the log
  reporter: process.env.CI
    ? [['list'], ['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:5174',
    trace: 'retain-on-failure', screenshot: 'only-on-failure',
  },
  projects: [
    // the desktop layout: every existing check
    { name: 'desktop', testIgnore: /mobile\.spec\.js/, use: { viewport: { width: 1440, height: 1000 }, channel } },
    // a phone held sideways: the compact layout, touch and the drawers
    { name: 'phone', testMatch: /mobile\.spec\.js/, use: { ...devices['Pixel 7 landscape'], channel } },
  ],
  webServer: {
    command: 'npm run dev -- --port 5174', url: 'http://127.0.0.1:5174',
    reuseExistingServer: false, timeout: 60000,
  },
});
