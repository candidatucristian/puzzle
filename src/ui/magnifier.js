import { paintLens } from "../shared/loupe.js";

// The magnifying glass — the one from the chemistry bench, brass rim and
// turned wooden handle: held over the picture, it shows what is under it
// larger. It does not point anything out; it only lets small things be seen.
// Hold the right mouse button down over the picture, or press Z to take it
// up and Z (or Esc) to put it down.

const R = 100; // the lens's radius on the screen, in CSS pixels
const SHEET = R * 5; // the glass and its handle are drawn on a sheet this wide
const POWER = 2.4; // how much it enlarges

export function mountMagnifier(scope, game) {
  const stage = document.getElementById("game-container");
  const viewport = document.getElementById("game-viewport");
  if (!stage || !viewport) return { toggle() {}, off() {}, on: false };
  const lens = document.createElement("canvas");
  lens.id = "magnifier";
  lens.setAttribute("aria-hidden", "true");
  lens.hidden = true;
  viewport.appendChild(lens);
  scope.add(() => lens.remove());
  const ctx = lens.getContext("2d");
  let held = false, toggled = false, at = null, last = null, glass = null, dpr = 0;

  const active = () => held || toggled;
  function place(e) {
    const box = viewport.getBoundingClientRect();
    at = { x: e.clientX, y: e.clientY };
    lens.style.left = `${e.clientX - box.left - SHEET / 2}px`;
    lens.style.top = `${e.clientY - box.top - SHEET / 2}px`;
  }
  function show(on) {
    lens.hidden = !on;
    document.body.classList.toggle("magnifying", on);
  }
  // drawn just after the game has drawn its frame, while the picture is there to be read
  function draw() {
    if (!active() || !at) return;
    const ratio = window.devicePixelRatio || 1;
    if (ratio !== dpr) {
      dpr = ratio;
      lens.width = lens.height = Math.round(SHEET * dpr);
      glass = paintLens(R * dpr * 0.5); // its sheet comes out at twice its size
    }
    const canvas = game.canvas, box = canvas.getBoundingClientRect();
    const kx = canvas.width / box.width, ky = canvas.height / box.height;
    const span = (R * 2) / POWER;
    const sx = (at.x - box.left - span / 2) * kx, sy = (at.y - box.top - span / 2) * ky;
    const c = lens.width / 2, r = R * dpr;
    ctx.clearRect(0, 0, lens.width, lens.height);
    // what is under the glass, larger, inside its ring
    ctx.save();
    ctx.beginPath(); ctx.arc(c, c, r, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = "#050505";
    ctx.fillRect(c - r, c - r, r * 2, r * 2);
    try { ctx.drawImage(canvas, sx, sy, span * kx, span * ky, c - r, c - r, r * 2, r * 2); } catch { /* nothing to read yet */ }
    ctx.restore();
    // the glass itself: its rim, its handle, the light on it
    ctx.drawImage(glass, 0, 0, lens.width, lens.height);
  }
  game.events.on("postrender", draw);
  scope.add(() => game.events.off("postrender", draw));

  scope.on(stage, "contextmenu", (e) => e.preventDefault());
  scope.on(stage, "pointerdown", (e) => {
    if (e.button !== 2) return;
    held = true; place(e); show(true);
  });
  scope.on(window, "pointerup", (e) => {
    if (e.button !== 2 || !held) return;
    held = false; show(active());
  });
  scope.on(window, "pointermove", (e) => { last = { clientX: e.clientX, clientY: e.clientY }; if (active()) place(e); });
  return {
    toggle() {
      toggled = !toggled;
      if (toggled && last) place(last);
      else if (toggled && !at) {
        const box = stage.getBoundingClientRect();
        place({ clientX: box.left + box.width / 2, clientY: box.top + box.height / 2 });
      }
      show(active());
    },
    get on() { return active(); },
    off() { toggled = false; held = false; show(false); },
  };
}
