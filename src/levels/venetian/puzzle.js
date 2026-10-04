export const VENETIAN_START = 0.08;
export const VENETIAN_ALIGNMENT = 0.62;
export const VENETIAN_ROWS = 42;
const GLYPHS = [
  ['01111', '11000', '10000', '10000', '10000', '11000', '01111'],
  ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  ['10001', '11011', '01010', '00100', '00100', '00100', '00100'],
];
export const clampTilt = value => Math.max(0, Math.min(1, Number.isFinite(value) ? value : VENETIAN_START));

function cityLetterAt(x, y) {
  const col = Math.floor((x - 0.105) / 0.79 * 23), row = Math.floor((y - 0.29) / 0.43 * 7);
  if (col < 0 || col >= 23 || row < 0 || row >= 7) return false;
  return GLYPHS[Math.floor(col / 6)][row][col % 6] === '1';
}

// One immutable exposure: narrow signal rows interleaved with four independent
// rows of window lights. No answer layer is switched on at the correct angle.
export function cityLights() {
  let seed = 33091;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const lights = [];
  for (let band = 0; band < VENETIAN_ROWS; band++) for (const phase of [-0.4, -0.2, 0, 0.2, 0.4]) {
    for (let col = 0; col < 192; col++) {
      const x = (col + 0.5) / 192, y = (band + 0.5 + phase) / VENETIAN_ROWS;
      const chance = random();
      const tower = Math.floor(x * 18), roof = 0.115 + Math.abs(Math.sin(tower * 4.1)) * 0.15;
      if (phase === 0 ? !cityLetterAt(x, y) : (chance > 0.50 || y < roof || (col % 11 === 0))) continue;
      lights.push({ x, y, brightness: 0.70 + random() * 0.30, warm: random() > 0.66, signal: phase === 0 });
    }
  }
  return lights;
}

export function blindSlits(position) {
  const delta = clampTilt(position) - VENETIAN_ALIGNMENT;
  const phase = delta * 1.35;
  const gap = Math.min(0.86, 0.17 + Math.abs(delta) * 1.1);
  return Array.from({ length: VENETIAN_ROWS + 2 }, (_, i) => {
    const center = (i - 0.5 + phase) / VENETIAN_ROWS;
    return { top: Math.max(0, center - gap / VENETIAN_ROWS / 2), bottom: Math.min(1, center + gap / VENETIAN_ROWS / 2) };
  }).filter(slit => slit.bottom > slit.top);
}

export const lightPassesBlind = (y, position) => blindSlits(position).some(slit => y >= slit.top && y <= slit.bottom);

export function venetianLayout(width, height) {
  const window = { x: width * 0.075, y: height * 0.105, w: width * 0.79, h: height * 0.745 };
  return { width, height, window, cordX: width * 0.911, cordTop: height * 0.16,
    pullTop: height * 0.34, pullTravel: height * 0.43 };
}
