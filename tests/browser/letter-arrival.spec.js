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
  // (a letter clicked while the hall is still coming in is not taken up)
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.loading)).toBe(false);
}
const read = page => page.evaluate(() => JSON.parse(localStorage.getItem('caseFile:read')));
const missing = response => /CaseFile\/letter\//.test(response.url()) && response.status() >= 400;

test('a page waiting in the side panel is lifted into view, read there, and filed once', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (missing(response)) errors.push(`${response.status()} ${response.url()}`); });
  await boot(page);
  // each waits as its own paper, small: Ivy's garden-book page, Silas's note-book page
  await expect(page.locator('.waiting-letter img.wl-page').first()).toHaveAttribute('src', /CaseFile\/letter\/held\/ivy-icon\.webp$/);
  await expect(page.locator('.waiting-letter img.wl-page').nth(1)).toHaveAttribute('src', /CaseFile\/letter\/held\/silas-icon\.webp$/);
  await page.locator('.waiting-letter').first().click();
  await expect(page.locator('.arrival')).toHaveCount(1);
  await expect(page.locator('.arrival')).toHaveAttribute('data-page', 'ivy');
  await expect(page.locator('.waiting-letter.is-in-flight')).toHaveCount(1);
  // no envelope, no 3D scene: the Cycles film of it being lifted into view, then the still
  await expect(page.locator('.arrival .env, .arrival canvas')).toHaveCount(0);
  await expect(page.locator('.arrival .arrival-still')).toHaveAttribute('src', /held\/ivy\.webp$/);
  await expect(page.locator('.arrival .arrival-film')).toHaveAttribute('src', /^blob:/);
  await expect(page.locator('.arrival')).toHaveAttribute('data-state', 'reading', { timeout: 10000 });
  await expect(page.locator('.arrival .arrival-film')).toBeHidden();
  await page.setViewportSize({ width: 1100, height: 800 });
  await expect(page.locator('.arrival .letter-page.is-writing')).toHaveCount(0, { timeout: 4000 });
  await expect(page.locator('.arrival .letter-words')).toContainText('Ivy');
  await expect(page.locator('.arrival .letter-wax')).toHaveCount(0);
  // the words lie inside the paper
  const [desk, words] = await Promise.all(['.arrival-scene', '.arrival .letter-sheet'].map(s => page.locator(s).boundingBox()));
  expect(words.x).toBeGreaterThan(desk.x); expect(words.x + words.width).toBeLessThan(desk.x + desk.width);
  expect(words.y).toBeGreaterThan(desk.y); expect(words.y + words.height).toBeLessThan(desk.y + desk.height);
  // not filed until it is filed
  expect(await read(page)).toEqual(['invitation']);
  await page.keyboard.press('Tab');
  await expect(page.locator('.arrival-file')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.arrival')).toHaveAttribute('data-state', 'filing');
  // more keys while it goes change nothing
  await page.keyboard.press('Enter'); await page.keyboard.press('Escape');
  await expect(page.locator('.arrival')).toHaveCount(0, { timeout: 8000 });
  await expect(page.locator('.waiting-letter')).toHaveCount(1);
  expect(await read(page)).toEqual(['invitation', 'ivy']);
  await expect(page.locator('#btn-casefile')).toBeFocused();
  expect(errors).toEqual([]);
});

test('Escape while a page is being lifted shows it at rest at once', async ({ page }) => {
  await boot(page);
  await page.locator('.waiting-letter').first().click();
  await expect(page.locator('.arrival')).toHaveAttribute('data-state', 'arriving', { timeout: 8000 });
  await page.keyboard.press('Escape');
  await expect(page.locator('.arrival')).toHaveAttribute('data-state', 'reading', { timeout: 1500 });
  expect(await read(page)).toEqual(['invitation']);
});

test('the last letter comes on the house\'s note paper', async ({ page }) => {
  await boot(page);
  await page.evaluate(async () => {
    const [{ Scope }, { playArrival }, { LETTERS }] = await Promise.all([
      import('/src/shared/Scope.js'), import('/src/ui/letterArrival.js'), import('/src/shared/story.js'),
    ]);
    window.arrivalScope = new Scope();
    const last = LETTERS.find(letter => letter.id === 'last');
    window.arrival = playArrival(window.arrivalScope, { letter: last, page: 'last', target: document.querySelector('#btn-casefile') });
  });
  await expect(page.locator('.arrival')).toHaveAttribute('data-page', 'last');
  await expect(page.locator('.arrival')).toHaveAttribute('data-state', 'reading', { timeout: 8000 });
  await expect(page.locator('.arrival .arrival-still')).toHaveAttribute('src', /held\/last\.webp$/);
  await page.evaluate(() => window.arrivalScope.dispose());
  await expect(page.locator('.arrival')).toHaveCount(0);
  expect(await page.evaluate(() => window.arrival)).toBe('later');
});

test('without its pictures the letter is still there to be read and filed', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/CaseFile/letter/held/{ivy,silas,orion,last}.webp', route => route.abort());
  await boot(page);
  await page.locator('.waiting-letter').first().click();
  await expect(page.locator('.arrival')).toHaveAttribute('data-state', 'reading', { timeout: 12000 });
  await expect(page.locator('.arrival')).toHaveClass(/is-plain/);
  await expect(page.locator('.arrival .letter-words')).toContainText('Ivy');
  await page.locator('.arrival-file').click();
  await expect(page.locator('.arrival')).toHaveCount(0, { timeout: 4000 });
  expect(await read(page)).toEqual(['invitation', 'ivy']);
  expect(errors).toEqual([]);
});

test('disposing an arriving letter takes it away and does not file it', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await boot(page);
  await page.evaluate(async () => {
    const [{ Scope }, { playArrival }, { LETTERS }] = await Promise.all([
      import('/src/shared/Scope.js'), import('/src/ui/letterArrival.js'), import('/src/shared/story.js'),
    ]);
    window.arrivalScope = new Scope();
    window.arrival = playArrival(window.arrivalScope, { letter: LETTERS[2], page: LETTERS[2].id, target: document.querySelector('#btn-casefile') });
  });
  await expect(page.locator('.arrival')).toHaveAttribute('data-state', /arriving|reading/, { timeout: 8000 });
  await page.evaluate(() => window.arrivalScope.dispose());
  await expect(page.locator('.arrival')).toHaveCount(0);
  expect(await page.evaluate(() => window.arrival)).toBe('later');
  expect(await read(page)).toEqual(['invitation']);
  expect(errors).toEqual([]);
});
