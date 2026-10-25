import { test, expect } from '@playwright/test';
import { evaluateApp } from './app.js';

// Three letters found, the first already read: two wait in the side panel.
async function boot(page, { reduced = false } = {}) {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(reduced => {
    localStorage.setItem('caseFile:letters', JSON.stringify(['invitation', 'ivy', 'silas']));
    localStorage.setItem('caseFile:read', JSON.stringify(['invitation']));
    localStorage.setItem('puzzleComfort', JSON.stringify({ motion: reduced ? 'reduced' : 'system', ambientEffects: false }));
    localStorage.setItem('hasPlayedBefore', 'true'); localStorage.setItem('house:entered', 'true');
  }, reduced);
  await page.goto('/');
  await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 30000 });
  await evaluateApp(page, ({ ui, services }) => { ui.showGame(); services.levels.enterHall(); });
  await expect(page.locator('.waiting-letter')).toHaveCount(2);
}
const read = page => page.evaluate(() => JSON.parse(localStorage.getItem('caseFile:read')));
const missing = response => /CaseFile\/letter\/|video\/letter-/.test(response.url()) && response.status() >= 400;

test('a letter waiting in the side panel goes onto the desk, is opened there, and is filed once', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (missing(response)) errors.push(`${response.status()} ${response.url()}`); });
  await boot(page);
  await expect(page.locator('.waiting-letter img.wl-envelope').first()).toHaveAttribute('src', /CaseFile\/letter\/envelope-sealed\.webp$/);
  await page.locator('.waiting-letter').first().click();
  await expect(page.locator('.arrival')).toHaveCount(1);
  await expect(page.locator('.waiting-letter.is-in-flight')).toHaveCount(1);
  await expect(page.locator('.arrival .film-first')).toHaveAttribute('src', /CaseFile\/letter\/letter-first\.webp$/);
  // opened by itself (the panel's click was the asking): the film plays, then the words are laid on its paper
  await expect(page.locator('.arrival')).toHaveAttribute('data-state', 'opening', { timeout: 8000 });
  await expect.poll(() => page.locator('.arrival .film-open').evaluate(film => film.currentTime), { timeout: 8000 }).toBeGreaterThan(1);
  await expect(page.locator('.arrival')).toHaveAttribute('data-state', 'reading', { timeout: 15000 });
  expect(await page.locator('.arrival .film-open').evaluate(film => film.ended)).toBe(true);
  await expect(page.locator('.arrival .letter-words')).toContainText('Ivy');
  await expect(page.locator('.arrival .letter-wax')).toHaveCount(0);
  // not filed until it is filed
  expect(await read(page)).toEqual(['invitation']);
  await page.keyboard.press('Tab');
  await expect(page.locator('.arrival-file')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.arrival')).toHaveAttribute('data-state', 'filing');
  // more keys while it goes change nothing
  await page.keyboard.press('Enter'); await page.keyboard.press('Escape');
  // folded up again: the film backward
  await expect.poll(() => page.locator('.arrival .film-fold').evaluate(film => film.currentTime), { timeout: 4000 }).toBeGreaterThan(0.3);
  await expect(page.locator('.arrival')).toHaveCount(0, { timeout: 8000 });
  await expect(page.locator('.waiting-letter')).toHaveCount(1);
  expect(await read(page)).toEqual(['invitation', 'ivy']);
  await expect(page.locator('#btn-casefile')).toBeFocused();
  expect(errors).toEqual([]);
});

test('a letter that comes by itself waits on the desk, and can be put away for later', async ({ page }) => {
  await boot(page);
  await page.evaluate(async () => {
    const [{ Scope }, { playArrival }, { LETTERS }] = await Promise.all([
      import('/src/shared/Scope.js'), import('/src/ui/letterArrival.js'), import('/src/shared/story.js'),
    ]);
    window.arrivalScope = new Scope();
    window.arrival = playArrival(window.arrivalScope, { letter: LETTERS[2], target: document.querySelector('#btn-casefile') });
  });
  await expect(page.locator('.arrival')).toHaveAttribute('data-state', 'waiting', { timeout: 8000 });
  await expect(page.locator('.arrival .env')).toBeFocused();
  await expect(page.locator('.arrival .film-first')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.arrival')).toHaveCount(0, { timeout: 4000 });
  expect(await page.evaluate(() => window.arrival)).toBe('later');
  expect(await read(page)).toEqual(['invitation']);
  await page.evaluate(() => window.arrivalScope.dispose());
});

test('without its film the letter is still there to be read and filed', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/CaseFile/letter/**', route => route.abort());
  await page.route('**/assets/video/letter-*', route => route.abort());
  await boot(page);
  await page.locator('.waiting-letter').first().click();
  await expect(page.locator('.arrival')).toHaveAttribute('data-state', 'reading', { timeout: 12000 });
  await expect(page.locator('.arrival .letter-words')).toContainText('Ivy');
  await page.locator('.arrival-file').click();
  await expect(page.locator('.arrival')).toHaveCount(0, { timeout: 4000 });
  expect(await read(page)).toEqual(['invitation', 'ivy']);
  expect(errors).toEqual([]);
});
