import { test, expect } from '@playwright/test';

test('the opening film and desk work below the deployed subdirectory', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('puzzleComfort', JSON.stringify({ motion: 'reduced' }));
  });
  await page.goto('/puzzle/');
  await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 30000 });
  await expect(page.locator('#intro-video')).toHaveAttribute('data-phase', 'titles');
  await expect.poll(async () => {
    const play = page.locator('.intro-page-play');
    if (await play.isVisible()) {
      await play.click().catch(() => {});
    }
    return page.locator('#intro-video').getAttribute('data-phase');
  }, { timeout: 15000 }).toMatch(/ready|playing/);

  if (await page.locator('#intro-video-play').isVisible()) await page.locator('#intro-video-play').click();
  const film = page.locator('#intro-video video');
  await expect.poll(() => film.evaluate(v => !v.paused && v.currentTime > 0 && v.videoWidth > 0)).toBe(true);
  expect(await film.evaluate(v => new URL(v.currentSrc).pathname)).toBe('/puzzle/assets/video/IntroVideo.mp4');
  await page.locator('.intro-video-skip').click();
  await expect(page.locator('#intro-video')).toHaveCount(0);
  await expect(page.locator('#prologue')).toBeVisible();
  await expect.poll(() => page.locator('.prologue-photo').evaluate(img => img.naturalWidth)).toBeGreaterThan(0);
  expect(await page.locator('.prologue-photo').evaluate(img => new URL(img.src).pathname)).toBe('/puzzle/assets/images/Prologue/inspector-desk-film-match-v2.webp');
  await expect(page.locator('#cold-open')).toHaveCount(0);
});
