import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

const chrome = process.platform === 'win32' && existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe');
export default defineConfig({
  testDir: './tests/qa', timeout: 60000, expect: { timeout: 8000 }, workers: 1,
  fullyParallel: false, retries: 0,
  reporter: [['list'], ['json', { outputFile: '.artifacts/qa-2026-11-06/results.json' }],
    ['html', { open: 'never', outputFolder: '.artifacts/qa-2026-11-06/report' }]],
  outputDir: '.artifacts/qa-2026-11-06/results',
  use: { baseURL: 'http://127.0.0.1:5186', channel: chrome ? 'chrome' : undefined,
    viewport: { width: 1440, height: 900 }, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: { command: 'npm run dev -- --port 5186 --strictPort', url: 'http://127.0.0.1:5186',
    reuseExistingServer: !process.env.CI, timeout: 60000 },
});
