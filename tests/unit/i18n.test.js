import test from 'node:test';
import assert from 'node:assert/strict';
import { I18n, I18N_STORAGE_KEY } from '../../src/core/i18n.js';

function memory(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem(key) { return store.has(key) ? store.get(key) : null; },
    setItem(key, value) { store.set(key, String(value)); },
    removeItem(key) { store.delete(key); },
  };
}

test('i18n defaults to en and translates basic keys', () => {
  const i18n = new I18n(memory());
  assert.equal(i18n.language, 'en');
  assert.equal(i18n.t('common.submit'), 'Submit');
  assert.equal(i18n.t('common.back'), 'Back');
});

test('i18n parameter interpolation works as expected', () => {
  const i18n = new I18n(memory());
  assert.equal(i18n.t('hints.revealedCount', { revealed: 1, total: 2 }), '1 of 2 hints revealed');
});

test('i18n switches to ro, persists to storage, and notifies subscribers', () => {
  const storage = memory();
  const i18n = new I18n(storage);
  let notifiedLang = null;
  const unsubscribe = i18n.subscribe(lang => { notifiedLang = lang; });

  i18n.setLanguage('ro');
  assert.equal(i18n.language, 'ro');
  assert.equal(notifiedLang, 'ro');
  assert.equal(storage.getItem(I18N_STORAGE_KEY), 'ro');
  assert.equal(i18n.t('common.submit'), 'Trimite');
  assert.equal(i18n.t('common.back'), 'Înapoi');
  assert.equal(i18n.t('hints.revealedCount', { revealed: 1, total: 2 }), '1 din 2 indicii dezvăluite');

  unsubscribe();
  i18n.setLanguage('en');
  assert.equal(notifiedLang, 'ro'); // listener was unsubscribed
  assert.equal(i18n.language, 'en');
});

test('i18n restores stored language on startup', () => {
  const storage = memory({ [I18N_STORAGE_KEY]: 'ro' });
  const i18n = new I18n(storage);
  assert.equal(i18n.language, 'ro');
  assert.equal(i18n.t('common.submit'), 'Trimite');
});

test('i18n retrieves translated hints and places', () => {
  const i18n = new I18n(memory());
  assert.ok(i18n.getHint('binarytree', 0).includes('THE ROOTS GROW UPWARDS'));
  i18n.setLanguage('ro');
  assert.ok(i18n.getHint('binarytree', 0).includes('RĂDĂCINILE CRESC ÎN SUS'));
  const placeRo = i18n.getPlace('Hall');
  assert.equal(placeRo.name, 'Holul Botanicii');

  i18n.setLanguage('ru');
  assert.equal(i18n.t('common.submit'), 'Отправить');
  assert.ok(i18n.getHint('binarytree', 0).includes('КОРНИ РАСТУТ ВВЕРХ'));
  const placeRu = i18n.getPlace('Hall');
  assert.equal(placeRu.name, 'Зал ботаники');
});

test('i18n retrieves translated intro, opening, letters, case report, and manor story', () => {
  const i18n = new I18n(memory());

  // EN defaults
  assert.equal(i18n.getOpening().page.title, 'The Ashcombe Case');
  assert.equal(i18n.getLetter('invitation').title, 'The letter on the desk');
  assert.equal(i18n.getChapters()[1][0], 'Chapter I');
  assert.ok(i18n.getManorStory()[0].lines[0].includes('This was the house'));

  // RO translations
  i18n.setLanguage('ro');
  assert.equal(i18n.getOpening().page.title, 'Cazul Ashcombe');
  assert.equal(i18n.getLetter('invitation').title, 'Scrisoarea de pe birou');
  assert.equal(i18n.getChapters()[1][0], 'Capitolul I');
  assert.ok(i18n.getManorStory()[0].lines[0].includes('Acesta a fost conacul'));
  assert.equal(i18n.t('intro.playFilm'), 'Redă filmul introductiv');
  assert.equal(i18n.t('prologue.tonight'), 'În această seară');

  // RU translations
  i18n.setLanguage('ru');
  assert.equal(i18n.getOpening().page.title, 'Дело Эшкомб');
  assert.equal(i18n.getLetter('invitation').title, 'Письмо на столе');
  assert.equal(i18n.getChapters()[1][0], 'Глава I');
  assert.ok(i18n.getManorStory()[0].lines[0].includes('Это было поместье'));
  assert.equal(i18n.t('intro.playFilm'), 'Воспроизвести вступительный фильм');
  assert.equal(i18n.t('prologue.tonight'), 'Сегодня вечером');
});

