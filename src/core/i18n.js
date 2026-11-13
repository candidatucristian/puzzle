import { en } from '../locales/en.js';
import { ro } from '../locales/ro.js';
import { ru } from '../locales/ru.js';
import { zhHans } from '../locales/zh-Hans.js';
import { fr } from '../locales/fr.js';
import { es } from '../locales/es.js';
import { prepareLanguageFonts } from './languageFonts.js';

export const I18N_STORAGE_KEY = 'puzzleLanguage';
export const SUPPORTED_LANGUAGES = Object.freeze(['en', 'ro', 'ru', 'zh-Hans', 'fr', 'es']);
export const DEFAULT_LANGUAGE = 'en';

export function normalizeLanguage(value) {
  if (typeof value !== 'string') return null;
  const name = value.trim().replaceAll('_', '-');
  if (/^(?:schinese|zh(?:-(?:cn|sg|hans(?:-(?:cn|sg))?))?)$/i.test(name)) return 'zh-Hans';
  if (/^(?:french|fr(?:-[a-z]{2})?)$/i.test(name)) return 'fr';
  if (/^(?:spanish|es(?:-(?:[a-z]{2}|\d{3}))?)$/i.test(name)) return 'es';
  return SUPPORTED_LANGUAGES.includes(name) ? name : null;
}

export class I18n {
  #storage;
  #lang;
  #listeners = new Set();
  #locales = { en, ro, ru, 'zh-Hans': zhHans, fr, es };
  #fontRequest = 0;

  constructor(storage) {
    this.#storage = storage;
    const queryLang = normalizeLanguage(typeof location !== 'undefined' ? new URLSearchParams(location.search).get('lang') : null);
    const storedLang = normalizeLanguage(storage?.getItem(I18N_STORAGE_KEY));
    if (queryLang && SUPPORTED_LANGUAGES.includes(queryLang)) {
      this.#lang = queryLang;
    } else if (storedLang && SUPPORTED_LANGUAGES.includes(storedLang)) {
      this.#lang = storedLang;
    } else {
      this.#lang = DEFAULT_LANGUAGE;
    }
    this.#prepareFonts();
  }

  get language() {
    return this.#lang;
  }

  setLanguage(lang) {
    lang = normalizeLanguage(lang);
    if (!SUPPORTED_LANGUAGES.includes(lang) || this.#lang === lang) return;
    this.#lang = lang;
    this.#storage?.setItem(I18N_STORAGE_KEY, lang);
    this.#notify();
    this.#prepareFonts();
  }

  #prepareFonts() {
    const request = ++this.#fontRequest;
    if (this.#lang !== 'zh-Hans') return;
    void prepareLanguageFonts(this.#lang).then(loaded => {
      if (loaded && request === this.#fontRequest) this.#notify();
    });
  }

  t(path, params = {}) {
    if (!path || typeof path !== 'string') return '';
    const keys = path.split('.');
    let val = this.#locales[this.#lang];
    for (const k of keys) {
      val = val?.[k];
      if (val === undefined) break;
    }
    if (val === undefined && this.#lang !== DEFAULT_LANGUAGE) {
      val = this.#locales[DEFAULT_LANGUAGE];
      for (const k of keys) {
        val = val?.[k];
        if (val === undefined) break;
      }
    }
    if (typeof val === 'string') {
      return val.replace(/\{(\w+)\}/g, (match, k) => (params[k] !== undefined ? String(params[k]) : match));
    }
    return val ?? path;
  }

  getHint(levelId, stepIndex) {
    const localeHints = this.#locales[this.#lang]?.levelHints?.[levelId];
    if (localeHints && stepIndex in localeHints) {
      return localeHints[stepIndex];
    }
    const defaultHints = this.#locales[DEFAULT_LANGUAGE]?.levelHints?.[levelId];
    if (defaultHints && stepIndex in defaultHints) {
      return defaultHints[stepIndex];
    }
    return null;
  }

  getLevelName(level) {
    const id = typeof level === 'string' ? level : level?.id;
    return this.#locales[this.#lang]?.levels?.[id]
      ?? this.#locales[DEFAULT_LANGUAGE]?.levels?.[id]
      ?? level?.name ?? id ?? '';
  }

  getInteractionLabel(label) {
    const resistor = /^Look closer at R(\d+)$/.exec(label);
    if (resistor) return this.t('gameplay.resistorClose', { number: resistor[1] });
    return this.#locales[this.#lang]?.interactionLabels?.[label]
      ?? this.#locales[DEFAULT_LANGUAGE]?.interactionLabels?.[label]
      ?? label;
  }

  getPlace(placeKey) {
    const localePlace = this.#locales[this.#lang]?.places?.[placeKey];
    const defaultPlace = this.#locales[DEFAULT_LANGUAGE]?.places?.[placeKey];
    if (!localePlace && !defaultPlace) return null;
    const floor = localePlace?.floor ?? defaultPlace?.floor;
    return {
      name: localePlace?.name ?? defaultPlace?.name,
      floor: floor ? this.getFloorName(floor) : undefined,
      story: localePlace?.story ?? defaultPlace?.story ?? [],
    };
  }

  getFloorName(floorKey) {
    if (!floorKey) return "";
    const raw = String(floorKey).toLowerCase();
    for (const locale of Object.values(this.#locales)) {
      const matched = Object.entries(locale.floors).find(([, value]) => value.toLowerCase() === raw);
      if (matched) return this.t(`floors.${matched[0]}`);
    }
    let key = null;
    if (raw.includes("botan")) key = "botany";
    else if (raw.includes("chem") || raw.includes("chim")) key = "chemistry";
    else if (raw.includes("phys") || raw.includes("fiz")) key = "physics";
    else if (raw.includes("base") || raw.includes("cellar") || raw.includes("subsol") || raw.includes("podval")) key = "basement";

    return key ? this.t(`floors.${key}`) : floorKey;
  }

  getOpening() {
    return this.#locales[this.#lang]?.opening ?? this.#locales[DEFAULT_LANGUAGE]?.opening ?? null;
  }

  getManorStory() {
    return this.#locales[this.#lang]?.manorStory ?? this.#locales[DEFAULT_LANGUAGE]?.manorStory ?? null;
  }

  getColdOpen() {
    return this.#locales[this.#lang]?.coldOpen ?? this.#locales[DEFAULT_LANGUAGE]?.coldOpen ?? null;
  }

  getChapters() {
    return this.#locales[this.#lang]?.chapters ?? this.#locales[DEFAULT_LANGUAGE]?.chapters ?? null;
  }

  getLetter(id) {
    const localeLetter = this.#locales[this.#lang]?.letters?.[id];
    if (localeLetter) return localeLetter;
    const defaultLetter = this.#locales[DEFAULT_LANGUAGE]?.letters?.[id];
    if (defaultLetter) return defaultLetter;
    return null;
  }

  getCaseReport() {
    return this.#locales[this.#lang]?.caseReport ?? this.#locales[DEFAULT_LANGUAGE]?.caseReport ?? null;
  }

  subscribe(listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  #notify() {
    for (const listener of this.#listeners) {
      listener(this.#lang);
    }
  }
}

/** Update DOM elements that carry data-i18n attributes. */
export function applyI18nToDOM(i18n, root = document) {
  if (!root) return;
  if (typeof document !== 'undefined') {
    document.documentElement.lang = i18n.language;
  }
  for (const el of root.querySelectorAll('[data-i18n]')) {
    el.textContent = i18n.t(el.dataset.i18n);
  }
  for (const el of root.querySelectorAll('[data-i18n-placeholder]')) {
    el.placeholder = i18n.t(el.dataset.i18nPlaceholder);
  }
  for (const el of root.querySelectorAll('[data-i18n-content]')) {
    el.setAttribute('content', i18n.t(el.dataset.i18nContent));
  }
  for (const el of root.querySelectorAll('[data-i18n-title]')) {
    el.title = i18n.t(el.dataset.i18nTitle);
  }
  for (const el of root.querySelectorAll('[data-i18n-aria]')) {
    el.setAttribute('aria-label', i18n.t(el.dataset.i18nAria));
  }
  for (const el of root.querySelectorAll('[data-i18n-tip]')) {
    el.dataset.tip = i18n.t(el.dataset.i18nTip);
  }
}

