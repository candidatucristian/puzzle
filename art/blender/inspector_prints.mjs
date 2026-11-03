// What is printed, typed and stamped on the Inspector's Desk paper
// (inspector_scene.py lays each on its paper by UV):
//   notebook-page   the pocket book's leaf: a faint 5 mm squared grid in
//                   blue-grey, no margin rule (the page is written on
//                   across its whole width) — 104 x 192 mm
//   spiral-notes, spiral-sketch   the spiral notebook's two open leaves,
//                   150 x 205 mm: the left plain (the game rules its lines,
//                   so they run on with what is written), the right squared
//                   5 mm in blue-grey; each punched for the coil down its
//                   inner edge
//   stamp           a rubber stamp's impression, CONFIDENTIAL (white on clear)
//   minute-sheet    the file's minute sheet: its printed head and form number,
//                   CONFIDENTIAL stamped low on it — 205 x 285 mm (the index is
//                   typed over it by the game)
//   file-label      the gummed label on the folder's tab, typed
//   photo, photo-study  police photographs of the hall and the study
//   index-card      an index card in his hand
//   settings-form   the form on his clipboard: its printed head only
//
//   node art/blender/inspector_prints.mjs
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
const require = createRequire(new URL("../../package.json", import.meta.url));
const sharp = require("sharp");
const path = (rel) => decodeURIComponent(new URL(`../../${rel}`, import.meta.url).pathname).replace(/^\/(\w:)/, "$1");
const OUT = path(".artifacts/inspector-desk/prints");
mkdirSync(OUT, { recursive: true });
const png = (svg, name) => sharp(Buffer.from(svg)).png().toFile(`${OUT}/${name}.png`).then(() => console.log(name));
const SERIF = "Georgia, 'Times New Roman', serif", TYPE = "'Courier New', Courier, monospace";
// a little unevenness in printed and stamped ink: the press, the rubber
// (`mean`: how much of the ink comes off, on the whole)
const grain = (id, freq = 0.9, k = 2.2, mean = 0.92) => `<filter id="${id}" x="0" y="0" width="100%" height="100%">
  <feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="3" seed="7" result="n"/>
  <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${k} ${(mean - 0.5 * k).toFixed(3)}" result="m"/>
  <feComposite in="SourceGraphic" in2="m" operator="in"/></filter>`;

// ── the pocket book's leaf (20 px a millimetre) ────────────────────────────
{
  const W = 2080, H = 3840, mm = 20, lines = [];
  for (let x = 0; x <= W; x += 5 * mm) lines.push(`<path d="M${x} 0V${H}"/>`);
  for (let y = 0; y <= H; y += 5 * mm) lines.push(`<path d="M0 ${y}H${W}"/>`);
  await png(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>${grain("g", 0.7, 1.6)}</defs>
    <rect width="${W}" height="${H}" fill="#fff"/>
    <g filter="url(#g)">
      <g stroke="#7f95ad" stroke-opacity=".5" stroke-width="2.2">${lines.join("")}</g>
    </g></svg>`, "notebook-page");
}

// ── the spiral notebook's two leaves (12 px a millimetre): punched down the
//    inner edge for the coil, 24 holes 4 mm across at a third of an inch,
//    their centres 5.5 mm in; the right leaf squared ──────────────────────
{
  const mm = 12, W = 150 * mm, H = 205 * mm;
  const PITCH = 8.4667, FIRST = 6.0, R = 2.0, IN = 5.5;      // (inspector_scene.py's coil keeps to these)
  const holes = (x) => Array.from({ length: 24 }, (_, k) =>
    `<circle cx="${x}" cy="${(FIRST + k * PITCH) * mm}" r="${R * mm}"/>`).join("");
  const grid = [];
  for (let x = 0; x <= W; x += 5 * mm) grid.push(`<path d="M${x} 0V${H}"/>`);
  for (let y = 0; y <= H; y += 5 * mm) grid.push(`<path d="M0 ${y}H${W}"/>`);
  for (const [name, inner, squared] of [["spiral-notes", W - IN * mm, false], ["spiral-sketch", IN * mm, true]]) {
    await png(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      <defs>${grain("g", 0.7, 1.6)}<radialGradient id="h"><stop offset=".82" stop-color="#0b0a08"/><stop offset="1" stop-color="#24201b"/></radialGradient></defs>
      <rect width="${W}" height="${H}" fill="#fff"/>
      ${squared ? `<g filter="url(#g)"><g stroke="#7f95ad" stroke-opacity=".5" stroke-width="1.4">${grid.join("")}</g></g>` : ""}
      <g fill="url(#h)">${holes(inner)}</g>
    </svg>`, name);
  }
}

// ── the rubber stamp: the ink's coverage, white on clear ───────────────────
{
  const W = 1760, H = 420;
  await png(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>${grain("g", 0.55, 3.1, 0.74)}</defs>
    <g filter="url(#g)" fill="none" stroke="#fff">
      <rect x="22" y="22" width="${W - 44}" height="${H - 44}" rx="18" stroke-width="16"/>
      <rect x="56" y="56" width="${W - 112}" height="${H - 112}" rx="8" stroke-width="6"/>
      <text x="${W / 2}" y="${H / 2 + 62}" text-anchor="middle" font-family="${SERIF}" font-weight="bold" font-size="150" letter-spacing="14" fill="#fff" stroke="none">CONFIDENTIAL</text>
    </g></svg>`, "stamp");
}

// ── the minute sheet (10 px a millimetre) ──────────────────────────────────
{
  const W = 2050, H = 2850;
  await png(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>${grain("g", 0.8, 1.8)}</defs>
    <rect width="${W}" height="${H}" fill="#fff"/>
    <g filter="url(#g)" fill="#2b2620" font-family="${SERIF}">
      <text x="${W / 2}" y="118" text-anchor="middle" font-size="52" letter-spacing="14">MINUTE SHEET</text>
      <path d="M150 158H${W - 150}M150 170H${W - 150}" stroke="#2b2620" stroke-width="3"/>
      <text x="${W - 150}" y="${H - 80}" text-anchor="end" font-size="30" font-style="italic" fill-opacity=".8">Form 4 · C.I.D.</text>
    </g></svg>`, "minute-sheet-plain");
  // CONFIDENTIAL, stamped low on the left, a little askew, in red ink
  const ink = await sharp(`${OUT}/stamp.png`).resize(880).toBuffer();
  const red = await sharp({ create: { width: 880, height: 210, channels: 3, background: "#a3271c" } }).joinChannel(await sharp(ink).extractChannel(3).linear(0.86, 0).toBuffer()).png().toBuffer();
  const tilted = await sharp(red).rotate(-7, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  await sharp(`${OUT}/minute-sheet-plain.png`).composite([{ input: tilted, left: 150, top: H - 620, blend: "multiply" }]).png().toFile(`${OUT}/minute-sheet.png`);
  console.log("minute-sheet");
}

// ── the label on the folder's tab (10 px a millimetre) ─────────────────────
{
  const W = 760, H = 240;
  await png(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>${grain("g", 0.9, 2)}</defs>
    <rect width="${W}" height="${H}" fill="#fff"/>
    <g filter="url(#g)">
      <rect x="16" y="16" width="${W - 32}" height="${H - 32}" fill="none" stroke="#b34a3f" stroke-width="5"/>
      <rect x="28" y="28" width="${W - 56}" height="${H - 56}" fill="none" stroke="#b34a3f" stroke-width="2"/>
      <text x="${W / 2}" y="110" text-anchor="middle" font-family="${TYPE}" font-weight="bold" font-size="58" fill="#26221c">61 / 1013</text>
      <text x="${W / 2}" y="180" text-anchor="middle" font-family="${TYPE}" font-weight="bold" font-size="44" letter-spacing="4" fill="#26221c">ASHCOMBE</text>
    </g></svg>`, "file-label");
}

// ── a photograph of the house's hall, as the police photographer printed it:
//    silver-gelatin, warm-toned, in its white border ───────────────────────
{
  const hall = path("public/assets/images/Botany/hall-ground-render-v1.webp");
  const pic = await sharp(hall).resize(1100, 740, { fit: "cover" }).greyscale().linear(1.18, -10).toColourspace("b-w").toBuffer();
  const toned = await sharp(pic).tint({ r: 214, g: 196, b: 168 }).toBuffer();
  await sharp(toned).extend({ top: 46, bottom: 46, left: 46, right: 46, background: "#f2ece0" })
    .composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1192" height="832"><defs>${grain("g", 0.9, 1.5, 0.12)}</defs><rect width="1192" height="832" fill="#6b5a44" filter="url(#g)"/></svg>`), blend: "multiply" }])
    .png().toFile(`${OUT}/photo.png`);
  console.log("photo");
}

// ── a second photograph: the study, as the police photographer saw it ──────
{
  const study = path("public/assets/images/Room1/room1-lights-1-render-v7.webp");
  const pic = await sharp(study).resize(1100, 740, { fit: "cover", position: "left" }).greyscale().linear(1.25, -14).toBuffer();
  const toned = await sharp(pic).tint({ r: 210, g: 194, b: 170 }).toBuffer();
  await sharp(toned).extend({ top: 46, bottom: 46, left: 46, right: 46, background: "#efe8da" }).png().toFile(`${OUT}/photo-study.png`);
  console.log("photo-study");
}

// ── an index card in his hand: who lived there, and when ───────────────────
{
  const W = 1270, H = 760, rule = (y) => `<path d="M40 ${y}H${W - 40}"/>`;
  const lines = [178, 268, 358, 448, 538, 628].map(rule).join("");
  await png(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>${grain("g", 0.8, 1.8)}</defs>
    <rect width="${W}" height="${H}" fill="#fff"/>
    <g filter="url(#g)">
      <path d="M40 104H${W - 40}" stroke="#c0574e" stroke-opacity=".7" stroke-width="3"/>
      <g stroke="#7f95ad" stroke-opacity=".55" stroke-width="2.2">${lines}</g>
      <g fill="#2c3a55" font-family="'Segoe Print', 'Ink Free', cursive" font-size="58">
        <text x="70" y="86">Ashcombe House</text>
        <text x="70" y="250" font-size="52">Ivy · Silas · Orion</text>
        <text x="70" y="340" font-size="52">13 Oct. 1961 — doors locked</text>
        <text x="70" y="430" font-size="52">Who left the letters?</text>
      </g>
    </g></svg>`, "index-card");
}

// ── the settings form on his clipboard: its printed head and number only
//    (the game types the rest on it) — 210 x 280 mm, 10 px a millimetre ──
{
  const W = 2100, H = 2800;
  await png(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>${grain("g", 0.8, 1.8)}</defs>
    <rect width="${W}" height="${H}" fill="#fff"/>
    <g filter="url(#g)" fill="#2b2620" font-family="${SERIF}">
      <text x="150" y="250" font-size="40" letter-spacing="8">ASHCOMBE · INSPECTOR&#8217;S DESK</text>
      <text x="${W - 150}" y="250" text-anchor="end" font-size="40" font-style="italic">Form S.1</text>
      <path d="M150 290H${W - 150}M150 302H${W - 150}" stroke="#2b2620" stroke-width="3"/>
      <path d="M150 ${H - 170}H${W - 150}" stroke="#2b2620" stroke-width="2"/>
      <text x="150" y="${H - 110}" font-size="30" font-style="italic" fill-opacity=".8">To be kept by the officer, and altered as he sees fit.</text>
    </g></svg>`, "settings-form");
}
