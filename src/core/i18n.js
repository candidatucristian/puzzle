import { en } from '../locales/en.js';
import { ro } from '../locales/ro.js';
import { ru } from '../locales/ru.js';

export const I18N_STORAGE_KEY = 'puzzleLanguage';
export const SUPPORTED_LANGUAGES = Object.freeze(['en', 'ro', 'ru']);
export const DEFAULT_LANGUAGE = 'en';

export class I18n {
  #storage;
  #lang;
  #listeners = new Set();
  #locales = { en, ro, ru };

  constructor(storage) {
    this.#storage = storage;
    const queryLang = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('lang') : null;
    const storedLang = storage?.getItem(I18N_STORAGE_KEY);
    if (queryLang && SUPPORTED_LANGUAGES.includes(queryLang)) {
      this.#lang = queryLang;
    } else if (storedLang && SUPPORTED_LANGUAGES.includes(storedLang)) {
      this.#lang = storedLang;
    } else {
      this.#lang = DEFAULT_LANGUAGE;
    }
  }

  get language() {
    return this.#lang;
  }

  setLanguage(lang) {
    if (!SUPPORTED_LANGUAGES.includes(lang) || this.#lang === lang) return;
    this.#lang = lang;
    this.#storage?.setItem(I18N_STORAGE_KEY, lang);
    this.#notify();
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
    let key = "botany";
    if (raw.includes("botan")) key = "botany";
    else if (raw.includes("chem") || raw.includes("chim")) key = "chemistry";
    else if (raw.includes("phys") || raw.includes("fiz")) key = "physics";
    else if (raw.includes("base") || raw.includes("cellar") || raw.includes("subsol") || raw.includes("podval")) key = "basement";

    const translated = this.t(`floors.${key}`);
    return translated || floorKey;
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

