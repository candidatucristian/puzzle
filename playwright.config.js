import { defineConfig } from '@playwright/test';
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
    trace: process.env.CI ? 'retain-on-failure' : 'off', screenshot: 'only-on-failure',
    // the whole house: the dev server runs the Steam demo's limits (DEMO in
    // src/shared/house.js), and the suite tests every room; dev mode lifts them
    // (src/shared/devMode.js), as it does for the one making the game
    storageState: { cookies: [], origins: [{ origin: 'http://127.0.0.1:5174', localStorage: [{ name: 'devMode', value: '1' }] }] },
  },
  projects: [
    // the desktop layout: every test in the suite
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 }, channel } },
  ],
  webServer: {
    command: 'npm run dev -- --port 5174', url: 'http://127.0.0.1:5174',
    reuseExistingServer: !process.env.CI, timeout: 60000,
  },
});
