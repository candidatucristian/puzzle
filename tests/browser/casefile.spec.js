import {test, expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {evaluateApp} from './app.js';
import {en} from '../../src/locales/en.js';
import {ro} from '../../src/locales/ro.js';
import {ru} from '../../src/locales/ru.js';

const ids = ['invitation', 'ivy', 'silas', 'orion', 'last'];
const modal = '#casefile-modal';
async function open(page, {letters = ids, read = letters, language = 'en', textScale = 1, solved = []} = {}) {
  await page.addInitScript(({letters, read, language, textScale}) => {
    localStorage.setItem('caseFile:letters', JSON.stringify(letters));
    localStorage.setItem('caseFile:read', JSON.stringify(read));
    localStorage.setItem('caseFile:seen', '[]');
    localStorage.setItem('puzzleLanguage', language);
    localStorage.setItem('puzzleComfort', JSON.stringify({motion: 'reduced', ambientEffects: false, textScale}));
    localStorage.setItem('hasPlayedBefore', 'true');
    localStorage.setItem('house:entered', 'true');
  }, {letters, read, language, textScale});
  await page.goto('/');
  await expect(page.locator('#loading-screen')).toHaveCount(0, {timeout: 30000});
  await evaluateApp(page, ({ui, services}, solved) => {
    ui.showGame();
    for (const index of solved) { services.progress.unlock(index); services.progress.complete(index); }
    services.levels.enterHall();
  }, solved);
  await page.locator('#btn-casefile').click();
  await expect(page.locator(modal)).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}
async function screenshot(page, name) {
  mkdirSync('.artifacts/casefile-redesign', {recursive: true});
  await page.screenshot({path: `.artifacts/casefile-redesign/${name}.png`});
}
async function geometry(page) {
  return page.locator(modal).evaluate(el => {
    const rect = selector => el.querySelector(selector).getBoundingClientRect();
    const inside = (child, parent) => child.left >= parent.left - 1 && child.right <= parent.right + 1 && child.top >= parent.top - 1 && child.bottom <= parent.bottom + 1;
    const left = rect('.is-left'), right = rect('.is-right'), file = rect('.dossier');
    return {
      stampInside: inside(rect('.dossier-stamp'), left),
      tabsInside: inside(rect('.dossier-tabs'), left),
      inViewport: inside(file, {left: 0, top: 0, right: innerWidth, bottom: innerHeight}),
      overflow: [...el.querySelectorAll('.dossier, .dossier-page, .dossier-index, .dossier-reading, .evidence-tags')]
        .filter(node => node.getClientRects().length && node.scrollWidth > node.clientWidth + 1).map(node => node.className),
      readingWidth: right.width,
      titleOnPaper: inside(rect('.dossier-head'), left),
      unpaperedText: (() => {
        const nodes = document.createTreeWalker(el.querySelector('.dossier'), NodeFilter.SHOW_TEXT);
        const found = [];
        while (nodes.nextNode()) {
          const node = nodes.currentNode;
          if (node.textContent.trim() && !node.parentElement.closest('.dossier-page')) found.push(node.textContent.trim());
        }
        return found;
      })(),
      framedIndexRows: [...el.querySelectorAll('.dossier-slip, .dossier-room')].filter(node => {
        const style = getComputedStyle(node);
        return ['borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth'].some(key => parseFloat(style[key]) > 0) || style.boxShadow !== 'none';
      }).map(node => node.textContent.trim()),
      wordsOnPage: !el.querySelector('.letter-words')?.getClientRects().length || (() => {const words = rect('.letter-words'); return words.left >= right.left + 16 && words.right <= right.right - 16;})(),
    };
  });
}
async function assertGeometry(page) {
  expect(await geometry(page)).toMatchObject({stampInside: true, tabsInside: true, inViewport: true, overflow: [], wordsOnPage: true, titleOnPaper: true, unpaperedText: [], framedIndexRows: []});
}

test('each filed letter fits the large sheet without seals, extra paper or lost paragraphs', async ({page}) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await open(page);
  for (const id of ids) {
    await page.locator(`[data-letter="${id}"]`).click();
    await expect(page.locator('#casefile-document-title')).toHaveText(en.letters[id].title);
    await expect(page.locator(`${modal} .letter-para`)).toHaveText(en.letters[id].body);
    await expect(page.locator(`${modal} .letter-paper, ${modal} .letter-wax, ${modal} .slip-clip`)).toHaveCount(0);
    await expect(page.locator(`[data-letter="${id}"]`)).toHaveAttribute('aria-current', 'true');
    await assertGeometry(page);
    const scrolling = await page.locator('.dossier-reading').evaluate(el => el.scrollHeight - el.clientHeight);
    expect(scrolling, `${id} should be readable without scrolling at 1440×1000`).toBeLessThanOrEqual(2);
  }
  expect((await geometry(page)).readingWidth).toBeGreaterThan(800);
  await page.locator('[data-letter="invitation"]').click();
  await screenshot(page, 'desktop-letters');
  await page.setViewportSize({width: 1920, height: 1080});
  await assertGeometry(page);
  await screenshot(page, 'wide-letters');
  await page.setViewportSize({width: 1280, height: 720});
  await assertGeometry(page);
  await expect(page.locator('[data-letter="last"]')).toBeInViewport();
  await page.locator('.dossier-reading').evaluate(el => {el.scrollTop = el.scrollHeight;});
  await expect(page.locator(`${modal} .letter-margin`)).toBeInViewport();
  await screenshot(page, 'compact-letters-end');
  await page.locator('[data-letter="ivy"]').click();
  expect(await page.locator('.dossier-reading').evaluate(el => el.scrollTop)).toBe(0);
  expect(errors).toEqual([]);
});

test('evidence can be browsed by room without revealing any unsolved answer', async ({page}) => {
  await open(page, {solved: [0, 4, 10]});
  await expect(page.locator('#casefile-tab-clues')).toHaveAttribute('aria-selected', 'true');
  const evidence = await evaluateApp(page, ({services}) => services.levels.definitions.flatMap((level, index) => services.levels.homeOf(index) ? [{id: level.id, code: level.code, solved: services.levels.isCompleted(index)}] : []));
  await expect(page.locator('.evidence-tag')).toHaveCount(evidence.length);
  for (const entry of evidence) {
    await expect(page.locator(`[data-evidence="${entry.id}"] .tag-word`)).toHaveText(entry.solved ? entry.code : en.casefile.notFound);
  }
  await expect(page.locator('.evidence-tag.is-new')).toHaveCount(3);
  expect(await page.locator('.dossier-room').evaluateAll(nodes => nodes.map(node => node.dataset.room))).toEqual([
    'all', 'Study', 'Room2', 'Room3', 'Room4', 'Room5', 'Room6', 'Upper', 'Room7', 'Room8', 'Top',
  ]);
  await assertGeometry(page);
  await screenshot(page, 'evidence-all');
  await page.locator('[data-room="Study"]').click();
  await expect(page.locator('.evidence-tag')).toHaveCount(3);
  await expect(page.locator('#casefile-evidence-title')).toHaveText(en.places.Study.name);
  await expect(page.locator('#casefile-clue-count')).toHaveText('Evidence 1 of 3');
  await expect(page.locator('[data-room="Study"]')).toBeFocused();
  await screenshot(page, 'evidence-room');
  await page.locator('[data-room="all"]').click();
  await expect(page.locator('.evidence-tag')).toHaveCount(evidence.length);
  await page.locator('#btn-close-casefile').click();
  await page.locator('#btn-casefile').click();
  await expect(page.locator('.evidence-tag.is-new')).toHaveCount(0);
  await expect(page.locator('#btn-casefile')).not.toHaveClass(/has-news/);
});

test('an empty file and waiting letters have no invented document or story spoiler', async ({page}) => {
  await open(page, {letters: ['ivy'], read: []});
  await expect(page.locator('.dossier-empty')).toHaveText(en.casefile.noLetters);
  await expect(page.locator('.dossier-slip.is-missing')).toHaveCount(5);
  await expect(page.locator('#casefile-letter-count')).toHaveText('0 of 5 filed');
  await expect(page.locator('#casefile-reader')).not.toContainText(en.letters.ivy.body[0]);
  await assertGeometry(page);
  await screenshot(page, 'empty-file');
});

test('tabs work with the keyboard, trap focus and restore focus to the opener', async ({page}) => {
  await open(page);
  await page.locator('#casefile-tab-letters').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#casefile-tab-clues')).toBeFocused();
  await expect(page.locator('#casefile-letters-panel')).toBeHidden();
  await expect(page.locator('#casefile-evidence-panel')).toBeVisible();
  await page.keyboard.press('Home');
  await expect(page.locator('#casefile-tab-letters')).toBeFocused();
  await expect(page.locator('#casefile-letters-panel')).toBeVisible();
  await page.locator('#btn-close-casefile').focus();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('.dossier-reading')).toBeFocused();
  expect(await evaluateApp(page, ({game}) => game.input.keyboard.enabled)).toBe(false);
  await page.keyboard.press('Escape');
  await expect(page.locator(modal)).toBeHidden();
  await expect(page.locator('#btn-casefile')).toBeFocused();
  expect(await evaluateApp(page, ({game}) => game.input.keyboard.enabled)).toBe(true);
});

test('Romanian and Russian stay inside their pages at the largest text size and compact dimensions', async ({page}) => {
  await page.setViewportSize({width: 1100, height: 720});
  await open(page, {language: 'ro', textScale: 1.3});
  for (const [language, locale] of [['ro', ro], ['ru', ru]]) {
    await evaluateApp(page, ({services}, language) => services.i18n.setLanguage(language), language);
    for (const id of ids) {
      await page.locator(`[data-letter="${id}"]`).click();
      await expect(page.locator(`${modal} .letter-para`)).toHaveText(locale.letters[id].body);
      await assertGeometry(page);
      await page.locator('.dossier-reading').focus();
      await page.keyboard.press('Control+End');
      const last = page.locator(`${modal} .letter-words > :last-child`);
      await expect(last).toBeInViewport();
    }
    await screenshot(page, `${language}-large-text`);
    await page.locator('#casefile-tab-clues').click();
    await assertGeometry(page);
    await expect(page.locator('[data-room="all"] .room-name')).toHaveText(locale.casefile.allRooms);
    await page.locator('#casefile-tab-letters').click();
  }
});

test('an arriving letter keeps its own paper and wax and can still be filed', async ({page}) => {
  await open(page, {letters: ['invitation']});
  await page.keyboard.press('Escape');
  await page.evaluate(async () => {
    const [{Scope}, {playArrival}, {LETTERS}] = await Promise.all([
      import('/src/shared/Scope.js'), import('/src/ui/letterArrival.js'), import('/src/shared/story.js'),
    ]);
    window.casefileArrivalScope = new Scope();
    window.casefileArrival = playArrival(window.casefileArrivalScope, {letter: LETTERS[1], reducedMotion: true, target: document.querySelector('#btn-casefile')});
  });
  await expect(page.locator('.arrival')).toHaveAttribute('data-state', 'waiting');
  await page.locator('.env').click();
  await expect(page.locator('.arrival')).toHaveAttribute('data-state', 'reading');
  await expect(page.locator('.arrival .letter-page')).toHaveAttribute('data-material', 'ready');
  await expect(page.locator('.arrival .letter-paper')).toHaveCount(1);
  await expect(page.locator('.arrival .letter-wax')).toHaveCount(1);
  await page.locator('.arrival-file').click();
  await expect(page.locator('.arrival')).toHaveCount(0);
  expect(await page.evaluate(() => window.casefileArrival)).toBe('read');
  await page.evaluate(() => window.casefileArrivalScope.dispose());
});
