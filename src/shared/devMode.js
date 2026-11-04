// Dev mode, switched from the title menu while the game is run from the dev
// server (never in a build: a player of the demo cannot turn it on). While it
// is on, every door of the house opens without its key, the gate up the
// stairs opens, and the demo's limits are lifted — to walk in anywhere.
const KEY = 'devMode';
const allowed = () => Boolean(import.meta.env?.DEV);

export function devModeAllowed() { return allowed(); }

export function isDevMode() {
  if (!allowed()) return false;
  try { return globalThis.localStorage?.getItem(KEY) === '1'; } catch { return false; }
}

export function setDevMode(on) {
  if (!allowed()) return false;
  try {
    if (on) globalThis.localStorage?.setItem(KEY, '1');
    else globalThis.localStorage?.removeItem(KEY);
  } catch { /* storage refused: stays as it was */ }
  return isDevMode();
}
