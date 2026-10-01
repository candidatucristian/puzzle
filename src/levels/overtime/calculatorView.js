import { CALCULATOR_DIGITS } from './puzzle.js';
import { glyph } from './office.js';
import './calculatorView.css';

/** A touch-sized view of the same calculator state and seven-segment display. */
export function createCalculatorView(scene, keypad) {
  const dialog = scene.ownDom(document.createElement('dialog'));
  dialog.className = 'calculator-detail';
  dialog.setAttribute('aria-labelledby', 'calculator-title');
  const header = document.createElement('header');
  const title = document.createElement('h2');
  title.id = 'calculator-title';
  title.textContent = 'Calculator';
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'calculator-back';
  close.textContent = 'Back to room';
  close.autofocus = true;
  close.addEventListener('click', () => dialog.close());
  header.append(title, close);

  const body = document.createElement('div');
  body.className = 'calculator-detail-body';
  const output = document.createElement('output');
  output.className = 'calculator-display';
  output.setAttribute('aria-label', 'Calculator display');
  const screen = document.createElement('canvas');
  screen.width = 640; screen.height = 160;
  screen.setAttribute('aria-hidden', 'true');
  const reading = document.createElement('span');
  reading.className = 'calculator-reading';
  output.append(screen, reading);

  const keys = document.createElement('div');
  keys.className = 'calculator-keypad';
  for (const spec of keypad) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = spec.key;
    button.dataset.key = spec.key;
    button.style.gridColumn = `${spec.c + 1} / span ${spec.cs ?? 1}`;
    button.style.gridRow = `${spec.r + 1} / span ${spec.rs ?? 1}`;
    button.addEventListener('click', () => scene._press(spec.key));
    keys.append(button);
  }
  body.append(output, keys);
  dialog.append(header, body);
  document.body.append(dialog);
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });

  // These are the room's actual segment shapes; the upside-down puzzle still
  // works in this view. No second calculator or copy of its state is created.
  const ctx = screen.getContext('2d');
  ctx.scale(2, 2);
  function render(value) {
    reading.textContent = value;
    ctx.clearRect(0, 0, 320, 80);
    const text = value.padStart(CALCULATOR_DIGITS, ' ');
    function fill(polygons, color) {
      ctx.fillStyle = color;
      for (const points of polygons) {
        ctx.beginPath();
        points.forEach(([x, y], i) => {
          if (i) ctx.lineTo(x, 67 - y); else ctx.moveTo(x, 67 - y);
        });
        ctx.closePath(); ctx.fill();
      }
    }
    for (let i = 0; i < CALCULATOR_DIGITS; i++) {
      const { on, off } = glyph(text[i], 10 + i * 38, 0, 24, 54, 5, .08);
      fill(off, 'rgba(31,42,26,.07)');
      fill(on, 'rgba(31,42,26,.94)');
    }
  }
  return {
    open() {
      if (dialog.open) return;
      render(scene.calc.display);
      dialog.showModal();
    },
    render,
    destroy() { dialog.close(); dialog.remove(); },
  };
}
