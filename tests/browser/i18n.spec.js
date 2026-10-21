import { test, expect } from '@playwright/test';
import { evaluateApp } from './app.js';

async function open(page) {
  await page.addInitScript(() => {
    localStorage.setItem('caseFile:letters', JSON.stringify(['invitation']));
    localStorage.setItem('caseFile:read', JSON.stringify(['invitation']));
    localStorage.setItem('puzzleComfort', JSON.stringify({ motion: 'reduced' }));
    localStorage.setItem('hasPlayedBefore', 'true');
    localStorage.setItem('house:entered', 'true');
  });
  await page.goto('/');
  await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 30000 });
  await evaluateApp(page, ({ ui, services }) => {
    ui.showGame();
    services.levels.enterHall();
    services.levels.navigate(0);
  });
}

test('i18n switcher dynamically updates UI language and persists preference', async ({ page }) => {
  await open(page);

  // Default is English
  await expect(page.locator('#btn-map [data-i18n="header.map"]')).toHaveText('Map');
  await expect(page.locator('#btn-casefile [data-i18n="header.casefile"]')).toHaveText('Case file');
  await expect(page.locator('#btn-options [data-i18n="header.settings"]')).toHaveText('Settings');
  await expect(page.locator('#btn-submit span')).toHaveText('Submit');

  // Open settings modal and go to Options tab
  await page.locator('#btn-options').click();
  await page.getByRole('tab', { name: 'Options', exact: true }).click();

  // Switch to Romanian via black dropdown
  await page.locator('#language-select').selectOption('ro');
  await expect(page.locator('#language-select')).toHaveValue('ro');

  // Verify UI elements updated immediately to Romanian
  await expect(page.locator('#btn-map [data-i18n="header.map"]')).toHaveText('Hartă');
  await expect(page.locator('#btn-casefile [data-i18n="header.casefile"]')).toHaveText('Dosar');
  await expect(page.locator('#btn-options [data-i18n="header.settings"]')).toHaveText('Setări');
  await expect(page.locator('#btn-submit span')).toHaveText('Trimite');
  await expect(page.locator('#st-panel-options .st-note')).toHaveText('Resetarea șterge tot progresul și reia investigația de la început.');

  const storedLang = await page.evaluate(() => localStorage.getItem('puzzleLanguage'));
  expect(storedLang).toBe('ro');

  // Switch to Russian via black dropdown
  await page.locator('#language-select').selectOption('ru');
  await expect(page.locator('#language-select')).toHaveValue('ru');

  // Verify UI elements updated immediately to Russian
  await expect(page.locator('#btn-map [data-i18n="header.map"]')).toHaveText('Карта');
  await expect(page.locator('#btn-casefile [data-i18n="header.casefile"]')).toHaveText('Дело');
  await expect(page.locator('#btn-options [data-i18n="header.settings"]')).toHaveText('Настройки');
  await expect(page.locator('#btn-submit span')).toHaveText('Отправить');

  const storedLangRu = await page.evaluate(() => localStorage.getItem('puzzleLanguage'));
  expect(storedLangRu).toBe('ru');

  // Switch back to English
  await page.locator('#language-select').selectOption('en');
  await expect(page.locator('#language-select')).toHaveValue('en');
  await expect(page.locator('#btn-map [data-i18n="header.map"]')).toHaveText('Map');
  await expect(page.locator('#btn-submit span')).toHaveText('Submit');

  const storedLangEn = await page.evaluate(() => localStorage.getItem('puzzleLanguage'));
  expect(storedLangEn).toBe('en');

  // Verify dropdown menu opens with SVG flags for all supported languages
  await page.locator('#language-select').click();
  await expect(page.locator('#st-lang-menu')).toBeVisible();
  await expect(page.locator('#st-lang-menu [data-lang="en"] .st-flag-svg')).toBeVisible();
  await expect(page.locator('#st-lang-menu [data-lang="ro"] .st-flag-svg')).toBeVisible();
  await expect(page.locator('#st-lang-menu [data-lang="ru"] .st-flag-svg')).toBeVisible();

  // Selecting via the dropdown menu switches language and closes the menu
  await page.locator('#st-lang-menu [data-lang="ro"]').click();
  await expect(page.locator('#st-lang-menu')).toBeHidden();
  await expect(page.locator('#language-select')).toHaveValue('ro');
  await expect(page.locator('#btn-map [data-i18n="header.map"]')).toHaveText('Hartă');
});

test('hall and room floor names are properly translated in Romanian and Russian', async ({ page }) => {
  await open(page);

  // Set Romanian language
  await evaluateApp(page, ({ services }) => services.i18n.setLanguage('ro'));

  // Go to Hall
  await evaluateApp(page, ({ services }) => services.levels.enterHall());
  const floorEl = page.locator('#header-floor');
  await expect(floorEl.locator('.floor-name')).toHaveText('Holul Botanicii');
  await expect(floorEl.locator('.floor-where')).toHaveCount(0); // not duplicated in its own hall

  // Enter Room I (Study)
  await evaluateApp(page, ({ services }) => services.levels.enterPlace('Study'));
  await expect(floorEl.locator('.floor-name')).toHaveText('Camera I');
  await expect(floorEl.locator('.floor-where')).toHaveText('Botanica'); // translated, NOT "The Botany"

  // Open a puzzle in Room I (BinaryTree)
  await evaluateApp(page, ({ services }) => services.levels.navigate(0));
  await expect(floorEl.locator('.floor-where')).toHaveText('Botanica');

  // Switch to Russian
  await evaluateApp(page, ({ services }) => services.i18n.setLanguage('ru'));
  await evaluateApp(page, ({ services }) => services.levels.enterPlace('Study'));
  await expect(floorEl.locator('.floor-name')).toHaveText('Комната I');
  await expect(floorEl.locator('.floor-where')).toHaveText('Ботаника');

  // Switch to English
  await evaluateApp(page, ({ services }) => services.i18n.setLanguage('en'));
  await expect(floorEl.locator('.floor-name')).toHaveText('Room I');
  await expect(floorEl.locator('.floor-where')).toHaveText('The Botany');
});
