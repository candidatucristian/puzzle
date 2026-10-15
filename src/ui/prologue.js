import { soft, grain, vignette, lcg } from "../shared/paint.js";
import { paintEnvelope } from "../shared/envelope.js";
import { letterById, CASE } from "../shared/story.js";
import { renderLetter } from "./letterPage.js";

// The prologue: the night the letter comes to Inspector Arthur Wren. Told by
// the film of it, if there is one (FILM: him at his desk, opening and reading
// the letter) — a click begins it, as a film with sound must be begun, and it
// can be skipped; or else by his desk painted, the envelope on it to be
// clicked. Either way the letter itself is then laid out to be read, on the
// house's own paper, and put down: "Go to Ashcombe House". Shown once, before
// the house is first seen; the letter goes into the case file.

const FILM = "assets/video/prologue.mp4";

export function playPrologue(scope, options) {
  const film = document.createElement("video");
  film.preload = "auto";
  film.playsInline = true;
  let decided = false;
  const decide = (ok) => {
    if (decided) return;
    decided = true;
    if (ok) playFilm(scope, film, options);
    else { film.removeAttribute("src"); film.load(); playDesk(scope, options); }
  };
  scope.on(film, "loadedmetadata", () => decide(true));
  scope.on(film, "error", () => decide(false));
  scope.later(() => decide(false), 4000);
  film.src = FILM;
}

// the curtain the prologue is played on, and the letter laid out to be read
// at the end of it, with the way on
function stage(scope, { onDone, reducedMotion = false }) {
  const root = document.createElement("div");
  root.id = "prologue";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-label", "A letter for the Inspector");
  const reading = document.createElement("div");
  reading.className = "prologue-reading";
  reading.hidden = true;
  const sheet = document.createElement("div");
  sheet.className = "prologue-sheet";
  const go = document.createElement("button");
  go.type = "button";
  go.className = "prologue-go";
  go.textContent = "Go to Ashcombe House →";
  reading.append(sheet, go);
  root.append(reading);
  document.body.append(root);
  requestAnimationFrame(() => root.classList.add("is-shown"));
  let state = "before";
  const read = () => {
    if (state !== "before") return;
    state = "reading";
    reading.hidden = false;
    renderLetter(sheet, letterById("invitation"));
    requestAnimationFrame(() => reading.classList.add("is-shown"));
    go.focus({ preventScroll: true });
  };
  const leave = () => {
    if (state !== "reading") return;
    state = "gone";
    onDone?.();
    scope.later(() => root.classList.remove("is-shown"), reducedMotion ? 0 : 400);
    scope.later(() => root.remove(), reducedMotion ? 0 : 1200);
  };
  scope.on(go, "click", leave);
  scope.on(window, "keydown", (event) => {
    if (state === "reading" && event.key === "Escape") { event.preventDefault(); leave(); }
  });
  return { root, read, get state() { return state; } };
}

// The film: a black screen and "Begin the case"; then the film, with Skip;
// at its end, the letter.
function playFilm(scope, film, options) {
  const { root, read } = stage(scope, options);
  film.className = "prologue-film";
  const begin = document.createElement("button");
  begin.type = "button";
  begin.className = "prologue-begin";
  begin.innerHTML = `<span class="prologue-begin-who"></span><span class="prologue-begin-play">Begin the case</span>`;
  begin.querySelector(".prologue-begin-who").textContent = `${CASE.detective} · Exeter, October 2001`;
  const skip = document.createElement("button");
  skip.type = "button";
  skip.className = "prologue-skip";
  skip.textContent = "Skip ›";
  skip.hidden = true;
  root.prepend(film);
  root.append(begin, skip);
  const done = () => {
    if (film.dataset.done) return;
    film.dataset.done = "1";
    skip.hidden = true;
    film.pause();
    film.classList.add("is-done");
    read();
  };
  scope.on(begin, "click", () => {
    begin.hidden = true;
    skip.hidden = false;
    film.classList.add("is-playing");
    film.play().catch(() => done());
  });
  scope.on(skip, "click", done);
  scope.on(film, "ended", done);
  scope.add(() => film.pause());
  begin.focus({ preventScroll: true });
}

// The desk painted: the envelope on it to be clicked, and the letter.
function playDesk(scope, options) {
  const letter = stage(scope, options), root = letter.root;
  const canvas = document.createElement("canvas");
  canvas.className = "prologue-desk";
  canvas.setAttribute("aria-hidden", "true");
  const caption = document.createElement("div");
  caption.className = "prologue-caption";
  caption.innerHTML = `<p class="prologue-name"></p><p class="prologue-where"></p>`;
  caption.querySelector(".prologue-name").textContent = CASE.detective;
  caption.querySelector(".prologue-where").textContent = "Exeter · a wet night in October, 2001";
  const envelope = document.createElement("button");
  envelope.type = "button";
  envelope.className = "prologue-envelope";
  envelope.setAttribute("aria-label", "Open the letter");
  envelope.dataset.tip = "Open the letter";
  const prompt = document.createElement("p");
  prompt.className = "prologue-prompt";
  prompt.textContent = "A letter has come. Open it.";
  root.prepend(canvas, caption, envelope, prompt);

  // the desk, painted to the window's size; the envelope's place on it
  const paint = () => {
    const W = window.innerWidth, H = window.innerHeight;
    canvas.width = W; canvas.height = H;
    const box = paintDesk(canvas.getContext("2d"), W, H);
    Object.assign(envelope.style, { left: `${box.x}px`, top: `${box.y}px`, width: `${box.w}px`, height: `${box.h}px` });
  };
  paint();
  // (the file's typewritten label wants its face)
  document.fonts?.ready.then(() => { if (root.isConnected) paint(); });
  scope.on(window, "resize", paint);
  const open = () => {
    if (letter.state !== "before") return;
    envelope.hidden = true;
    prompt.hidden = true;
    letter.read();
  };
  scope.on(envelope, "click", open);
  scope.on(window, "keydown", (event) => {
    if (letter.state === "before" && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); open(); }
  });
}

const grad = (g, x0, y0, x1, y1, stops) => {
  const r = g.createLinearGradient(x0, y0, x1, y1);
  stops.forEach((col, i) => r.addColorStop(i / (stops.length - 1), col));
  return r;
};

// The Inspector's desk at night, seen from his chair: the wall and the rainy
// window behind, the desk's top running toward us, the lamp, the file, the
// tea, the pen, the spectacles — and the envelope. Returns where the
// envelope lies on the screen.
function paintDesk(g, W, H) {
  const u = Math.min(W / 1000, H / 700);
  const edge = H * 0.36;
  const rnd = lcg(2001);
  // the wall: dark green paper, a faint stripe
  g.fillStyle = grad(g, 0, 0, 0, edge, ["#0f1714", "#18231f"]);
  g.fillRect(0, 0, W, edge);
  for (let x = 0; x < W; x += 26 * u) { g.fillStyle = "rgba(190,220,200,0.025)"; g.fillRect(x, 0, 10 * u, edge); }
  // the window on the right: the street at night, the rain running down it
  const wx = W * 0.66, wy = edge * 0.12, ww = W * 0.26, wh = edge * 0.78;
  g.fillStyle = grad(g, 0, wy, 0, wy + wh, ["#0c1626", "#1c2c44"]);
  g.fillRect(wx, wy, ww, wh);
  soft(g, wx + ww * 0.7, wy + wh * 0.75, ww * 0.25, wh * 0.3, "255,200,120", 0.35, "lighter"); // a street lamp below
  for (let i = 0; i < 70; i++) {
    const x = wx + rnd() * ww, y = wy + rnd() * wh, l = (6 + rnd() * 18) * u;
    g.strokeStyle = `rgba(200,220,255,${(0.08 + rnd() * 0.18).toFixed(2)})`; g.lineWidth = Math.max(0.6, 0.8 * u);
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + 1.5 * u, y + l); g.stroke();
  }
  g.strokeStyle = "#2a1c10"; g.lineWidth = 6 * u; g.strokeRect(wx, wy, ww, wh);
  g.lineWidth = 3 * u;
  g.beginPath(); g.moveTo(wx + ww / 2, wy); g.lineTo(wx + ww / 2, wy + wh); g.moveTo(wx, wy + wh / 2); g.lineTo(wx + ww, wy + wh / 2); g.stroke();
  // the desk top, running toward us, its grain
  g.fillStyle = grad(g, 0, edge, 0, H, ["#2a170c", "#4a2c16", "#5a361c"]);
  g.fillRect(0, edge, W, H - edge);
  for (let i = 0; i < 60; i++) {
    const y = edge + rnd() * (H - edge);
    g.strokeStyle = `rgba(${rnd() < 0.5 ? "0,0,0" : "255,200,150"},${(0.03 + rnd() * 0.05).toFixed(3)})`; g.lineWidth = (1 + rnd() * 2) * u;
    g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(W * 0.3, y + (rnd() - 0.5) * 10 * u, W * 0.7, y + (rnd() - 0.5) * 10 * u, W, y); g.stroke();
  }
  g.fillStyle = "rgba(255,210,170,0.2)"; g.fillRect(0, edge, W, 2 * u);
  // the green leather blotter in the middle
  const bx = W * 0.22, by = edge + (H - edge) * 0.14, bw = W * 0.56, bh = (H - edge) * 0.8;
  g.fillStyle = "#1c3626"; g.fillRect(bx, by, bw, bh);
  g.strokeStyle = "rgba(200,170,90,0.4)"; g.lineWidth = 1.5 * u; g.strokeRect(bx + 8 * u, by + 8 * u, bw - 16 * u, bh - 16 * u);
  // the lamp's light pooled on the desk
  soft(g, W * 0.3, edge + (H - edge) * 0.32, W * 0.42, (H - edge) * 0.6, "255,196,120", 0.32, "lighter");
  // the Ashcombe file, open-cornered, its typed label and its stamp
  g.save();
  g.translate(W * 0.33, edge + (H - edge) * 0.42); g.rotate(-0.07);
  const fw = 250 * u, fh = 180 * u;
  g.fillStyle = "rgba(0,0,0,0.4)"; g.fillRect(-fw / 2 + 6 * u, -fh / 2 + 8 * u, fw, fh);
  g.fillStyle = grad(g, -fw / 2, 0, fw / 2, 0, ["#b89a62", "#d4b87c"]);
  g.fillRect(-fw / 2, -fh / 2, fw, fh);
  g.fillRect(-fw / 2 + 14 * u, -fh / 2 - 12 * u, 70 * u, 14 * u);
  g.fillStyle = "#efe6cc"; g.fillRect(-fw * 0.3, -fh * 0.3, fw * 0.6, 26 * u);
  g.fillStyle = "#2c2217"; g.font = `${Math.round(15 * u)}px "Special Elite", "Courier New", monospace`; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText("ASHCOMBE · 1961", 0, -fh * 0.3 + 13 * u);
  g.save(); g.rotate(-0.18);
  g.strokeStyle = "rgba(170,30,30,0.75)"; g.lineWidth = 2.5 * u; g.strokeRect(-fw * 0.24, fh * 0.06, fw * 0.48, 34 * u);
  g.fillStyle = "rgba(170,30,30,0.75)"; g.font = `bold ${Math.round(19 * u)}px "Special Elite", "Courier New", monospace`;
  g.fillText("UNSOLVED", 0, fh * 0.06 + 18 * u);
  g.restore();
  g.restore();
  // the banker's lamp at the back on the left: a brass stem, a green shade
  const lx = W * 0.14, ly = edge + 24 * u;
  soft(g, lx, ly + 10 * u, 70 * u, 14 * u, "0,0,0", 0.6);
  g.fillStyle = grad(g, lx - 30 * u, 0, lx + 30 * u, 0, ["#5a4418", "#e8c878", "#5a4418"]);
  g.beginPath(); g.ellipse(lx, ly + 6 * u, 34 * u, 9 * u, 0, 0, Math.PI * 2); g.fill();
  g.fillRect(lx - 3 * u, ly - 80 * u, 6 * u, 86 * u);
  g.fillStyle = grad(g, lx - 70 * u, 0, lx + 70 * u, 0, ["#0c3a1e", "#2f9a54", "#0a2a16"]);
  g.beginPath(); g.moveTo(lx - 72 * u, ly - 66 * u); g.quadraticCurveTo(lx, ly - 112 * u, lx + 72 * u, ly - 66 * u); g.lineTo(lx + 66 * u, ly - 58 * u); g.lineTo(lx - 66 * u, ly - 58 * u); g.closePath(); g.fill();
  g.fillStyle = "#fff2c8"; g.beginPath(); g.ellipse(lx, ly - 60 * u, 64 * u, 6 * u, 0, 0, Math.PI * 2); g.fill();
  soft(g, lx, ly - 52 * u, 120 * u, 40 * u, "255,226,170", 0.5, "lighter");
  // the tea, gone cold, on the right
  const tx = W * 0.82, ty = edge + (H - edge) * 0.36;
  soft(g, tx + 6 * u, ty + 8 * u, 60 * u, 22 * u, "0,0,0", 0.5);
  g.fillStyle = "#e8e2d4"; g.beginPath(); g.ellipse(tx, ty, 54 * u, 20 * u, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#f4efe4"; g.beginPath(); g.ellipse(tx, ty - 4 * u, 34 * u, 13 * u, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#6a3e1c"; g.beginPath(); g.ellipse(tx, ty - 5 * u, 28 * u, 10 * u, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = "#e8e2d4"; g.lineWidth = 5 * u; g.beginPath(); g.arc(tx + 38 * u, ty - 4 * u, 9 * u, -1.2, 1.2); g.stroke();
  // the pen, lying across the blotter's corner
  g.save(); g.translate(W * 0.7, edge + (H - edge) * 0.78); g.rotate(-0.5);
  g.fillStyle = "#121212"; g.fillRect(-60 * u, -3.5 * u, 100 * u, 7 * u);
  g.fillStyle = "#c8a050"; g.fillRect(-10 * u, -3.5 * u, 4 * u, 7 * u);
  g.fillStyle = "#b8b0a0"; g.beginPath(); g.moveTo(40 * u, -3.5 * u); g.lineTo(58 * u, 0); g.lineTo(40 * u, 3.5 * u); g.closePath(); g.fill();
  g.restore();
  // his spectacles, folded
  g.strokeStyle = "rgba(200,170,110,0.8)"; g.lineWidth = 2 * u;
  const sx = W * 0.15, sy = edge + (H - edge) * 0.72;
  for (const dx of [-16, 16]) { g.beginPath(); g.ellipse(sx + dx * u, sy, 13 * u, 10 * u, 0, 0, Math.PI * 2); g.stroke(); }
  g.beginPath(); g.moveTo(sx - 3 * u, sy - 2 * u); g.quadraticCurveTo(sx, sy - 6 * u, sx + 3 * u, sy - 2 * u); g.stroke();
  // the envelope, on the blotter, catching the lamp
  const ex = W * 0.56, ey = edge + (H - edge) * 0.58, q = 13 * u, rot = 0.06;
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const at = (a, b) => ({ x: ex + (a * cs + b * sn) * q, y: ey + (a * sn - b * cs) * q });
  const seal = at(0, 11 * 0.14);
  paintEnvelope(g, { w: 17, d: 11, at, k: q, seal: { x: seal.x, y: seal.y - 0.5 * q, rx: 1.7 * q, ry: 1.7 * q } }, {
    left: "rgb(214,200,172)", right: "rgb(236,224,198)", wax: "rgb(150,30,22)", shadow: true, shine: true,
  });
  vignette(g, W, H, 0.7);
  grain(g, W, H, 0.03);
  return { x: ex - 9 * q, y: ey - 6.5 * q, w: 18 * q, h: 13 * q };
}
