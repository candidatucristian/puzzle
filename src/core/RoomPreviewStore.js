export const PREVIEWS_KEY = 'puzzleRoomPreviews';
const validImage = value => typeof value === 'string' && value.length < 32000 && /^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(value);

export class RoomPreviewStore {
  #storage;
  #allowed;
  #images = new Map();
  constructor(storage, definitions) {
    this.#storage = storage;
    this.#allowed = new Set(definitions.map(level => level.id));
    try {
      for (const [id, image] of Object.entries(JSON.parse(storage.getItem(PREVIEWS_KEY)) || {})) {
        if (this.#allowed.has(id) && validImage(image)) this.#images.set(id, image);
      }
    } catch { /* A thumbnail is optional; a malformed one never affects a save. */ }
  }
  get(id) { return this.#images.get(id); }
  set(id, image) {
    if (!this.#allowed.has(id) || !validImage(image)) return false;
    this.#images.set(id, image);
    this.#storage.setItem(PREVIEWS_KEY, JSON.stringify(Object.fromEntries(this.#images)));
    return true;
  }
  reset() { this.#images.clear(); this.#storage.removeItem(PREVIEWS_KEY); }
}
