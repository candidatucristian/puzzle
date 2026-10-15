import { paintSeal } from "../shared/envelope.js";
import { renderLetter } from "./letterPage.js";

// A letter arriving: the moment a page left by the Ashcombes is found. The
// room dims; the house's envelope comes spinning in and lands; a click breaks
// its seal — the wax cracks and flies apart — the flap lifts, the letter is
// drawn out, and opens out to be read. "File it" folds it away: it flies up
// into the case file in the header, which takes it with a jolt. Put off with
// "Later" (or Esc) before it is opened, it goes into the case file unread.
//
// The envelope is built in layers, so it can open: its inside, the letter,
// the front pocket, the flap (outside and inside), the seal.
// Resolves "read" or "later".

const PAPER = ["#d6c49e", "#ecdfbf"]; // the envelope's cream, left to right in the light
const INSIDE = ["#a8956f", "#c4b18a"];

export function playArrival(scope, { letter, sounds, target, reducedMotion = false }) {
  const still = reducedMotion;
  return new Promise((resolve) => {
    const W = Math.round(Math.min(440, window.innerWidth * 0.4)), H = Math.round(W * 11 / 17), TIP = Math.round(H * 0.56);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const root = el("div", "arrival");
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-label", `A letter found: ${letter.title}`);
    const veil = el("div", "arrival-veil");
    const caption = el("div", "arrival-caption");
    caption.append(el("p", "arrival-eyebrow", "A letter found"), el("p", "arrival-title", letter.title), el("p", "arrival-where", letter.found));
    const stage = el("div", "arrival-stage");
    const env = el("div", "env");
    Object.assign(env.style, { width: `${W}px`, height: `${H}px` });
    const inside = layer("env-inside", W, H, dpr, (g) => paintInside(g, W, H));
    const sheet = el("div", "env-letter");
    Object.assign(sheet.style, { left: `${W * 0.06}px`, width: `${W * 0.88}px`, top: `${H * 0.08}px`, height: `${H * 0.86}px` });
    const pocket = layer("env-pocket", W, H, dpr, (g) => paintPocket(g, W, H, TIP));
    const flap = el("div", "env-flap");
    Object.assign(flap.style, { width: `${W}px`, height: `${TIP + 2}px` });
    flap.append(layer("env-flap-out", W, TIP + 2, dpr, (g) => paintFlap(g, W, TIP, PAPER, true)),
      layer("env-flap-in", W, TIP + 2, dpr, (g) => paintFlap(g, W, TIP, INSIDE, false)));
    const r = W * 0.075;
    const seal = layer("env-seal", r * 3, r * 3, dpr, (g) => paintSeal(g, { x: r * 1.5, y: r * 1.5, rx: r, ry: r }, { wax: "rgb(150,30,22)", shine: true }));
    Object.assign(seal.style, { left: `${W / 2 - r * 1.5}px`, top: `${TIP - r * 1.6}px` });
    const hint = el("p", "env-hint", "Break the seal");
    env.append(inside, sheet, pocket, flap, seal);
    stage.append(env, hint);
    const later = el("button", "arrival-later", "Later");
    later.type = "button";
    const reading = el("div", "arrival-reading");
    const page = el("div", "arrival-page");
    const file = el("button", "arrival-file", "File it in the case file  ›");
    file.type = "button";
    reading.append(page, file);
    root.append(veil, caption, stage, later, reading);
    document.body.append(root);

    let state = "coming";
    const wait = (ms) => new Promise((done) => scope.later(done, still ? 0 : ms));
    const anim = (node, frames, opts) => (still ? null : node.animate(frames, { fill: "forwards", ...opts }));
    const finished = (a) => (a ? a.finished.catch(() => {}) : Promise.resolve());

    // ── in it comes ──
    requestAnimationFrame(() => root.classList.add("is-shown"));
    sounds?.whoosh();
    const flight = anim(env, [
      { transform: "translate(70vw, 30vh) rotate(38deg) scale(.55)", opacity: 0 },
      { transform: "translate(8vw, -6vh) rotate(-9deg) scale(1.04)", opacity: 1, offset: 0.72 },
      { transform: "translate(0, 0) rotate(-2.5deg) scale(1)", opacity: 1 },
    ], { duration: 900, easing: "cubic-bezier(.2,.75,.25,1)" });
    finished(flight).then(() => {
      if (state !== "coming") return;
      sounds?.land();
      anim(env, [{ transform: "translate(0,0) rotate(-2.5deg) scale(1)" }, { transform: "translate(0,3px) rotate(-2.5deg) scale(.985, .97)" }, { transform: "translate(0,0) rotate(-2.5deg) scale(1)" }], { duration: 220, easing: "ease-out" });
      state = "waiting";
      root.classList.add("is-waiting");
      env.focus({ preventScroll: true });
    });
    env.tabIndex = 0;
    env.setAttribute("role", "button");
    env.setAttribute("aria-label", "Break the seal");

    // ── opened: the seal breaks, the flap lifts, the letter comes out and opens ──
    const open = async () => {
      if (state !== "waiting") return;
      state = "opening";
      root.classList.remove("is-waiting");
      later.hidden = true;
      // the seal strains, and breaks
      await finished(anim(seal, [{ transform: "scale(1)" }, { transform: "scale(1.08) rotate(-4deg)" }, { transform: "scale(.96) rotate(3deg)" }, { transform: "scale(1)" }], { duration: 220 }));
      sounds?.crack();
      caption.classList.add("is-away");
      shatter(env, seal, r, still);
      seal.style.visibility = "hidden";
      await wait(260);
      // the flap lifts back on its fold
      sounds?.open();
      env.classList.add("is-open");
      await finished(anim(flap, [{ transform: "rotateX(0deg)" }, { transform: "rotateX(180deg)" }], { duration: 620, easing: "cubic-bezier(.4,.1,.3,1)" }));
      flap.style.zIndex = "0";
      // the letter drawn out
      await finished(anim(sheet, [{ transform: "translateY(0)" }, { transform: `translateY(${-H * 0.82}px)` }], { duration: 650, easing: "cubic-bezier(.3,.1,.2,1)" }));
      // the envelope falls away; the letter opens out to be read
      anim(env, [{ opacity: 1, transform: "translate(0,0) rotate(-2.5deg)" }, { opacity: 0, transform: "translate(0, 60px) rotate(4deg)" }], { duration: 500, easing: "ease-in" });
      caption.classList.add("is-away");
      await wait(220);
      renderLetter(page, letter);
      reading.classList.add("is-shown");
      sounds?.unfold();
      await finished(anim(page, [
        { transform: "perspective(900px) rotateX(58deg) scaleY(.34)", clipPath: "inset(33% 0 33% 0)", opacity: 0.4 },
        { transform: "perspective(900px) rotateX(22deg) scaleY(.68)", clipPath: "inset(12% 0 12% 0)", opacity: 1, offset: 0.55 },
        { transform: "perspective(900px) rotateX(0deg) scaleY(1)", clipPath: "inset(0 0 0 0)", opacity: 1 },
      ], { duration: 760, easing: "cubic-bezier(.3,.1,.2,1)" }));
      state = "reading";
      file.focus({ preventScroll: true });
    };

    // ── filed: the letter folds up and flies into the case file ──
    const away = async (how) => {
      if (state === "gone" || state === "opening") return;
      const wasReading = state === "reading";
      state = "gone";
      const into = target?.getBoundingClientRect();
      const node = wasReading ? page : env;
      const from = node.getBoundingClientRect();
      sounds?.file();
      if (into && from.width) {
        const dx = into.left + into.width / 2 - (from.left + from.width / 2);
        const dy = into.top + into.height / 2 - (from.top + from.height / 2);
        const k = Math.max(0.04, (into.height * 0.9) / from.height);
        await finished(anim(node, [
          { transform: "translate(0,0) scale(1) rotate(0deg)", opacity: 1 },
          { transform: `translate(${dx * 0.3}px, ${dy * 0.15}px) scale(${0.5 + k * 0.5}) rotate(-6deg)`, opacity: 1, offset: 0.35 },
          { transform: `translate(${dx}px, ${dy}px) scale(${k}) rotate(-14deg)`, opacity: 0.2 },
        ], { duration: 720, easing: "cubic-bezier(.5,0,.75,.4)" }));
      }
      node.style.visibility = "hidden";
      target?.classList.add("is-receiving");
      scope.later(() => target?.classList.remove("is-receiving"), 700);
      root.classList.remove("is-shown");
      scope.later(() => { root.remove(); resolve(how); }, still ? 0 : 500);
    };

    scope.on(env, "click", open);
    scope.on(later, "click", () => away("later"));
    scope.on(file, "click", () => away("read"));
    const onKey = (e) => {
      if (!root.isConnected) return;
      if ((e.key === "Enter" || e.key === " ") && state === "waiting") { e.preventDefault(); e.stopPropagation(); open(); }
      else if (e.key === "Escape" && (state === "waiting" || state === "reading")) { e.preventDefault(); e.stopPropagation(); away(state === "reading" ? "read" : "later"); }
    };
    window.addEventListener("keydown", onKey, true);
    scope.add(() => window.removeEventListener("keydown", onKey, true));
  });
}

// ── the parts of it ──

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text) node.textContent = text;
  return node;
}
function layer(cls, w, h, dpr, paint) {
  const c = document.createElement("canvas");
  c.className = cls;
  c.width = Math.ceil(w * dpr); c.height = Math.ceil(h * dpr);
  Object.assign(c.style, { width: `${w}px`, height: `${h}px` });
  const g = c.getContext("2d");
  g.scale(dpr, dpr);
  paint(g);
  return c;
}
const grad = (g, x0, y0, x1, y1, stops) => {
  const r = g.createLinearGradient(x0, y0, x1, y1);
  stops.forEach((c, i) => r.addColorStop(i / (stops.length - 1), c));
  return r;
};
function fibres(g, w, h, n) {
  for (let i = 0; i < n; i++) {
    const x = Math.random() * w, y = Math.random() * h, a = Math.random() * Math.PI, l = 2 + Math.random() * 5;
    g.strokeStyle = Math.random() < 0.5 ? "rgba(120,90,50,0.07)" : "rgba(255,248,230,0.1)";
    g.lineWidth = 0.6;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
}

// the envelope's inside: darker paper, shadowed under its top edge
function paintInside(g, W, H) {
  g.fillStyle = grad(g, 0, 0, W, 0, INSIDE);
  g.fillRect(0, 0, W, H);
  g.fillStyle = grad(g, 0, 0, 0, H * 0.5, ["rgba(40,26,10,0.45)", "rgba(40,26,10,0)"]);
  g.fillRect(0, 0, W, H * 0.5);
}

// the front pocket: the side and bottom flaps folded in, a V cut out of its
// top where the flap closes over it
function paintPocket(g, W, H, tip) {
  const shape = () => { g.beginPath(); g.moveTo(0, 0); g.lineTo(W / 2, tip); g.lineTo(W, 0); g.lineTo(W, H); g.lineTo(0, H); g.closePath(); };
  shape();
  g.fillStyle = grad(g, 0, 0, W, 0, PAPER);
  g.fill();
  g.save(); shape(); g.clip();
  fibres(g, W, H, (W * H) / 90);
  // the bottom flap, a shade lighter, and the side flaps' folds under it
  g.fillStyle = "rgba(255,250,235,0.1)";
  g.beginPath(); g.moveTo(0, H); g.lineTo(W / 2, H * 0.5); g.lineTo(W, H); g.closePath(); g.fill();
  g.strokeStyle = "rgba(60,40,15,0.22)"; g.lineWidth = 1.2;
  g.beginPath(); g.moveTo(0, H); g.lineTo(W / 2, H * 0.5); g.lineTo(W, H); g.stroke();
  // the light on it, warmer toward the right; its age at the edges
  const age = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.hypot(W, H) * 0.6);
  age.addColorStop(0, "rgba(110,75,35,0)"); age.addColorStop(1, "rgba(110,75,35,0.28)");
  g.fillStyle = age; g.fillRect(0, 0, W, H);
  g.restore();
  g.strokeStyle = "rgba(60,40,15,0.35)"; g.lineWidth = 1; shape(); g.stroke();
}

// the flap: outside (cream, its edges a paper's thickness proud) or inside.
// The inside is drawn point up: it is turned over on its own middle, and the
// flap turns over on its fold, so that open it stands up behind the
// envelope, point to the sky, its inside to us.
function paintFlap(g, W, tip, colours, outside) {
  g.beginPath();
  if (outside) { g.moveTo(0, 0); g.lineTo(W, 0); g.lineTo(W / 2, tip); }
  else { g.moveTo(0, tip); g.lineTo(W, tip); g.lineTo(W / 2, 0); }
  g.closePath();
  g.fillStyle = grad(g, 0, 0, W, 0, colours);
  g.fill();
  g.save(); g.clip(); fibres(g, W, tip, (W * tip) / 140);
  if (!outside) { g.fillStyle = "rgba(40,26,10,0.18)"; g.fillRect(0, 0, W, tip); }
  g.restore();
  if (outside) {
    g.save();
    g.shadowColor = "rgba(0,0,0,0.35)"; g.shadowBlur = 4; g.shadowOffsetY = 2;
    g.strokeStyle = "rgba(60,40,15,0.3)"; g.lineWidth = 1.3;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(W / 2, tip); g.lineTo(W, 0); g.stroke();
    g.restore();
  }
}

// the seal flying apart: shards of wax spun out and falling
function shatter(env, seal, r, still) {
  if (still) return;
  const cx = parseFloat(seal.style.left) + r * 1.5, cy = parseFloat(seal.style.top) + r * 1.5;
  for (let i = 0; i < 11; i++) {
    const shard = document.createElement("span");
    shard.className = "env-shard";
    const s = r * (0.5 + Math.random() * 0.55);
    Object.assign(shard.style, { left: `${cx - s / 2}px`, top: `${cy - s / 2}px`, width: `${s}px`, height: `${s}px` });
    const pts = Array.from({ length: 5 }, (_, k) => {
      const a = (k / 5) * Math.PI * 2 + Math.random() * 0.8, d = 30 + Math.random() * 20;
      return `${50 + Math.cos(a) * d}% ${50 + Math.sin(a) * d}%`;
    });
    shard.style.clipPath = `polygon(${pts.join(",")})`;
    env.append(shard);
    const a = (i / 11) * Math.PI * 2 + Math.random() * 0.5, dist = r * (2.2 + Math.random() * 2.2);
    const dx = Math.cos(a) * dist, dy = Math.sin(a) * dist * 0.7;
    shard.animate([
      { transform: "translate(0,0) rotate(0deg)", opacity: 1 },
      { transform: `translate(${dx}px, ${dy - r}px) rotate(${(Math.random() - 0.5) * 360}deg)`, opacity: 1, offset: 0.45 },
      { transform: `translate(${dx * 1.3}px, ${dy + r * 4}px) rotate(${(Math.random() - 0.5) * 720}deg)`, opacity: 0 },
    ], { duration: 900 + Math.random() * 300, easing: "cubic-bezier(.2,.6,.4,1)", fill: "forwards" });
  }
}
