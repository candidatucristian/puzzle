import './styles/console-note.css';

// Arthur's thought on a letter he has just read: written in pencil across the
// console at the foot of the game for a moment, then fading away. It shows in
// the hall too, where the console itself is hidden; in a room the console's
// own controls step back while it is there.
const IN = 450, HOLD = 2000, OUT = 900;
let current = null;

export function showConsoleNote(text, { signature = '— A. W.', reducedMotion = false } = {}) {
  const bar = document.getElementById('input-area');
  if (!bar || !text) return;
  current?.();
  const note = document.createElement('p');
  note.className = 'console-note';
  note.setAttribute('role', 'status');
  note.textContent = text;
  if (signature) {
    const sign = document.createElement('span');
    sign.className = 'console-note-sign';
    sign.textContent = signature;
    note.append(sign);
  }
  const controls = [...bar.children];
  bar.append(note);
  const total = IN + HOLD + OUT, held = (IN + HOLD) / total;
  const animation = note.animate(reducedMotion
    ? [{ opacity: 1 }, { opacity: 1, offset: held }, { opacity: 0 }]
    : [{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none', offset: IN / total },
       { opacity: 1, transform: 'none', offset: held }, { opacity: 0, transform: 'none' }],
  { duration: total, easing: 'linear', fill: 'forwards' });
  const away = controls.map(node => node.animate(
    [{ opacity: 1 }, { opacity: 0, offset: IN / total }, { opacity: 0, offset: held }, { opacity: 1 }],
    { duration: total, easing: 'ease-in-out' }));
  const end = () => {
    if (current !== end) return;
    current = null;
    animation.cancel(); for (const a of away) a.cancel();
    note.remove();
  };
  current = end;
  animation.finished.then(end, end);
}
