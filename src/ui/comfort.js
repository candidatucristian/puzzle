const FLAGS = {
  fr: '<svg class="st-flag-svg" viewBox="0 0 3 2" width="18" height="11"><path d="M0 0h1v2H0z" fill="#002654"/><path d="M1 0h1v2H1z" fill="#fff"/><path d="M2 0h1v2H2z" fill="#ed2939"/></svg>',
  es: '<svg class="st-flag-svg" viewBox="0 0 3 2" width="18" height="11"><path d="M0 0h3v2H0z" fill="#aa151b"/><path d="M0 .5h3v1H0z" fill="#f1bf00"/></svg>',
  'zh-Hans': '<svg class="st-flag-svg" viewBox="0 0 30 20" width="18" height="11"><path d="M0 0h30v20H0z" fill="#de2910"/><g fill="#ffde00"><path d="m5 2 .7 2.1H8L6.2 5.4l.7 2.1L5 6.2 3.1 7.5l.7-2.1L2 4.1h2.3z"/><path d="m10 1 .3.9h1l-.8.6.3.9-.8-.6-.8.6.3-.9-.8-.6h1zM12 4l.3.9h1l-.8.6.3.9-.8-.6-.8.6.3-.9-.8-.6h1zM12 7l.3.9h1l-.8.6.3.9-.8-.6-.8.6.3-.9-.8-.6h1zM10 9l.3.9h1l-.8.6.3.9-.8-.6-.8.6.3-.9-.8-.6h1z"/></g></svg>',
  en: '<svg class="st-flag-svg" viewBox="0 0 60 30" width="18" height="11"><clipPath id="uk-clip"><path d="M0 0v30h60V0z"/></clipPath><g clip-path="url(#uk-clip)"><path d="M0 0v30h60V0z" fill="#012169"/><path d="M0 0l60 30m0-30L0 30" stroke="#fff" stroke-width="6"/><path d="M0 0l60 30m0-30L0 30" stroke="#c8102e" stroke-width="2"/><path d="M30 0v30M0 15h60" stroke="#fff" stroke-width="10"/><path d="M30 0v30M0 15h60" stroke="#c8102e" stroke-width="6"/></g></svg>',
  ro: '<svg class="st-flag-svg" viewBox="0 0 3 2" width="18" height="11"><rect width="1" height="2" fill="#002B7F"/><rect x="1" width="1" height="2" fill="#FCD116"/><rect x="2" width="1" height="2" fill="#CE1126"/></svg>',
  ru: '<svg class="st-flag-svg" viewBox="0 0 3 2" width="18" height="11"><rect width="3" height="0.667" fill="#ffffff"/><rect y="0.667" width="3" height="0.667" fill="#0039A6"/><rect y="1.333" width="3" height="0.667" fill="#D52B1E"/></svg>',
};

// The picture's settings: film grain, the size of the text (three buttons,
// one pressed), and two switches — motion reduced, and the ambient effects
// (the dust, smoke and flicker that only dress a place). When the device
// itself asks for less motion, the motion switch shows it on and stays so.
export function mountComfort(scope, preferences, i18n = null) {
  const root = document.documentElement;
  const grain = document.getElementById('grain-slider');
  const sizes = [...document.querySelectorAll('#reading-size [data-scale]')];
  const langSelect = document.getElementById('language-select');
  const langBox = document.getElementById('st-lang-box') || langSelect?.closest('.st-select-box');
  const langMenu = document.getElementById('st-lang-menu');
  const langItems = langMenu ? [...langMenu.querySelectorAll('.st-lang-item')] : [];
  const motion = document.getElementById('motion-setting');
  const effects = document.getElementById('ambient-effects');
  const note = document.getElementById('motion-note');
  const system = matchMedia('(prefers-reduced-motion: reduce)');
  function render() {
    const state = preferences.state;
    root.style.setProperty('--grain-opacity', String(state.grain / 1000));
    root.style.setProperty('--reading-scale', String(state.textScale));
    root.dataset.textScale = String(state.textScale);
    root.dataset.reducedMotion = String(preferences.reducedMotion);
    root.dataset.ambientEffects = String(state.ambientEffects);
    root.dataset.ambientMotion = String(preferences.ambientMotion);
    const offText = i18n ? i18n.t('settings.grainOff') : 'Off';
    const grainLabel = state.grain === 0 ? offText : `${state.grain}%`;
    grain.value = state.grain;
    grain.style.setProperty('--fill', `${state.grain}%`);
    grain.setAttribute('aria-valuetext', grainLabel);
    document.getElementById('grain-value').textContent = grainLabel;
    for (const button of sizes) button.setAttribute('aria-checked', String(Number(button.dataset.scale) === state.textScale));
    if (i18n && langSelect) {
      langSelect.value = i18n.language;
      const flagEl = document.getElementById('st-lang-flag');
      if (flagEl) flagEl.innerHTML = FLAGS[i18n.language] || FLAGS.en;
      for (const item of langItems) {
        const active = item.dataset.lang === i18n.language;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-selected', String(active));
      }
    }
    motion.checked = preferences.reducedMotion;
    motion.disabled = system.matches;
    if (note) {
      if (i18n) {
        note.textContent = system.matches ? i18n.t('settings.deviceMotion') : i18n.t('settings.motionStay');
      } else {
        note.textContent = system.matches ? 'Your device asks for it.' : 'Puzzle signals stay.';
      }
    }
    effects.checked = state.ambientEffects;
    // with motion reduced the ambience is still anyway: the switch says so
    effects.disabled = preferences.reducedMotion;
    effects.closest('.st-switch, .fs-tick')?.classList.toggle('is-off', preferences.reducedMotion);
  }
  scope.on(grain, 'input', () => preferences.set({ grain: Number(grain.value) }));
  for (const button of sizes) scope.on(button, 'click', () => preferences.set({ textScale: Number(button.dataset.scale) }));
  // the arrows move between the three, as in any group of choices
  scope.on(document.getElementById('reading-size'), 'keydown', e => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const at = sizes.findIndex(button => button.getAttribute('aria-checked') === 'true');
    const next = sizes[(at + step + sizes.length) % sizes.length];
    next.focus(); next.click();
  });
  if (i18n && langSelect) {
    scope.on(langSelect, 'change', () => i18n.setLanguage(langSelect.value));
    scope.add(i18n.subscribe(render));

    // the settings sheet lists the languages on the page (`data-inline`):
    // the one in use circled, another chosen by a click; the arrows move
    // along them
    if (langMenu?.hasAttribute('data-inline')) {
      for (const item of langItems) {
        scope.on(item, 'click', () => {
          if (!item.dataset.lang || item.dataset.lang === langSelect.value) return;
          langSelect.value = item.dataset.lang;
          langSelect.dispatchEvent(new Event('change', { bubbles: true }));
        });
      }
      scope.on(langMenu, 'keydown', e => {
        const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (!step) return;
        e.preventDefault();
        const at = langItems.indexOf(document.activeElement);
        langItems[(at + step + langItems.length) % langItems.length]?.focus();
      });
    } else if (langMenu) {
      // Keep all language choices inside the scrollable settings panel.
      const positionMenu = () => {
        if (langMenu.hidden || !langBox) return;
        const box = langBox.getBoundingClientRect();
        const panel = langBox.closest('.settings-panel')?.getBoundingClientRect();
        const top = Math.max(8, panel?.top ?? 8);
        const bottom = Math.min(window.innerHeight - 8, panel?.bottom ?? window.innerHeight - 8);
        const below = Math.max(0, bottom - box.bottom - 8);
        const above = Math.max(0, box.top - top - 8);
        const upward = below < langMenu.scrollHeight && above > below;
        langMenu.style.top = upward ? 'auto' : 'calc(100% + 4px)';
        langMenu.style.bottom = upward ? 'calc(100% + 4px)' : 'auto';
        langMenu.style.maxHeight = `${Math.max(40, upward ? above : below)}px`;
        langMenu.style.overflowY = 'auto';
      };
      const toggleMenu = open => {
        langMenu.hidden = open !== undefined ? !open : !langMenu.hidden;
        langSelect.setAttribute('aria-expanded', String(!langMenu.hidden));
        positionMenu();
      };
      scope.on(window, 'resize', positionMenu);
      const panel = langBox?.closest('.settings-panel');
      if (panel) scope.on(panel, 'scroll', positionMenu, { passive: true });
      langSelect.setAttribute('aria-controls', langMenu.id);
      toggleMenu(false);
      const closeLanguage = e => {
        if (e.key !== 'Escape' || langMenu.hidden) return false;
        e.preventDefault(); e.stopPropagation();
        toggleMenu(false); langSelect.focus();
        return true;
      };

      scope.on(langSelect, 'mousedown', e => {
        e.preventDefault();
        toggleMenu();
      });

      scope.on(langSelect, 'keydown', e => {
        if (closeLanguage(e)) return;
        if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          toggleMenu(true);
          const activeItem = langItems.find(it => it.getAttribute('aria-selected') === 'true') || langItems[0];
          activeItem?.focus();
        }
      });

      scope.on(langMenu, 'keydown', e => {
        if (closeLanguage(e)) return;
        const step = { ArrowDown: 1, ArrowUp: -1 }[e.key];
        if (!step && e.key !== 'Home' && e.key !== 'End') return;
        e.preventDefault(); e.stopPropagation();
        const at = langItems.indexOf(document.activeElement);
        const next = e.key === 'Home' ? 0 : e.key === 'End' ? langItems.length - 1
          : (at + step + langItems.length) % langItems.length;
        langItems[next]?.focus();
      });

      for (const item of langItems) {
        scope.on(item, 'click', () => {
          const lang = item.dataset.lang;
          if (lang) {
            langSelect.value = lang;
            langSelect.dispatchEvent(new Event('change', { bubbles: true }));
            toggleMenu(false);
            langSelect.focus();
          }
        });
      }

      scope.on(document, 'pointerdown', e => {
        if (!langMenu.hidden && !langBox?.contains(e.target)) {
          toggleMenu(false);
        }
      });
    }
  }
  scope.on(motion, 'change', () => preferences.set({ motion: motion.checked ? 'reduced' : 'system' }));
  scope.on(effects, 'change', () => preferences.set({ ambientEffects: effects.checked }));
  scope.on(system, 'change', () => preferences.setSystemMotion(system.matches));
  scope.add(preferences.subscribe(render));
  render();
  mountTabs(scope);
}

// the settings' three tabs — Video, Sounds, Options: one panel shown at a
// time; a click or the arrow keys move between them
function mountTabs(scope) {
  const tabs = [...document.querySelectorAll('#options-modal [role="tab"]')];
  if (!tabs.length) return;
  const choose = (tab, focus = false) => {
    for (const other of tabs) {
      const on = other === tab;
      other.setAttribute('aria-selected', String(on));
      other.tabIndex = on ? 0 : -1;
      document.getElementById(other.getAttribute('aria-controls')).hidden = !on;
    }
    if (focus) tab.focus();
  };
  for (const tab of tabs) {
    scope.on(tab, 'click', () => choose(tab));
    scope.on(tab, 'keydown', e => {
      const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (!step && e.key !== 'Home' && e.key !== 'End') return;
      e.preventDefault();
      const at = tabs.indexOf(tab);
      const next = e.key === 'Home' ? tabs[0] : e.key === 'End' ? tabs[tabs.length - 1] : tabs[(at + step + tabs.length) % tabs.length];
      choose(next, true);
    });
  }
}
