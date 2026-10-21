import { SafeStorage } from "./SafeStorage.js";

export const PROGRESS_KEY = "puzzleProgress";
export const PROGRESS_VERSION = 3;

/** Stable level identities, persistence and legacy-save migration. No scene/UI code. */
export class ProgressStore {
  #storage;
  #definitions;
  #legacyLevelIds;
  #state;

  constructor(storage, definitions, {legacyLevelIds} = {}) {
    if (!definitions?.length || new Set(definitions.map(({ id }) => id)).size !== definitions.length ||
      definitions.some(({ id }) => typeof id !== "string" || !id)) {
      throw new TypeError("Progress requires non-empty, unique level IDs.");
    }
    this.#storage = storage instanceof SafeStorage ? storage : new SafeStorage(storage);
    this.#definitions = definitions.map(({ id }) => ({ id }));
    this.#legacyLevelIds = legacyLevelIds ?? this.#definitions.map(({id})=>id);
    this.#state = this.#load();
    this.#save();
  }

  get state() {
    return {
      ...this.#state,
      completedLevelIds: [...this.#state.completedLevelIds],
      unlockedLevelIds: [...this.#state.unlockedLevelIds],
      keys: [...this.#state.keys],
      usedKeys: [...this.#state.usedKeys],
      visitedPlaces: [...this.#state.visitedPlaces],
    };
  }

  get completed() {
    return this.#definitions.every(({ id }) => this.#state.completedLevelIds.includes(id));
  }

  get persisted() { return this.#storage.isPersisted(PROGRESS_KEY); }

  get unlockedIndex() {
    const firstLocked = this.#definitions.findIndex(
      ({ id }) => !this.#state.unlockedLevelIds.includes(id),
    );
    return firstLocked < 0 ? this.#definitions.length - 1 : Math.max(0, firstLocked - 1);
  }

  get currentIndex() {
    const index = this.#definitions.findIndex(({ id }) => id === this.#state.lastPlayedLevelId);
    return index < 0 ? this.unlockedIndex : index;
  }

  canAccess(index) {
    if (!Number.isInteger(index) || !this.#definitions[index]) return false;
    const { id } = this.#definitions[index];
    return this.#state.unlockedLevelIds.includes(id);
  }

  /** Opens a level out of turn: it was come upon in the house. */
  unlock(index) {
    if (!Number.isInteger(index) || !this.#definitions[index]) return false;
    const { id } = this.#definitions[index];
    if (!this.#state.unlockedLevelIds.includes(id)) {
      this.#state.unlockedLevelIds.push(id);
      this.#save();
    }
    return true;
  }

  /** The keys found so far, each named for the room it opens. */
  hasKey(id) { return this.#state.keys.includes(id); }

  grantKey(id) {
    if (typeof id !== "string" || !id || this.hasKey(id)) return false;
    this.#state.keys.push(id);
    this.#save();
    return true;
  }

  /** A key that has been used to open its door: the door stays open, but the
   *  key is gone — it is not kept. */
  isKeyUsed(id) { return this.#state.usedKeys.includes(id); }

  useKey(id) {
    if (!this.hasKey(id) || this.isKeyUsed(id)) return false;
    this.#state.usedKeys.push(id);
    this.#save();
    return true;
  }

  /** The places of the house that have been stood in: the map shows them,
   *  and lets the player go back to any of them at once. */
  hasVisitedPlace(key) { return this.#state.visitedPlaces.includes(key); }

  visitPlace(key) {
    if (typeof key !== "string" || !key || this.hasVisitedPlace(key)) return false;
    this.#state.visitedPlaces.push(key);
    this.#save();
    return true;
  }

  visit(index) {
    if (!this.canAccess(index)) return false;
    this.#state.lastPlayedLevelId = this.#definitions[index].id;
    this.#save();
    return true;
  }

  complete(index) {
    if (!this.canAccess(index)) return false;
    const { id } = this.#definitions[index];
    if (!this.#state.completedLevelIds.includes(id)) this.#state.completedLevelIds.push(id);
    const next = this.#definitions[index + 1];
    if (next && !this.#state.unlockedLevelIds.includes(next.id)) this.#state.unlockedLevelIds.push(next.id);
    this.#save();
    return true;
  }

  reset() {
    this.#storage.removeItem("puzzleUnlockedLevel");
    this.#storage.removeItem("puzzleProgressSchema");
    this.#state = this.#fresh();
    this.#save();
  }

  #fresh() {
    return {
      version: PROGRESS_VERSION,
      completedLevelIds: [],
      unlockedLevelIds: [this.#definitions[0].id],
      lastPlayedLevelId: this.#definitions[0].id,
      keys: [],
      usedKeys: [],
      visitedPlaces: [],
    };
  }

  #load() {
    const raw = this.#storage.getItem(PROGRESS_KEY);
    if (raw !== null) {
      try {
        const parsed = JSON.parse(raw);
        if (!parsed || parsed.version !== PROGRESS_VERSION || !Array.isArray(parsed.completedLevelIds)) {
          return this.#fresh();
        }
        const valid = new Set(this.#definitions.map(({ id }) => id));
        const completedLevelIds = [...new Set(parsed.completedLevelIds)].filter((id) => valid.has(id));
        const firstIncomplete = this.#definitions.find(({ id }) => !completedLevelIds.includes(id));
        const unlocked = new Set([
          this.#definitions[0].id,
          ...completedLevelIds,
          ...(Array.isArray(parsed.unlockedLevelIds) ? parsed.unlockedLevelIds : []),
        ]);
        // A newly inserted level following a completed one is available immediately.
        for (let i = 1; i < this.#definitions.length; i++) {
          if (completedLevelIds.includes(this.#definitions[i - 1].id)) unlocked.add(this.#definitions[i].id);
        }
        // Also accepts early stable-ID saves made before unlock identities were explicit.
        if (valid.has(parsed.lastPlayedLevelId)) unlocked.add(parsed.lastPlayedLevelId);
        return {
          version: PROGRESS_VERSION,
          completedLevelIds,
          unlockedLevelIds: [...unlocked].filter((id) => valid.has(id)),
          lastPlayedLevelId: valid.has(parsed.lastPlayedLevelId)
            ? parsed.lastPlayedLevelId
            : (firstIncomplete || this.#definitions.at(-1)).id,
          // saves from before the house had keys simply have none
          keys: Array.isArray(parsed.keys) ? [...new Set(parsed.keys)].filter((id) => typeof id === "string") : [],
          // and saves from before keys were used up have used none
          usedKeys: Array.isArray(parsed.usedKeys) && Array.isArray(parsed.keys)
            ? [...new Set(parsed.usedKeys)].filter((id) => typeof id === "string" && parsed.keys.includes(id))
            : [],
          visitedPlaces: Array.isArray(parsed.visitedPlaces) ? [...new Set(parsed.visitedPlaces)].filter((id) => typeof id === "string") : [],
        };
      } catch {
        // A damaged modern save must not resurrect stale legacy progress.
        return this.#fresh();
      }
    }

    const saved = this.#storage.getItem("puzzleUnlockedLevel");
    let index = saved !== null && saved.trim() !== "" ? Number(saved) : 0;
    if (!Number.isInteger(index) || index < 0) index = 0;
    if (this.#storage.getItem("puzzleProgressSchema") !== "2") {
      // The original 21-level order was reduced to 16. Preserve that migration.
      if (index >= 17) index = 15;
      else if (index >= 15) index = 14;
      else if (index === 14) index = 13;
      else if (index >= 12) index = 12;
    }
    index = Math.min(index, this.#legacyLevelIds.length - 1);
    const valid = new Set(this.#definitions.map(({id})=>id));
    const completedLevelIds = this.#legacyLevelIds.slice(0,index).filter(id=>valid.has(id));
    // A retired numeric slot advances to the next surviving identity. Other
    // completed puzzles, house keys and modern ID saves keep their meaning.
    const lastPlayedLevelId = this.#legacyLevelIds.slice(index).find(id=>valid.has(id)) ?? this.#definitions.at(-1).id;
    const unlockedLevelIds = [...new Set([
      ...this.#legacyLevelIds.slice(0,index+1).filter(id=>valid.has(id)),lastPlayedLevelId,
    ])];
    return {
      version: PROGRESS_VERSION,
      // The legacy value was highest unlocked, not highest completed.
      completedLevelIds,
      unlockedLevelIds,
      lastPlayedLevelId,
      keys: [],
      usedKeys: [],
      visitedPlaces: [],
    };
  }

  #save() {
    this.#storage.setItem(PROGRESS_KEY, JSON.stringify(this.#state));
  }
}
