/** The television set, painted dark: a mid-century cabinet in deep walnut,
 *  its grain running long across it with a knot or two, on four splayed
 *  legs with brass ferrules; a frame of darker wood round the tube with a
 *  fine brass fillet, woven cloth gone almost black over the speakers,
 *  knobs turned from dark wood with brass rims and pointers, a little
 *  channel dial, an amber pilot light. Built as SVG in the cabinet's own
 *  600×480 coordinates (the legs reach below), so it scales with the
 *  screen the shader draws inside it. */

const INK_WOOD_LIGHT = "#4a2c18";
const INK_WOOD = "#2c180c";
const INK_WOOD_DARK = "#120904";

function cabinetDefs() {
  return `<defs>
    <linearGradient id="tv-wood" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3e2414"/>
      <stop offset="0.1" stop-color="${INK_WOOD_LIGHT}"/>
      <stop offset="0.55" stop-color="${INK_WOOD}"/>
      <stop offset="1" stop-color="${INK_WOOD_DARK}"/>
    </linearGradient>
    <linearGradient id="tv-wood-side" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="rgba(0,0,0,0.55)"/>
      <stop offset="0.1" stop-color="rgba(0,0,0,0)"/>
      <stop offset="0.88" stop-color="rgba(0,0,0,0)"/>
      <stop offset="1" stop-color="rgba(255,170,100,0.12)"/>
    </linearGradient>
    <linearGradient id="tv-frame" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3a2212"/>
      <stop offset="0.5" stop-color="#22130a"/>
      <stop offset="1" stop-color="#110804"/>
    </linearGradient>
    <linearGradient id="tv-frame-inset" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0c0603"/>
      <stop offset="1" stop-color="#2e1a0c"/>
    </linearGradient>
    <linearGradient id="tv-brass" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f0d08a"/>
      <stop offset="0.45" stop-color="#a8823e"/>
      <stop offset="1" stop-color="#3e2a10"/>
    </linearGradient>
    <linearGradient id="tv-brass-v" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f0d08a"/>
      <stop offset="0.5" stop-color="#9a7638"/>
      <stop offset="1" stop-color="#3a2810"/>
    </linearGradient>
    <radialGradient id="tv-knob" cx="35%" cy="30%" r="75%">
      <stop offset="0" stop-color="#7a5232"/>
      <stop offset="0.55" stop-color="#3a2212"/>
      <stop offset="1" stop-color="#120804"/>
    </radialGradient>
    <radialGradient id="tv-tube" cx="50%" cy="45%" r="70%">
      <stop offset="0" stop-color="#0a0b10"/>
      <stop offset="1" stop-color="#020203"/>
    </radialGradient>
    <radialGradient id="tv-led" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#ffb857" stop-opacity=".9"/>
      <stop offset="0.35" stop-color="#ff9a3c" stop-opacity=".35"/>
      <stop offset="1" stop-color="#ff9a3c" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="tv-floor" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#000" stop-opacity=".7"/>
      <stop offset="1" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
    <pattern id="tv-cloth" width="6" height="6" patternUnits="userSpaceOnUse">
      <rect width="6" height="6" fill="#2a1c0e"/>
      <path d="M0 3h6M3 0v6" stroke="#0e0804" stroke-width="1.2"/>
      <path d="M0 0.6h6M0.6 0v6" stroke="#7a5a2a" stroke-width=".7" stroke-opacity=".45"/>
    </pattern>
    <linearGradient id="tv-cloth-shade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="rgba(0,0,0,0.55)"/>
      <stop offset="0.3" stop-color="rgba(0,0,0,0)"/>
      <stop offset="1" stop-color="rgba(0,0,0,0.45)"/>
    </linearGradient>
  </defs>`;
}

/** The cabinet, in the .tv box's own coordinates. */
export function cabinetSVG(seed) {
  const rnd = lcg(seed);
  const out = [cabinetDefs()];

  // the shadow it throws on the floor, and the four legs (the back pair
  // first, a little inboard, so the near ones stand in front of them)
  out.push(
    `<ellipse cx="300" cy="560" rx="330" ry="16" fill="url(#tv-floor)"/>`,
  );
  const leg = (x0, x1, near) => {
    const w = near ? 11 : 8;
    const col = near ? "url(#tv-wood)" : INK_WOOD_DARK;
    out.push(
      `<path d="M${x0 - w / 2} 468 L${x0 + w / 2} 468 L${x1 + w * 0.32} 552 L${x1 - w * 0.32} 552 Z" fill="${col}"/>`,
    );
    if (near)
      out.push(
        `<path d="M${x0 - w / 2 + 1.5} 468 L${x1 - w * 0.32 + 1.2} 552" stroke="rgba(255,190,130,0.2)" stroke-width="1.2" fill="none"/>`,
      );
    out.push(
      `<path d="M${x1 - w * 0.36} 544 L${x1 + w * 0.36} 544 L${x1 + w * 0.3} 556 L${x1 - w * 0.3} 556 Z" fill="url(#tv-brass-v)"/>`,
    );
  };
  leg(140, 118, false);
  leg(460, 482, false);
  leg(92, 58, true);
  leg(508, 542, true);
  out.push(
    `<path d="M75 512 L525 512 L525 517 L75 517 Z" fill="${INK_WOOD}"/>`,
    `<path d="M75 512 L525 512" stroke="rgba(255,190,130,0.18)" stroke-width="1"/>`,
  );

  // the cabinet: deep walnut, its long grain and a knot or two
  out.push(
    `<rect x="0" y="0" width="600" height="480" rx="22" fill="url(#tv-wood)"/>`,
    `<rect x="0" y="0" width="600" height="480" rx="22" fill="url(#tv-wood-side)"/>`,
  );
  let grain = "";
  for (let i = 0; i < 46; i++) {
    const y0 = 4 + i * 10.6 + (rnd() - 0.5) * 6;
    const amp = 1.5 + rnd() * 4.5;
    const ph = rnd() * 6.28;
    let d = "";
    for (let x = 4; x <= 596; x += 16) {
      const y =
        y0 +
        Math.sin(x * 0.012 + ph) * amp +
        Math.sin(x * 0.047 + ph * 2) * 1.1;
      d += (x === 4 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1);
    }
    const light = rnd() < 0.22;
    grain += `<path d="${d}" fill="none" stroke="${light ? "rgba(255,180,110,0.06)" : "rgba(0,0,0,0.35)"}" stroke-width="${(0.6 + rnd() * 1.6).toFixed(1)}"/>`;
  }
  for (const [kx, ky] of [
    [90 + rnd() * 60, 20 + rnd() * 10],
    [470 + rnd() * 60, 458 + rnd() * 10],
  ]) {
    for (let k = 0; k < 4; k++) {
      grain += `<ellipse cx="${kx.toFixed(1)}" cy="${ky.toFixed(1)}" rx="${(5 + k * 6).toFixed(1)}" ry="${(2 + k * 2.2).toFixed(1)}" fill="none" stroke="rgba(0,0,0,${(0.45 - k * 0.08).toFixed(2)})" stroke-width="1"/>`;
    }
  }
  out.push(
    `<clipPath id="tv-cab-clip"><rect x="0" y="0" width="600" height="480" rx="22"/></clipPath>`,
    `<g clip-path="url(#tv-cab-clip)">${grain}</g>`,
  );
  out.push(
    `<rect x="1" y="1" width="598" height="478" rx="21" fill="none" stroke="rgba(255,190,130,0.16)" stroke-width="1.4"/>`,
    `<rect x="9" y="9" width="582" height="462" rx="15" fill="none" stroke="url(#tv-brass)" stroke-width="1.2" stroke-opacity=".45"/>`,
    `<path d="M24 2 L576 2" stroke="rgba(190,205,240,0.25)" stroke-width="1.4" stroke-linecap="round"/>`,
  );

  // the frame round the tube: darker wood, stepped, with a brass fillet
  out.push(
    `<rect x="30" y="28" width="540" height="366" rx="14" fill="rgba(0,0,0,0.6)"/>`,
    `<rect x="32" y="30" width="536" height="362" rx="12" fill="url(#tv-frame)"/>`,
    `<rect x="32" y="30" width="536" height="362" rx="12" fill="none" stroke="rgba(255,190,130,0.14)" stroke-width="1"/>`,
    `<rect x="44" y="41" width="512" height="340" rx="9" fill="url(#tv-frame-inset)"/>`,
    `<rect x="47" y="44" width="506" height="334" rx="8" fill="none" stroke="url(#tv-brass)" stroke-width="1.4" stroke-opacity=".8"/>`,
  );

  // the tube's surround: dark glass in a deep curved mask
  out.push(
    `<rect x="60" y="48" width="480" height="326" rx="86" ry="59" fill="url(#tv-tube)"/>`,
    `<rect x="60" y="48" width="480" height="326" rx="86" ry="59" fill="none" stroke="rgba(0,0,0,0.7)" stroke-width="3"/>`,
    `<rect x="64" y="52" width="472" height="318" rx="82" ry="56" fill="none" stroke="rgba(170,190,240,0.1)" stroke-width="1.2"/>`,
  );

  // a small brass plate under the tube, with the maker's name
  out.push(
    `<rect x="258" y="381" width="84" height="12" rx="3" fill="url(#tv-brass-v)" stroke="rgba(30,18,4,0.7)" stroke-width=".8"/>`,
    `<text x="300" y="390" text-anchor="middle" font-family="'Special Elite', monospace" font-size="8.5" letter-spacing="2" fill="#1e1204">DEAD AIR</text>`,
  );

  // the control panel: two speakers in dark cloth behind brass frames, the
  // sockets the knobs sit in, the pilot light
  for (const sx of [44, 396]) {
    out.push(
      `<rect x="${sx}" y="405" width="160" height="56" rx="10" fill="rgba(0,0,0,0.6)"/>`,
      `<rect x="${sx + 2}" y="407" width="156" height="52" rx="9" fill="url(#tv-cloth)"/>`,
      `<rect x="${sx + 2}" y="407" width="156" height="52" rx="9" fill="url(#tv-cloth-shade)"/>`,
      `<rect x="${sx + 1}" y="406" width="158" height="54" rx="9.5" fill="none" stroke="url(#tv-brass)" stroke-width="2"/>`,
    );
    for (let i = 0; i < 4; i++) {
      const gx = sx + 14 + rnd() * 132;
      const gy = 414 + rnd() * 38;
      out.push(
        `<rect x="${gx.toFixed(1)}" y="${gy.toFixed(1)}" width="${(4 + rnd() * 10).toFixed(1)}" height="1" fill="rgba(240,200,130,0.18)"/>`,
      );
    }
  }
  for (const kx of [250, 300, 350]) {
    out.push(
      `<circle cx="${kx}" cy="433" r="25" fill="rgba(0,0,0,0.65)"/>`,
      `<circle cx="${kx}" cy="433" r="24" fill="none" stroke="url(#tv-brass)" stroke-width="1.8"/>`,
      `<circle cx="${kx}" cy="433" r="21" fill="#0c0703"/>`,
    );
  }
  out.push(
    `<circle cx="578" cy="433" r="13" fill="url(#tv-led)"/>`,
    `<circle cx="578" cy="433" r="4.2" fill="#ffb857"/>`,
    `<circle cx="578" cy="433" r="2" fill="#fff4d6"/>`,
    `<circle cx="578" cy="433" r="6" fill="none" stroke="url(#tv-brass)" stroke-width="1.2"/>`,
  );

  return `<svg class="tv__sketch" viewBox="-12 -12 624 600" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${out.join("")}</svg>`;
}

/** A turning knob: dark turned wood, ribbed round its edge, a brass rim and
 *  pointer. The arrow stays upright while the knob itself turns. */
export function knobSVG(arrow) {
  let rot = `<circle r="19" fill="url(#tv-knob)"/>`;
  rot += `<circle r="19" fill="none" stroke="url(#tv-brass)" stroke-width="1.4"/>`;
  rot += `<circle r="13" fill="none" stroke="rgba(0,0,0,0.5)" stroke-width="1"/>`;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    rot += `<line x1="${(Math.cos(a) * 14.5).toFixed(2)}" y1="${(Math.sin(a) * 14.5).toFixed(2)}" x2="${(Math.cos(a) * 18.2).toFixed(2)}" y2="${(Math.sin(a) * 18.2).toFixed(2)}" stroke="rgba(0,0,0,0.55)" stroke-width="1.3"/>`;
  }
  rot += `<path d="M-2 -6 L0 -16.5 L2 -6 Z" fill="url(#tv-brass-v)" stroke="rgba(30,18,4,0.7)" stroke-width=".6"/>`;
  // the gradients come from the cabinet's defs, in the same document
  return (
    `<svg viewBox="-24 -24 48 48" xmlns="http://www.w3.org/2000/svg">` +
    `<circle r="20.5" fill="rgba(0,0,0,0.6)"/>` +
    `<g class="rot">${rot}</g>` +
    `<text x="0" y="4" text-anchor="middle" font-family="'Special Elite', monospace" font-size="15" fill="#e0c07a">${arrow}</text>` +
    `</svg>`
  );
}

/** The channel dial: a dark wooden face, four brass ticks, a red needle. */
export function dialSVG() {
  let s = `<circle r="20.5" fill="rgba(0,0,0,0.6)"/>`;
  s += `<circle r="19" fill="url(#tv-knob)"/>`;
  s += `<circle r="19" fill="none" stroke="url(#tv-brass)" stroke-width="1.4"/>`;
  for (let i = 0; i < 4; i++) {
    const a = ((-54 + i * 36) * Math.PI) / 180;
    s += `<line x1="${(Math.sin(a) * 13).toFixed(2)}" y1="${(-Math.cos(a) * 13).toFixed(2)}" x2="${(Math.sin(a) * 17).toFixed(2)}" y2="${(-Math.cos(a) * 17).toFixed(2)}" stroke="#c8a050" stroke-width="2" stroke-linecap="round"/>`;
    s += `<text x="${(Math.sin(a) * 22.5).toFixed(2)}" y="${(-Math.cos(a) * 22.5 + 2.2).toFixed(2)}" text-anchor="middle" font-family="'Special Elite', monospace" font-size="6" fill="#c8a050">${i + 1}</text>`;
  }
  const needle =
    `<path d="M-1.6 3 L0 -15 L1.6 3 Z" fill="#c62a1f"/>` +
    `<circle r="3" fill="url(#tv-brass)" stroke="rgba(30,18,4,0.7)" stroke-width=".6"/>`;
  return `<svg viewBox="-24 -24 48 48" xmlns="http://www.w3.org/2000/svg">${s}<g class="rot needle">${needle}</g></svg>`;
}

function lcg(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
