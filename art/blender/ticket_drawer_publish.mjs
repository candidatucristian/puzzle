// The Ticket Drawer (ticket_drawer.py → .artifacts/ticket-drawer) into the
// game: the plate, and where it all fell in the picture
// (src/levels/station/ticketDrawer.json).
//
//   node art/blender/ticket_drawer_publish.mjs
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
const require = createRequire(new URL("../../package.json", import.meta.url));
const sharp = require("sharp");
const path = (rel) => decodeURIComponent(new URL(`../../${rel}`, import.meta.url).pathname).replace(/^\/(\w:)/, "$1");
const source = path(".artifacts/ticket-drawer"), target = path("public/assets/images/Station");
mkdirSync(target, { recursive: true });
const layout = JSON.parse(readFileSync(`${source}/ticketDrawer.json`, "utf8"));
const v = layout.version;
await sharp(`${source}/plate.png`).webp({ quality: 90 }).toFile(`${target}/ticket-drawer-v${v}.webp`);
console.log(`ticket-drawer-v${v}.webp`);
writeFileSync(path("src/levels/station/ticketDrawer.json"), JSON.stringify(layout, null, 1) + "\n");
console.log("ticketDrawer.json");
