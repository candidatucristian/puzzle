import { test, expect } from '@playwright/test';

test('mobile devices are shown the desktop-only notice and Phaser is not booted', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'userAgent', { get: () => 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15' });
    Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 5 });
  });
  await page.goto('/');
  await expect(page.locator('#desktop-only')).toBeVisible();
  await expect(page.locator('#desktop-only-title')).toHaveText('Ashcombe Manor');
  await expect(page.locator('.desktop-only-msg')).toBeVisible();
  await expect(page.locator('#game-container canvas')).toHaveCount(0);
});

