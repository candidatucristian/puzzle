export const COMFORT_KEY = 'puzzleComfort';
export const COMFORT_DEFAULTS = Object.freeze({ grain: 0, textScale: 1, motion: 'system', ambientEffects: true });

function normalize(value = {}) {
  return {
    grain: Number.isFinite(value?.grain) ? Math.max(0, Math.min(100, value.grain)) : COMFORT_DEFAULTS.grain,
    textScale: [1, 1.15, 1.3].includes(value?.textScale) ? value.textScale : 1,
    motion: value?.motion === 'reduced' ? 'reduced' : 'system',
    ambientEffects: typeof value?.ambientEffects === 'boolean' ? value.ambientEffects : true,
  };
}

/** Cosmetic settings never change puzzle clocks or encoded signals. */
export class ComfortPreferences {
  #storage;
  #state;
  #systemReduced;
  #listeners = new Set();

  constructor(storage, systemReduced = false) {
    this.#storage = storage;
    this.#systemReduced = systemReduced;
    try { this.#state = normalize(JSON.parse(storage.getItem(COMFORT_KEY))); }
    catch { this.#state = { ...COMFORT_DEFAULTS }; }
  }

  get state() { return { ...this.#state }; }
  get reducedMotion() { return this.#systemReduced || this.#state.motion === 'reduced'; }
  get ambientMotion() { return this.#state.ambientEffects && !this.reducedMotion; }

  set(patch) {
    this.#state = normalize({ ...this.#state, ...patch });
    this.#storage.setItem(COMFORT_KEY, JSON.stringify(this.#state));
    this.#notify();
  }

  setSystemMotion(reduced) {
    this.#systemReduced = Boolean(reduced);
    this.#notify();
  }

  subscribe(listener) { this.#listeners.add(listener); return () => this.#listeners.delete(listener); }
  #notify() { for (const listener of this.#listeners) listener(this.state); }
}
