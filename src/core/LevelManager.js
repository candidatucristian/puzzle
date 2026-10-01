/** Coordinates level selection and answers; scenes own their resources. */
export class LevelManager {
  #progress;
  #game = null;
  #currentIndex;
  #subscribers = new Set();

  constructor(definitions, progress) {
    if (!definitions?.length || !progress) throw new TypeError("Levels and progress are required.");
    this.definitions = Object.freeze([...definitions]);
    this.#progress = progress;
    this.#currentIndex = progress.currentIndex;
  }

  attach(game) {
    this.#game = game;
    return this;
  }

  get currentIndex() { return this.#currentIndex; }
  get unlockedIndex() { return this.#progress.unlockedIndex; }
  get completed() { return this.#progress.completed; }
  get completedCount() { return this.#progress.state.completedLevelIds.length; }
  get saved() { return this.#progress.persisted; }
  isCompleted(index) { return this.#progress.state.completedLevelIds.includes(this.definitions[index]?.id); }

  get activeScene() {
    const key = this.definitions[this.#currentIndex].key;
    return this.#game?.scene.isActive(key) ? this.#game.scene.getScene(key) : null;
  }

  canAccess(index) { return this.#progress.canAccess(index); }

  navigate(index, { force = false } = {}) {
    if (!Number.isInteger(index) || !this.definitions[index] || (!force && !this.canAccess(index))) {
      return false;
    }
    if (!this.#game) return false;
    for (const { key } of this.definitions) {
      if (this.#game.scene.isActive(key)) this.#game.scene.stop(key);
    }
    if (this.#game.scene.isActive("Boot")) this.#game.scene.stop("Boot");
    this.#currentIndex = index;
    // Forced navigation is for development previews; it never unlocks a level.
    if (!force) this.#progress.visit(index);
    this.#game.scene.start(this.definitions[index].key, { skipFade: true });
    this.#notify();
    return true;
  }

  submit(answer) {
    const level = this.definitions[this.#currentIndex];
    const value = typeof answer === "string" ? answer.trim().toUpperCase() : "";
    const isLast = this.#currentIndex === this.definitions.length - 1;
    const correct = this.canAccess(this.#currentIndex) && value !== "" &&
      [level.code, level.altCode].some((code) => typeof code === "string" && value === code.toUpperCase());
    if (!correct) return { correct: false, isLast, nextIndex: null };
    this.#progress.complete(this.#currentIndex);
    const nextIndex = isLast ? null : this.#currentIndex + 1;
    this.#notify();
    return { correct: true, isLast, nextIndex };
  }

  reset() {
    this.#progress.reset();
    this.#currentIndex = this.#progress.currentIndex;
    this.#notify();
  }

  subscribe(callback) {
    this.#subscribers.add(callback);
    return () => this.#subscribers.delete(callback);
  }

  #notify() {
    const state = {
      currentIndex: this.currentIndex,
      unlockedIndex: this.unlockedIndex,
      completed: this.completed,
    };
    for (const callback of this.#subscribers) callback(state);
  }
}

export default LevelManager;
