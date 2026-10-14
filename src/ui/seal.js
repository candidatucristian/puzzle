// A wax seal, pressed: the mark of something finished in the house's index.
// Oxblood wax run out unevenly at its edge, the ring of the seal pressed into
// it and the house's key in the middle, its edges catching the light.

const NS = 'http://www.w3.org/2000/svg';
let made = 0;

const el = (name, attrs, parent) => {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  parent?.appendChild(node);
  return node;
};

/** A seal as an <svg>; `seed` makes each one's run of wax its own. */
export function waxSeal(seed = 1) {
  const id = `seal${++made}`;
  const svg = el('svg', { viewBox: '0 0 40 40', class: 'wax-seal', 'aria-hidden': 'true', focusable: 'false' });
  const defs = el('defs', {}, svg);
  const wax = el('radialGradient', { id: `${id}w`, cx: '38%', cy: '32%', r: '72%' }, defs);
  el('stop', { offset: '0', 'stop-color': '#c4574a' }, wax);
  el('stop', { offset: '.45', 'stop-color': '#8e2a20' }, wax);
  el('stop', { offset: '1', 'stop-color': '#4a110c' }, wax);
  const pool = el('radialGradient', { id: `${id}p`, cx: '55%', cy: '60%', r: '60%' }, defs);
  el('stop', { offset: '0', 'stop-color': '#5c1610' }, pool);
  el('stop', { offset: '1', 'stop-color': '#7e241b' }, pool);
  // the wax, run out unevenly
  let s = seed * 9301 + 49297;
  const rand = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const lobes = 11, pts = [];
  for (let i = 0; i < lobes; i++) {
    const a = (i / lobes) * Math.PI * 2 + rand() * 0.3;
    const r = 16.2 + rand() * 2.6;
    pts.push([20 + Math.cos(a) * r, 20 + Math.sin(a) * r]);
  }
  const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  let d = `M${mid(pts[lobes - 1], pts[0]).map((v) => v.toFixed(2))}`;
  for (let i = 0; i < lobes; i++) {
    const p = pts[i], m = mid(p, pts[(i + 1) % lobes]);
    d += ` Q${p[0].toFixed(2)},${p[1].toFixed(2)} ${m[0].toFixed(2)},${m[1].toFixed(2)}`;
  }
  el('path', { d: `${d} Z`, fill: `url(#${id}w)` }, svg);
  // the face of the seal, pressed in: darker, its rim lit along the bottom
  el('circle', { cx: 20, cy: 20, r: 11.6, fill: `url(#${id}p)` }, svg);
  el('circle', { cx: 20, cy: 20, r: 11.6, fill: 'none', stroke: '#2e0805', 'stroke-width': 1.3, 'stroke-opacity': '.7' }, svg);
  el('path', { d: 'M9.2,23.6 A11.6,11.6 0 0 0 30.8,23.6', fill: 'none', stroke: '#f0a090', 'stroke-width': 0.9, 'stroke-opacity': '.45', 'stroke-linecap': 'round' }, svg);
  // the key, raised in the face: shadowed below, caught by the light above
  const key = 'M13.6,20 a2.9,2.9 0 1 0 5.8,0 a2.9,2.9 0 1 0 -5.8,0 Z M19.4,20 H27.2 M24.2,20 v2.7 M26.8,20 v3.4';
  el('path', { d: key, transform: 'translate(.5 .7)', fill: 'none', stroke: '#2a0704', 'stroke-width': 1.7, 'stroke-linecap': 'round', 'stroke-opacity': '.75' }, svg);
  el('path', { d: key, fill: 'none', stroke: '#d9786a', 'stroke-width': 1.5, 'stroke-linecap': 'round' }, svg);
  el('path', { d: key, transform: 'translate(-.35 -.45)', fill: 'none', stroke: '#ffd2c4', 'stroke-width': 0.5, 'stroke-linecap': 'round', 'stroke-opacity': '.6' }, svg);
  // the shine on the wax
  el('path', { d: 'M8.4,15.2 Q11,8.6 18,6.9', fill: 'none', stroke: '#ffe0d6', 'stroke-width': 1.4, 'stroke-linecap': 'round', 'stroke-opacity': '.4' }, svg);
  return svg;
}
