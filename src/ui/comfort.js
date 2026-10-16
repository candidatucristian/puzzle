// The picture's settings: film grain, the size of the text (three buttons,
// one pressed), and two switches — motion reduced, and the ambient effects
// (the dust, smoke and flicker that only dress a place). When the device
// itself asks for less motion, the motion switch shows it on and stays so.
export function mountComfort(scope, preferences) {
  const root = document.documentElement;
  const grain = document.getElementById('grain-slider');
  const sizes = [...document.querySelectorAll('#reading-size [data-scale]')];
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
    const grainLabel = state.grain === 0 ? 'Off' : `${state.grain}%`;
    grain.value = state.grain;
    grain.style.setProperty('--fill', `${state.grain}%`);
    grain.setAttribute('aria-valuetext', grainLabel);
    document.getElementById('grain-value').textContent = grainLabel;
    for (const button of sizes) button.setAttribute('aria-checked', String(Number(button.dataset.scale) === state.textScale));
    motion.checked = preferences.reducedMotion;
    motion.disabled = system.matches;
    if (note) note.textContent = system.matches ? 'Your device asks for it.' : 'Puzzle signals stay.';
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
