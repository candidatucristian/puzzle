export function mountComfort(scope, preferences) {
  const root = document.documentElement;
  const grain = document.getElementById('grain-slider');
  const size = document.getElementById('reading-size');
  const motion = document.getElementById('motion-setting');
  const effects = document.getElementById('ambient-effects');
  const system = matchMedia('(prefers-reduced-motion: reduce)');
  function render() {
    const state = preferences.state;
    root.style.setProperty('--grain-opacity', String(state.grain / 1000));
    root.style.setProperty('--reading-scale', String(state.textScale));
    root.dataset.reducedMotion = String(preferences.reducedMotion);
    root.dataset.ambientEffects = String(state.ambientEffects);
    root.dataset.ambientMotion = String(preferences.ambientMotion);
    grain.value = state.grain;
    grain.setAttribute('aria-valuetext', state.grain === 0 ? 'Off' : `${state.grain}%`);
    document.getElementById('grain-value').textContent = state.grain === 0 ? 'Off' : `${state.grain}%`;
    size.value = String(state.textScale);
    motion.value = state.motion;
    effects.checked = state.ambientEffects;
    document.getElementById('motion-note').textContent = system.matches
      ? 'Reduced motion is also enabled on your device.'
      : 'Puzzle signals and essential movement remain available.';
  }
  scope.on(grain, 'input', () => preferences.set({ grain: Number(grain.value) }));
  scope.on(size, 'change', () => preferences.set({ textScale: Number(size.value) }));
  scope.on(motion, 'change', () => preferences.set({ motion: motion.value }));
  scope.on(effects, 'change', () => preferences.set({ ambientEffects: effects.checked }));
  scope.on(system, 'change', () => preferences.setSystemMotion(system.matches));
  scope.add(preferences.subscribe(render));
  render();
}
