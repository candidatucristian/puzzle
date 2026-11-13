// Writes public/licenses/THIRD-PARTY-NOTICES.txt: what the game is made with
// that is someone else's, under what licence, with the licence texts the
// licences ask to travel with it (the MIT texts copied from node_modules; the
// fonts' OFL texts are shipped beside the fonts in assets/fonts/ui). Run it
// again whenever a library, a font or a source of art or sound changes.
//
//   node scripts/third-party-notices.mjs
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const read = (rel) => readFileSync(new URL(rel, root), "utf8").trim();
const version = (pkg) => JSON.parse(read(`node_modules/${pkg}/package.json`)).version;
const rule = "=".repeat(78);

const libraries = [
  ["Phaser", "phaser", "node_modules/phaser/LICENSE.md"],
  ["three.js", "three", "node_modules/three/LICENSE"],
  ["shader-doodle", "shader-doodle", "node_modules/shader-doodle/LICENSE"],
  ["EventEmitter3 (bundled with Phaser)", "eventemitter3", "node_modules/eventemitter3/LICENSE"],
];

const text = `THIRD-PARTY NOTICES — Ashcombe Manor

The game includes the following works by others. Each is used under the
licence named with it; the texts that the licences require to be shipped
are given below or beside the files they cover.

${rule}
FONTS
${rule}

Etude Noire (Light, Regular, Medium, Bold)
  Dimitri Antonov / Blue Curve Designstudio — https://www.behance.net/ed67b3fc
  Licence: Creative Commons Attribution 4.0 International (CC BY 4.0)
  https://creativecommons.org/licenses/by/4.0/
  Used unmodified. Its own notice: assets/fonts/EtudeNoir/readme (1).txt

DM Serif Display — Colophon Foundry; based on Source Serif by Adobe
Cormorant Garamond — Christian Thalmann, the Cormorant Project Authors
IBM Plex Sans, IBM Plex Mono — IBM Corp.
  Licence: SIL Open Font License 1.1 (OFL). Shipped unmodified, each with its
  licence text in assets/fonts/ui/ (*-OFL.txt).

Noto Sans SC, Noto Serif SC — Google and Adobe, the Noto project contributors
  Licence: SIL Open Font License 1.1 (OFL). Shipped unmodified with their
  full copyright and licence notices in assets/fonts/cjk/ (*-OFL.txt).
  Sources: https://github.com/google/fonts/tree/main/ofl/notosanssc
           https://github.com/google/fonts/tree/main/ofl/notoserifsc

Architects Daughter — Kimberly Geswein (SIL Open Font License 1.1)
Dancing Script — Pablo Impallari (SIL Open Font License 1.1)
Special Elite — Astigmatic (Apache License 2.0)
  Loaded from Google Fonts. (When they are shipped with the game, their
  licence texts are shipped beside them.)

Labrada — the favicon's lettering (SIL Open Font License 1.1)

${rule}
TEXTURES AND 3D MODELS
${rule}

The rooms and objects are modelled and rendered in Blender (Cycles) by the
developer. Surface scans and some models come from:
  Poly Haven — https://polyhaven.com — CC0 1.0 (public domain)
  ambientCG — https://ambientcg.com — CC0 1.0 (public domain)
No attribution is required; they are credited with thanks.

${rule}
SOUND
${rule}

Sound effects and music: Pixabay — https://pixabay.com
  Pixabay Content License — https://pixabay.com/service/license-summary/
  (the source page of each file is recorded in docs/SOUND_SOURCES.md)

${rule}
TRADEMARKS
${rule}

Steam and the Steam logo are trademarks and/or registered trademarks of Valve
Corporation in the U.S. and/or other countries. The logo's outline on the end
of the demo's store button is from Simple Icons — https://simpleicons.org —
CC0 1.0.

${rule}
SOFTWARE
${rule}
${libraries.map(([name, pkg, file]) => `
${name} ${version(pkg)}
${"-".repeat(78)}
${read(file)}
`).join("")}`;

mkdirSync(new URL("public/licenses/", root), { recursive: true });
writeFileSync(new URL("public/licenses/THIRD-PARTY-NOTICES.txt", root), text.replace(/\r\n/g, "\n") + "\n");
console.log("public/licenses/THIRD-PARTY-NOTICES.txt");
