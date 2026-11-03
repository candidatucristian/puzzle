export const ACHIEVEMENTS_KEY = 'decoderBook:achievements';
const RECIPIENT_KEY = 'decoderBook:recipientName';
export const DECODER_ACHIEVEMENTS = Object.freeze([
  Object.freeze({ id: 'fibonacci', levelId: 'plantpot', chapter: 1 }),
]);

export function normaliseRecipient(value) {
  if (typeof value !== 'string') return '';
  return Array.from(value.normalize('NFC').replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim()).slice(0, 64).join('');
}

function certificateId(id, earnedAt) {
  let hash = 2166136261;
  for (const character of `${id}:${earnedAt}`) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return `DB-01-${(hash >>> 0).toString(16).toUpperCase().padStart(8, '0')}`;
}

/** A permanent collection, independent of replaying or starting a new case. */
export class AchievementStore {
  #storage;
  #earned = new Map();
  #listeners = new Set();
  #getPlayerName;

  constructor(storage, { getPlayerName = () => null } = {}) {
    this.#storage = storage;
    this.#getPlayerName = getPlayerName;
    try {
      const saved = JSON.parse(storage.getItem(ACHIEVEMENTS_KEY));
      if (![1, 2].includes(saved?.version) || !Array.isArray(saved.entries)) return;
      for (const entry of saved.entries) {
        if (DECODER_ACHIEVEMENTS.some(item => item.id === entry?.id) &&
            typeof entry.earnedAt === 'string' && Number.isFinite(Date.parse(entry.earnedAt))) {
          this.#earned.set(entry.id, {
            id: entry.id, earnedAt: entry.earnedAt,
            recipientName: normaliseRecipient(entry.recipientName) || null,
            certificateId: certificateId(entry.id, entry.earnedAt),
          });
        }
      }
    } catch { /* Optional collection data must never prevent the game starting. */ }
  }

  get entries() { return [...this.#earned.values()].map(entry => ({ ...entry })); }
  get(id) { const entry = this.#earned.get(id); return entry ? { ...entry } : null; }
  get playerName() {
    let platformName = '';
    try { platformName = normaliseRecipient(this.#getPlayerName()); } catch { /* A platform bridge is optional. */ }
    return platformName || normaliseRecipient(this.#storage.getItem(RECIPIENT_KEY));
  }

  setPlayerName(value) {
    const name = normaliseRecipient(value);
    if (name) this.#storage.setItem(RECIPIENT_KEY, name);
    return name;
  }

  personalise(id, value) {
    const entry = this.#earned.get(id), name = this.setPlayerName(value);
    if (!entry || !name) return null;
    if (entry.recipientName === name) return { ...entry };
    entry.recipientName = name;
    this.#persist();
    for (const listener of this.#listeners) listener({ ...entry, change: 'personalised' });
    return { ...entry };
  }

  award(levelId) {
    const definition = DECODER_ACHIEVEMENTS.find(item => item.levelId === levelId);
    if (!definition || this.#earned.has(definition.id)) return null;
    const earnedAt = new Date().toISOString();
    const entry = {
      id: definition.id, earnedAt, recipientName: this.playerName || null,
      certificateId: certificateId(definition.id, earnedAt),
    };
    this.#earned.set(entry.id, entry);
    this.#persist();
    for (const listener of this.#listeners) listener({ ...entry, change: 'earned' });
    return { ...entry };
  }

  subscribe(listener) { this.#listeners.add(listener); return () => this.#listeners.delete(listener); }
  #persist() { this.#storage.setItem(ACHIEVEMENTS_KEY, JSON.stringify({ version: 2, entries: this.entries })); }
}
