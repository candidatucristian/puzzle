// The Trophy Wall's five medal ribbons, woven: each its country's flag as a
// medal ribbon wears it (flags/trophies.js RIBBON), drawn flat for
// medal_ribbons.py to weave into silk. Across the ribbon (u) its stripes, down
// it (v) its length; Finland's cross and Brazil's globe where they fall.
//
//   node art/blender/medal_ribbons.mjs   → .artifacts/medals-real/ribbon-<CODE>.png
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
const require = createRequire(new URL("../../package.json", import.meta.url));
const sharp = require("sharp");
const path = (rel) => decodeURIComponent(new URL(`../../${rel}`, import.meta.url).pathname).replace(/^\/(\w:)/, "$1");
const out = path(".artifacts/medals-real/");
mkdirSync(out, { recursive: true });

// (as trophies.js has them)
const RIBBON = {
  DE: { stripes: ["#151517", "#c8201b", "#f2c21c"] },
  BR: { stripes: ["#f2cf1e", "#0b8a40", "#0b8a40", "#0b8a40", "#f2cf1e"], globe: true },
  IE: { stripes: ["#14905a", "#f3f1ea", "#f08a3e"] },
  FI: { stripes: ["#f3f3ef"], cross: "#123f8f" },
  NG: { stripes: ["#0a7f4a", "#f3f1ea", "#0a7f4a"] },
};
// how long each hangs, against its width (trophies.js lens, + its fold over the shelf: 14)
const LONG = { DE: 150 + 14, BR: 92 + 14, IE: 104 + 14, FI: 98 + 14, NG: 92 + 14 };
const W = 46, PX = 12;

for (const [code, r] of Object.entries(RIBBON)) {
  const h = LONG[code], n = r.stripes.length;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W * PX}" height="${h * PX}" viewBox="0 0 ${W} ${h}">`;
  r.stripes.forEach((c, i) => { s += `<rect x="${(i * W) / n}" y="0" width="${W / n + 0.05}" height="${h}" fill="${c}"/>`; });
  if (r.cross) {
    s += `<rect x="${W * 0.38}" y="0" width="${W * 0.24}" height="${h}" fill="${r.cross}"/>`;
    s += `<rect x="0" y="${14 + (h - 14) * 0.28}" width="${W}" height="${W * 0.24}" fill="${r.cross}"/>`;
  }
  if (r.globe) {
    const gy = 14 + (h - 14) * 0.42, gr = W * 0.15;
    s += `<circle cx="${W / 2}" cy="${gy}" r="${gr}" fill="#1f3f86"/>`;
    s += `<path d="M ${W / 2 - gr * 0.95} ${gy + gr * 0.1} Q ${W / 2} ${gy - gr * 0.55} ${W / 2 + gr * 0.95} ${gy + gr * 0.25}" stroke="#f3f1ea" stroke-width="${gr * 0.2}" fill="none"/>`;
  }
  s += `</svg>`;
  await sharp(Buffer.from(s)).png().toFile(`${out}ribbon-${code}.png`);
}
console.log("ribbons", Object.keys(RIBBON).join(" "));
