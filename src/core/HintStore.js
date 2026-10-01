export const HINTS_KEY = 'puzzleHints';

/** Revealed hints belong to stable room IDs, independently of completion. */
export class HintStore {
  #storage;
  #limits;
  #revealed = new Map();

  constructor(storage, definitions) {
    this.#storage = storage;
    this.#limits = new Map(definitions.map(level => [level.id, level.hint.steps.length]));
    try {
      const saved = JSON.parse(storage.getItem(HINTS_KEY));
      for (const [id, count] of Object.entries(saved || {})) {
        if (this.#limits.has(id) && Number.isInteger(count) && count > 0) {
          this.#revealed.set(id, Math.min(count, this.#limits.get(id)));
        }
      }
    } catch { /* Invalid optional help state must not affect progress. */ }
  }

  count(id) { return this.#revealed.get(id) || 0; }

  reveal(id) {
    if (!this.#limits.has(id)) return 0;
    const count = Math.min(this.count(id) + 1, this.#limits.get(id));
    this.#revealed.set(id, count);
    this.#save();
    return count;
  }

  reset() { this.#revealed.clear(); this.#storage.removeItem(HINTS_KEY); }
  #save() { this.#storage.setItem(HINTS_KEY, JSON.stringify(Object.fromEntries(this.#revealed))); }
}
