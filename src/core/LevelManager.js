import { PLACES, PUZZLE_STORY, ALL_DOORS_OPEN, STILL_LOCKED } from "../shared/house.js";

/** Coordinates level selection and answers; scenes own their resources.
 * The player is either at a puzzle (a level) or standing somewhere in the
 * house — the hall, a room — among the things that open the puzzles. */
export class LevelManager {
  #progress;
  #game = null;
  #currentIndex;
  #subscribers = new Set();
  #place = null;
  #places;

  constructor(definitions, progress, places = PLACES) {
    if (!definitions?.length || !progress) throw new TypeError("Levels and progress are required.");
    this.definitions = Object.freeze([...definitions]);
    this.#progress = progress;
    this.#currentIndex = progress.currentIndex;
    this.#places = places;
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
  indexOf(id) { return this.definitions.findIndex((level) => level.id === id); }

  /** Where in the house the player stands, or null while at a puzzle. */
  get place() { return this.#place; }

  /** True where the place stood in is itself a puzzle's stage, and that
   *  puzzle is not solved yet: there is something to answer here. */
  get answering() {
    const index = this.indexOf(this.#place?.plays);
    return index >= 0 && !this.isCompleted(index);
  }

  /** The place a level is found in, if it has been put in the house yet. */
  homeOf(index) {
    const id = this.definitions[index]?.id;
    return this.#places.find((place) => place.holds.includes(id)) ?? null;
  }

  /** Where stepping back leads: out of a puzzle to the place it is found in
   *  (the hall, for one not yet put anywhere), out of a room to the place
   *  its door gives on. Null in the hall: there is nowhere further back. */
  get back() {
    const key = this.#place ? this.#place.back : (this.homeOf(this.#currentIndex) ?? this.#places[0]).key;
    return this.#places.find((place) => place.key === key) ?? null;
  }

  /** What the index lists: the puzzles of the place the player is in — or,
   *  at a puzzle, of the place it is found in. A puzzle not yet put anywhere
   *  in the house is listed with the others still waiting for a room. */
  get nearby() {
    const place = this.#place ?? this.homeOf(this.#currentIndex);
    const all = this.definitions.map((_, index) => index);
    // the few lines told under the list: the place's own, or a puzzle's
    const story = this.#place ? this.#place.story ?? [] : PUZZLE_STORY;
    // standing in a place with nothing left in it
    const completed = Boolean(this.#place) && this.#finished(this.#place);
    return place
      ? { name: place.name, story, completed, indexes: all.filter((index) => place.holds.includes(this.definitions[index].id)) }
      : { name: "Rooms", story, completed, indexes: all.filter((index) => !this.homeOf(index)) };
  }

  /** The rooms behind the doors of the place the player stands in, in the
   *  doors' order: its place key, whether it is locked (nothing behind it, or
   *  its key not found yet), whether it can be gone into, whether its key is
   *  in hand and has not opened it yet, and whether everything in it has been
   *  solved. None at a puzzle or without doors. */
  get rooms() {
    return (this.#place?.doors ?? []).map((key, n) => {
      const place = this.#places.find((item) => item.key === key);
      if (!place) return { key: null, name: `Room ${n + (this.#place.first ?? 1)}`, locked: true, open: false, withKey: false, solved: false, completed: false };
      const locked = this.#locked(place);
      return {
        key: place.key,
        name: place.name,
        locked,
        open: !locked && !place.unbuilt,
        withKey: Boolean(place.needsKey) && this.hasKey(place.key) && !this.#progress.isKeyUsed(place.key),
        solved: place.holds.length > 0 && place.holds.every((id) => this.isCompleted(this.indexOf(id))),
        completed: this.#finished(place),
      };
    });
  }

  // A place whose door needs a key that has not been found yet.
  #locked(place) {
    return Boolean(place.needsKey) && (!ALL_DOORS_OPEN || STILL_LOCKED.includes(place.key)) && !this.hasKey(place.key);
  }

  // Everything a place holds is solved, and the key in its chest taken.
  #finished(place) {
    return place.holds.length > 0 && place.holds.every((id) => this.isCompleted(this.indexOf(id))) &&
      (!place.chest || this.hasKey(place.chest));
  }

  /** The keys found so far: the room each opens, and the number on that
   *  room's door. */
  get keys() {
    const held = [];
    for (const place of this.#places) {
      (place.doors ?? []).forEach((key, n) => {
        // a key that has opened its door is gone
        if (key && this.hasKey(key) && !this.#progress.isKeyUsed(key)) held.push({ key, door: n + (place.first ?? 1) });
      });
    }
    return held;
  }

  /** The room to go on with: the first along the hall whose door is unlocked
   *  and which is not finished yet — or, all of them finished, the last. Its
   *  place, the number on its door, and whether it can be gone into. */
  get resumeRoom() {
    let last = null;
    for (const [n, key] of (this.#places[0].doors ?? []).entries()) {
      const place = this.#places.find((item) => item.key === key);
      if (!place || this.#locked(place)) continue;
      const room = { key: place.key, number: n + 1, open: !place.unbuilt };
      if (!this.#finished(place)) return room;
      last = room;
    }
    return last;
  }

  /** A key is named for the room it opens. */
  hasKey(key) { return this.#progress.hasKey(key); }

  /** The door of `key`'s room is unlocked with its key, and the key is left
   *  in the lock: it is not carried any more. */
  unlockDoor(key) {
    const place = this.#places.find((item) => item.key === key);
    if (!place?.needsKey || !this.#progress.useKey(key)) return false;
    this.#notify();
    return true;
  }

  /** The key a place's chest holds, once everything the place holds has
   *  been solved and until the key has been taken; null otherwise. */
  keyWaitingIn(placeKey) {
    const place = this.#places.find((item) => item.key === placeKey);
    if (!place?.chest || this.hasKey(place.chest)) return null;
    return place.holds.every((id) => this.isCompleted(this.indexOf(id))) ? place.chest : null;
  }

  takeKey(key) {
    if (!this.#progress.grantKey(key)) return false;
    this.#notify();
    return true;
  }

  get activeScene() {
    const key = this.#place ? this.#place.key : this.definitions[this.#currentIndex].key;
    return this.#game?.scene.isActive(key) ? this.#game.scene.getScene(key) : null;
  }

  canAccess(index) { return this.#progress.canAccess(index); }

  /** A puzzle come upon in the house is open from then on, whatever the
   *  order the others were solved in. */
  discover(index) { return this.#progress.unlock(index); }

  #leaveEverything() {
    for (const { key } of [...this.definitions, ...this.#places, { key: "Boot" }]) {
      if (this.#game.scene.isActive(key)) this.#game.scene.stop(key);
    }
  }

  navigate(index, { force = false } = {}) {
    if (!Number.isInteger(index) || !this.definitions[index] || (!force && !this.canAccess(index))) {
      return false;
    }
    if (!this.#game) return false;
    this.#leaveEverything();
    this.#place = null;
    this.#currentIndex = index;
    // Forced navigation is for development previews; it never unlocks a level.
    if (!force) this.#progress.visit(index);
    this.#game.scene.start(this.definitions[index].key, { skipFade: true });
    this.#notify();
    return true;
  }

  /** Step into a place of the house: whatever puzzle was open is left.
   *  `from` says what the player is coming away from, when it is something
   *  in that place — `{ level: id }` or `{ place: key }` — so the place
   *  can open on it. */
  enterPlace(key, from = null) {
    const place = this.#places.find((item) => item.key === key);
    if (!this.#game || !place || place.unbuilt || this.#locked(place)) return false;
    // the first time a door is opened with its key, the key stays in the lock
    if (place.needsKey && this.hasKey(place.key)) this.#progress.useKey(place.key);
    this.#progress.visitPlace(place.key);
    this.#leaveEverything();
    this.#place = place;
    // a puzzle played in the place itself is the one in hand while we stand there
    if (place.plays && this.indexOf(place.plays) >= 0) this.#currentIndex = this.indexOf(place.plays);
    // what a place holds is there to be found: all of it is open from now on
    for (const id of place.holds) this.#progress.unlock(this.indexOf(id));
    this.#game.scene.start(place.key, { from });
    this.#notify();
    return true;
  }

  /** What the map needs to know of a place of the house: whether it has
   *  been stood in, whether it can be gone into now, whether everything in
   *  it is done, and whether the player is standing in it. */
  placeState(key) {
    const place = this.#places.find((item) => item.key === key);
    if (!place) return null;
    const home = this.#place ?? this.homeOf(this.#currentIndex);
    return {
      key, name: place.name,
      visited: this.#progress.hasVisitedPlace(key),
      open: !place.unbuilt && !this.#locked(place),
      finished: place.holds.length > 0 && this.#finished(place),
      here: home?.key === key,
      puzzles: place.holds.length,
      solved: place.holds.filter((id) => this.isCompleted(this.indexOf(id))).length,
    };
  }

  enterHall() { return this.enterPlace(this.#places[0].key); }

  submit(answer) {
    if (this.#place && !this.answering) return { correct: false, isLast: false, nextIndex: null };
    const level = this.definitions[this.#currentIndex];
    const value = typeof answer === "string" ? answer.trim().toUpperCase() : "";
    const isLast = this.#currentIndex === this.definitions.length - 1;
    const correct = this.canAccess(this.#currentIndex) && value !== "" &&
      [level.code, level.altCode].some((code) => typeof code === "string" && value === code.toUpperCase());
    if (!correct) return { correct: false, isLast, nextIndex: null };
    const wasCompleted = this.completed;
    this.#progress.complete(this.#currentIndex);
    let nextIndex = this.#currentIndex + 1;
    // Stable-ID saves can leave newly inserted rooms unfinished before the last
    // catalog entry. Finish those rooms before offering the completion screen.
    if (this.completed && (!wasCompleted || isLast)) nextIndex = null;
    else if (isLast) nextIndex = this.definitions.findIndex((_, index) =>
      this.canAccess(index) && !this.isCompleted(index));
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
      place: this.#place?.key ?? null,
    };
    for (const callback of this.#subscribers) callback(state);
  }
}
