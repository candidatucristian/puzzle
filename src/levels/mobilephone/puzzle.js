export const PHONE_KEYMAP = Object.freeze({
  1: '.,?!', 2: 'ABC', 3: 'DEF', 4: 'GHI', 5: 'JKL',
  6: 'MNO', 7: 'PQRS', 8: 'TUV', 9: 'WXYZ', 0: '+0',
});
export const CALLER_NUMBER = '(433)-666-777-433';
export const PHONE_COMMIT_MS = 800;

export function decodeCallerNumber(number) {
  const runs = String(number).replace(/\D/g, '').match(/(\d)\1*/g) ?? [];
  return runs.map(run => {
    const letters = PHONE_KEYMAP[run[0]];
    return letters[(run.length - 1) % letters.length];
  }).join('');
}

export const CALLER_NAME = decodeCallerNumber(CALLER_NUMBER);

export function createPhoneInput() {
  return { text: '', pending: '', key: null, presses: 0 };
}

export function commitPhoneInput(state) {
  if (!state.pending) return state;
  return { text: state.text + state.pending, pending: '', key: null, presses: 0 };
}

/** One physical key press; the scene owns the 800 ms commit timer. */
export function pressPhoneKey(state, key) {
  if (key === '*' || key === '#') {
    const committed = commitPhoneInput(state);
    return {
      ...committed,
      text: key === '#' ? committed.text.slice(0, -1) : committed.text + ' ',
      key: null,
      presses: 0,
    };
  }
  const letters = PHONE_KEYMAP[key];
  if (!letters) return state;
  const next = state.key === key ? state : commitPhoneInput(state);
  const presses = state.key === key ? state.presses + 1 : 1;
  return { ...next, pending: letters[(presses - 1) % letters.length], key, presses };
}

export function phoneDisplay(state) {
  return (state.text + state.pending).slice(-12);
}
