const FLAGS = {
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
    effects.closest('.st-switch')?.classList.toggle('is-off', preferences.reducedMotion);
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

    if (langMenu) {
      const toggleMenu = open => {
        langMenu.hidden = open !== undefined ? !open : !langMenu.hidden;
      };

      scope.on(langSelect, 'mousedown', e => {
        e.preventDefault();
        toggleMenu();
      });

      scope.on(langSelect, 'keydown', e => {
        if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          toggleMenu(true);
          const activeItem = langItems.find(it => it.getAttribute('aria-selected') === 'true') || langItems[0];
          activeItem?.focus();
        } else if (e.key === 'Escape') {
          toggleMenu(false);
        }
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
