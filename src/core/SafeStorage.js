/** Storage adapter that keeps the game playable when persistence is unavailable. */
export class SafeStorage {
  #backend;
  #fallback = new Map();
  #persisted = new Map();

  constructor(storage) {
    try {
      this.#backend = storage === undefined ? globalThis.localStorage : storage;
    } catch {
      // Some browsers throw merely when accessing localStorage.
      this.#backend = null;
    }
  }

  getItem(key) {
    key = String(key);
    // A failed write/removal must not reveal an older value from the backend.
    if (this.#fallback.has(key)) return this.#fallback.get(key);
    try {
      const value = this.#backend?.getItem(key);
      return typeof value === "string" ? value : null;
    } catch {
      return null;
    }
  }

  setItem(key, value) {
    key = String(key);
    value = String(value);
    this.#fallback.set(key, value);
    this.#persisted.set(key, false);
    try {
      if (this.#backend) {
        this.#backend.setItem(key, value);
        this.#persisted.set(key, true);
      }
    } catch {
      // Keep the session's changes in memory if access or quota is denied.
    }
    return this.isPersisted(key);
  }

  isPersisted(key) { return this.#persisted.get(String(key)) === true; }

  removeItem(key) {
    key = String(key);
    this.#fallback.set(key, null);
    this.#persisted.delete(key);
    try {
      this.#backend?.removeItem(key);
    } catch {
      // The in-memory tombstone still hides a value we could not remove.
    }
  }
}
