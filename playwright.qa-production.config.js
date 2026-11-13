import { defineConfig } from '@playwright/test';
import qa from './playwright.qa.config.js';

export default defineConfig({
  ...qa,
  reporter: [['list'], ['json', { outputFile: '.artifacts/qa-2026-11-06/production-results.json' }],
    ['html', { open: 'never', outputFolder: '.artifacts/qa-2026-11-06/production-report' }]],
  outputDir: '.artifacts/qa-2026-11-06/production-results',
  use: { ...qa.use, baseURL: 'http://127.0.0.1:4187/puzzle/' },
  projects: [{ name: 'production' }],
  webServer: { command: 'npm run build -- --outDir .artifacts/qa-2026-11-06/production && node scripts/serve-build.js --directory .artifacts/qa-2026-11-06/production --port 4187',
    url: 'http://127.0.0.1:4187/puzzle/', reuseExistingServer: false, timeout: 120000 },
});
