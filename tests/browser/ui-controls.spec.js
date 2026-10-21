import { test, expect } from '@playwright/test';
import { evaluateApp } from './app.js';
import { LEVEL_METADATA } from '../../src/levels/metadata.js';

async function open(page) {
  await page.addInitScript(lastIndex => {
    localStorage.setItem('caseFile:letters', JSON.stringify(['invitation']));
    localStorage.setItem('puzzleComfort', JSON.stringify({ motion: 'reduced' }));
    localStorage.setItem('puzzleProgressSchema', '2');
    localStorage.setItem('puzzleUnlockedLevel', String(lastIndex));
    localStorage.setItem('hasPlayedBefore', 'true');
  }, LEVEL_METADATA.length - 1);
  await page.goto('/');
  await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 30000 });
  await evaluateApp(page, ({ ui }) => ui.showGame());
}

test('settings own the arrow keys and nested help restores the same settings session', async ({ page }) => {
  await open(page);
  await evaluateApp(page, ({ ui, services }) => ui.navigate(services.levels.definitions.findIndex(level => level.key === 'TV'), { quick: true }));
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene?.scene.key)).toBe('TV');
  await expect.poll(() => evaluateApp(page, ({ ui }) => ui.busy)).toBe(false);
  const channel = await evaluateApp(page, ({ services }) => {
    const scene = services.levels.activeScene;
    scene._autoTimer.remove(false);
    return scene._channel;
  });

  await page.locator('#vol-slider-ui').focus();
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#vol-slider-ui')).toHaveValue('0.99');
  expect(await evaluateApp(page, ({ services }) => services.levels.activeScene._channel)).toBe(channel);

  await page.locator('#btn-options').click();
  await page.locator('#st-tab-sounds').click();
  await page.locator('#music-slider').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#music-slider')).toHaveValue('0.51');
  await expect(page.locator('#music-slider')).toHaveAttribute('aria-valuetext', '51%');
  expect(await evaluateApp(page, ({ services }) => services.levels.activeScene._channel)).toBe(channel);

  await page.locator('#st-tab-options').click();
  await page.locator('#btn-howto').click();
  expect(await evaluateApp(page, ({ game }) => game.input.keyboard.enabled)).toBe(false);
  await page.keyboard.press('Escape');
  await expect(page.locator('#btn-howto')).toBeFocused();
  await page.locator('#st-tab-sounds').click();
  await expect(page.locator('#music-slider')).toHaveValue('0.51');
  expect(await evaluateApp(page, ({ game }) => game.input.keyboard.enabled)).toBe(false);
  await page.locator('#btn-close-options').click();
  expect(await evaluateApp(page, ({ game }) => game.input.keyboard.enabled)).toBe(true);
  await page.evaluate(() => document.activeElement.blur());
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene._channel)).toBe((channel + 1) % 4);
});

test('leaving reset confirmation cancels it without deleting progress', async ({ page }) => {
  await open(page);
  const completedBefore = await evaluateApp(page, ({ services }) => services.levels.completedCount);
  await page.locator('#btn-options').click();
  await page.locator('#st-tab-options').click();
  await page.locator('#btn-new').click();
  await expect(page.locator('#btn-new')).toHaveClass(/armed/);
  await page.locator('#btn-howto').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#btn-new')).not.toHaveClass(/armed/);
  await page.locator('#btn-new').click();
  await expect(page.locator('#btn-new')).toHaveClass(/armed/);
  expect(await evaluateApp(page, ({ services }) => services.levels.completedCount)).toBe(completedBefore);
  await page.keyboard.press('Tab');
  await expect(page.locator('#btn-new')).not.toHaveClass(/armed/);
  await page.keyboard.press('Escape');
});

test('answer feedback is readable and clears as soon as the player edits or changes rooms', async ({ page }) => {
  await open(page);
  await page.locator('#btn-submit').click();
  await expect(page.locator('#answer-feedback')).toContainText('Enter the answer');
  await expect(page.locator('#level-code')).toBeFocused();
  await page.locator('#level-code').fill('WRONG');
  await page.locator('#btn-submit').click();
  await expect(page.locator('#answer-feedback')).toContainText('does not unlock');
  await expect(page.locator('#level-code')).toHaveAttribute('aria-invalid', 'true');
  await page.locator('#level-code').fill('C');
  await expect(page.locator('#answer-feedback')).toHaveText('');
  await expect(page.locator('#level-code')).toHaveAttribute('aria-invalid', 'false');
  await page.locator('#btn-submit').click();
  await evaluateApp(page, ({ ui }) => ui.navigate(1, { quick: true }));
  await expect(page.locator('#answer-feedback')).toHaveText('');
  await expect(page.locator('#level-code')).toHaveAttribute('aria-invalid', 'false');
});

test('a correct answer uses the original accepted-code transition to the next room', async ({ page }) => {
  await open(page);
  const vertexIndex = await evaluateApp(page, ({ services }) => services.levels.definitions.findIndex(l => l.key === 'Vertex'));
  await evaluateApp(page, ({ ui }, idx) => ui.navigate(idx, { quick: true }), vertexIndex);
  await evaluateApp(page, ({ services }) => {
    services.preferences.setSystemMotion(false);
    services.preferences.set({ motion: 'system' });
    services.audio.playSuccess = () => { window.successSoundAt = performance.now(); };
  });
  expect(await evaluateApp(page, ({ services }) => services.preferences.reducedMotion)).toBe(false);
  await page.locator('#level-code').fill('FACE');
  await page.evaluate(() => { window.answerSubmittedAt = performance.now(); });
  await page.locator('#btn-submit').click();

  await expect(page.locator('#answer-feedback')).toContainText('Opening the next room');
  await expect(page.locator('#level-veil')).toHaveClass(/cover/);
  await expect(page.locator('#veil-caption')).toHaveText('Answer accepted');
  await expect(page.locator('#veil-numeral')).toHaveText('XXX');
  expect(await page.evaluate(() => window.successSoundAt)).toBeDefined();
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.currentIndex), { timeout: 2500 }).toBe(vertexIndex + 1);
  await expect(page.locator('#level-veil')).toHaveClass(/titled/);
  await expect(page.locator('.veil-content')).toBeVisible();
});

test('interface text cannot be selected and clicking the answer field adds no focus frame', async ({ page }) => {
  await open(page);
  const selectionStyles = await page.locator('#btn-submit').evaluate(element => ({
    body: getComputedStyle(document.body).userSelect,
    text: getComputedStyle(element).userSelect,
    input: getComputedStyle(document.querySelector('#level-code')).userSelect,
  }));
  expect(selectionStyles).toEqual({ body: 'none', text: 'none', input: 'none' });

  const answer = page.locator('#level-code');
  const unfocusedStyles = await answer.evaluate(element => {
    const style = getComputedStyle(element);
    return { borderColor: style.borderLeftColor, backgroundColor: style.backgroundColor };
  });
  await answer.click();
  const focusedStyles = await answer.evaluate(element => {
    const style = getComputedStyle(element);
    return { borderColor: style.borderLeftColor, backgroundColor: style.backgroundColor, outlineStyle: style.outlineStyle };
  });
  expect(focusedStyles).toEqual({ ...unfocusedStyles, outlineStyle: 'none' });
  await answer.fill('CABBAGE');
  await expect(answer).toHaveValue('CABBAGE');
});

test('comfort dropdowns have no focus frame and still change their settings', async ({ page }) => {
  await open(page);
  await page.locator('#btn-options').click();

  // Test reading size segmented buttons on Options tab
  await page.locator('#st-tab-options').click();
  const sizeButton = page.locator('#reading-size [data-scale="1.15"]');
  const unfocused = await sizeButton.evaluate(el => ({
    outlineStyle: getComputedStyle(el).outlineStyle,
    boxShadow: getComputedStyle(el).boxShadow,
  }));
  await sizeButton.focus();
  const focused = await sizeButton.evaluate(el => ({
    outlineStyle: getComputedStyle(el).outlineStyle,
    boxShadow: getComputedStyle(el).boxShadow,
  }));
  expect(focused).toEqual({ ...unfocused, outlineStyle: 'none', boxShadow: 'none' });
  await sizeButton.click();
  await expect(sizeButton).toHaveAttribute('aria-checked', 'true');
  expect(await evaluateApp(page, ({ services }) => services.preferences.state.textScale)).toBe(1.15);

  // Test language dropdown on Options tab (must have no focus frame/border and proper spacing)
  const langSelect = page.locator('#language-select');
  await langSelect.focus();
  const langFocused = await langSelect.evaluate(el => ({
    outlineStyle: getComputedStyle(el).outlineStyle,
    boxShadow: getComputedStyle(el).boxShadow,
  }));
  expect(langFocused.outlineStyle).toBe('none');
  expect(langFocused.boxShadow).toBe('none');

  await langSelect.click();
  const langClicked = await langSelect.evaluate(el => ({
    outlineStyle: getComputedStyle(el).outlineStyle,
    boxShadow: getComputedStyle(el).boxShadow,
  }));
  expect(langClicked.outlineStyle).toBe('none');
  expect(langClicked.boxShadow).toBe('none');

  const rowsGap = await page.evaluate(() => {
    const rows = document.querySelectorAll('#st-panel-options .st-choice');
    if (rows.length < 2) return 0;
    return rows[1].getBoundingClientRect().top - rows[0].getBoundingClientRect().bottom;
  });
  expect(rowsGap).toBeGreaterThanOrEqual(10);

  // Test motion setting switch on Video tab
  await page.locator('#st-tab-video').click();
  const motionSwitch = page.locator('#motion-setting');
  await motionSwitch.focus();
  await motionSwitch.click();
  expect(await evaluateApp(page, ({ services }) => services.preferences.reducedMotion)).toBe(false);
});
