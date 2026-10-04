/** The top three of the stage, on a board that comes up over the dark
 *  finish when the lights go out: third place first, then second, then the
 *  winner, each with a cup in its own metal. The board and the cups are
 *  painted (lacquered black, a fine gold line; the cups turned in metal that
 *  catches the last of the light); the names are the game's own type. */

const RY_WINNERS = [
  { place: 1, name: "Alan Brown", cup: "gold" },
  { place: 2, name: "Chad Dawson", cup: "silver" },
  { place: 3, name: "Eugene Fontaine", cup: "bronze" },
];

const METALS = {
  gold: { dark: "#3e2805", mid: "#a8771f", light: "#eccb6f", spec: "#fff5d6", plate: "#c9a14a" },
  silver: { dark: "#33373d", mid: "#8e959e", light: "#d6dbe2", spec: "#ffffff", plate: "#b9bec6" },
  bronze: { dark: "#321a09", mid: "#91522a", light: "#d58f58", spec: "#ffe2c4", plate: "#b27a45" },
};

const BOARD = "ry_board";
const CUP = "ry_cup_";
const SPARK = "ry_spark";
const RES = 2;

// a trophy, h pixels tall on screen, painted at RES: its foot at the bottom
// of the canvas, centred
function paintCup(h, metal) {
  const M = METALS[metal];
  const H = h * RES;
  const W = H * 0.9;
  const c = makeCanvas(W, H);
  const g = c.getContext("2d");
  const cx = W / 2;
  const u = H; // everything in shares of the height
  // the metal: dark at the edges, a bright core left of centre, a second
  // reflection on the right — lit from the upper left
  const across = (x0, x1) => {
    const gr = g.createLinearGradient(x0, 0, x1, 0);
    gr.addColorStop(0, M.dark);
    gr.addColorStop(0.18, M.mid);
    gr.addColorStop(0.32, M.light);
    gr.addColorStop(0.38, M.spec);
    gr.addColorStop(0.46, M.light);
    gr.addColorStop(0.68, M.mid);
    gr.addColorStop(0.84, M.light);
    gr.addColorStop(1, M.dark);
    return gr;
  };

  // the plinth: black lacquer, a brass plate
  const pTop = u * 0.8;
  const pw = u * 0.44;
  const pg = g.createLinearGradient(0, pTop, 0, u);
  pg.addColorStop(0, "#2a2a2c");
  pg.addColorStop(0.15, "#141416");
  pg.addColorStop(1, "#050506");
  g.fillStyle = pg;
  g.fillRect(cx - pw / 2, pTop, pw, u - pTop);
  g.fillStyle = "rgba(255,255,255,0.18)";
  g.fillRect(cx - pw / 2, pTop, pw, Math.max(1, u * 0.006));
  g.fillStyle = M.plate;
  g.fillRect(cx - pw * 0.3, pTop + (u - pTop) * 0.35, pw * 0.6, (u - pTop) * 0.34);
  g.fillStyle = "rgba(255,255,255,0.35)";
  g.fillRect(cx - pw * 0.3, pTop + (u - pTop) * 0.35, pw * 0.6, Math.max(1, u * 0.005));

  // the foot: a stepped round base
  const foot = (y, w, hh) => {
    g.fillStyle = across(cx - w / 2, cx + w / 2);
    g.fillRect(cx - w / 2, y, w, hh);
    g.fillStyle = across(cx - w / 2, cx + w / 2);
    g.beginPath();
    g.ellipse(cx, y, w / 2, hh * 0.35, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "rgba(255,255,255,0.25)";
    g.beginPath();
    g.ellipse(cx, y, w / 2, hh * 0.35, 0, Math.PI, Math.PI * 2);
    g.fill();
  };
  foot(u * 0.745, u * 0.36, u * 0.055);
  foot(u * 0.71, u * 0.24, u * 0.04);

  // the stem, with a knop halfway
  g.fillStyle = across(cx - u * 0.035, cx + u * 0.035);
  g.fillRect(cx - u * 0.035, u * 0.5, u * 0.07, u * 0.22);
  g.fillStyle = across(cx - u * 0.07, cx + u * 0.07);
  g.beginPath();
  g.ellipse(cx, u * 0.6, u * 0.07, u * 0.035, 0, 0, Math.PI * 2);
  g.fill();

  // the handles, behind the bowl's edge: loops out from the rim
  for (const s of [-1, 1]) {
    g.save();
    g.lineCap = "round";
    const hx = cx + s * u * 0.3;
    g.strokeStyle = M.dark;
    g.lineWidth = u * 0.06;
    g.beginPath();
    g.moveTo(cx + s * u * 0.26, u * 0.12);
    g.bezierCurveTo(hx + s * u * 0.2, u * 0.08, hx + s * u * 0.2, u * 0.36, cx + s * u * 0.12, u * 0.42);
    g.stroke();
    g.strokeStyle = s < 0 ? M.light : M.mid;
    g.lineWidth = u * 0.03;
    g.beginPath();
    g.moveTo(cx + s * u * 0.26, u * 0.115);
    g.bezierCurveTo(hx + s * u * 0.19, u * 0.075, hx + s * u * 0.19, u * 0.35, cx + s * u * 0.12, u * 0.41);
    g.stroke();
    g.restore();
  }

  // the bowl: a tulip from the rim down to the stem
  const bowl = new Path2D();
  bowl.moveTo(cx - u * 0.3, u * 0.08);
  bowl.bezierCurveTo(cx - u * 0.33, u * 0.34, cx - u * 0.12, u * 0.46, cx - u * 0.04, u * 0.51);
  bowl.lineTo(cx + u * 0.04, u * 0.51);
  bowl.bezierCurveTo(cx + u * 0.12, u * 0.46, cx + u * 0.33, u * 0.34, cx + u * 0.3, u * 0.08);
  bowl.closePath();
  g.fillStyle = across(cx - u * 0.31, cx + u * 0.31);
  g.fill(bowl);
  g.save();
  g.clip(bowl);
  const vg = g.createLinearGradient(0, u * 0.08, 0, u * 0.51);
  vg.addColorStop(0, "rgba(255,255,255,0.12)");
  vg.addColorStop(0.5, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.35)");
  g.fillStyle = vg;
  g.fillRect(0, 0, W, H);
  // the room reflected: a dark band across the belly
  g.fillStyle = "rgba(0,0,0,0.16)";
  g.fillRect(0, u * 0.27, W, u * 0.05);
  g.restore();

  // the rim, and the dark inside of the cup
  g.fillStyle = across(cx - u * 0.31, cx + u * 0.31);
  g.beginPath();
  g.ellipse(cx, u * 0.08, u * 0.305, u * 0.045, 0, 0, Math.PI * 2);
  g.fill();
  const inner = g.createLinearGradient(0, u * 0.05, 0, u * 0.11);
  inner.addColorStop(0, M.dark);
  inner.addColorStop(1, M.mid);
  g.fillStyle = inner;
  g.beginPath();
  g.ellipse(cx, u * 0.083, u * 0.27, u * 0.032, 0, 0, Math.PI * 2);
  g.fill();
  // a glint on the lip
  g.strokeStyle = M.spec;
  g.lineWidth = Math.max(1, u * 0.008);
  g.beginPath();
  g.ellipse(cx, u * 0.08, u * 0.305, u * 0.045, 0, Math.PI * 1.05, Math.PI * 1.45);
  g.stroke();
  return c;
}

// the board itself: black lacquer, a fine gold line inside the edge
function paintBoard(pw, ph, s) {
  const pad = 24 * s;
  const W = (pw + pad * 2) * RES;
  const H = (ph + pad * 2) * RES;
  const c = makeCanvas(W, H);
  const g = c.getContext("2d");
  g.scale(RES, RES);
  const x = pad;
  const y = pad;
  const r = 10 * s;
  // its shadow on the dark stage
  g.save();
  g.shadowColor = "rgba(0,0,0,0.8)";
  g.shadowBlur = 22 * s * RES;
  g.shadowOffsetY = 6 * s * RES;
  g.fillStyle = "#0a0b0e";
  roundRect(g, x, y, pw, ph, r);
  g.fill();
  g.restore();
  const bg = g.createLinearGradient(0, y, 0, y + ph);
  bg.addColorStop(0, "#1a1b20");
  bg.addColorStop(0.12, "#101116");
  bg.addColorStop(1, "#08090c");
  g.fillStyle = bg;
  roundRect(g, x, y, pw, ph, r);
  g.fill();
  // a sheen across the lacquer, top left
  g.save();
  roundRect(g, x, y, pw, ph, r);
  g.clip();
  const sheen = g.createLinearGradient(x, y, x + pw * 0.6, y + ph * 0.5);
  sheen.addColorStop(0, "rgba(255,240,210,0.07)");
  sheen.addColorStop(1, "rgba(255,240,210,0)");
  g.fillStyle = sheen;
  g.fillRect(x, y, pw, ph);
  g.restore();
  g.strokeStyle = "rgba(214,176,92,0.75)";
  g.lineWidth = 1.2 * s;
  roundRect(g, x + 7 * s, y + 7 * s, pw - 14 * s, ph - 14 * s, r * 0.6);
  g.stroke();
  g.strokeStyle = "rgba(214,176,92,0.22)";
  g.lineWidth = 0.8 * s;
  roundRect(g, x + 11 * s, y + 11 * s, pw - 22 * s, ph - 22 * s, r * 0.4);
  g.stroke();
  g.strokeStyle = "rgba(255,255,255,0.08)";
  g.lineWidth = 1;
  roundRect(g, x + 0.5, y + 0.5, pw - 1, ph - 1, r);
  g.stroke();
  return { canvas: c, pad };
}

function paintSpark() {
  const s = 32;
  const c = makeCanvas(s, s);
  const g = c.getContext("2d");
  const m = s / 2;
  const rg = g.createRadialGradient(m, m, 0, m, m, m);
  rg.addColorStop(0, "rgba(255,250,230,1)");
  rg.addColorStop(0.2, "rgba(255,236,180,0.5)");
  rg.addColorStop(1, "rgba(255,220,150,0)");
  g.fillStyle = rg;
  g.fillRect(0, 0, s, s);
  g.fillStyle = "rgba(255,248,225,0.9)";
  g.beginPath();
  g.moveTo(m, 1);
  g.quadraticCurveTo(m + 1.5, m - 1.5, s - 1, m);
  g.quadraticCurveTo(m + 1.5, m + 1.5, m, s - 1);
  g.quadraticCurveTo(m - 1.5, m + 1.5, 1, m);
  g.quadraticCurveTo(m - 1.5, m - 1.5, m, 1);
  g.fill();
  return c;
}

/** The board, as a container at depth 25. animate = false builds it already
 *  complete (a rebuild after the race). */
export function drawPodium(scene, W, H, animate) {
  const s = Math.max(0.6, Math.min(W / 1100, H / 720, 1.1));
  const pw = 520 * s;
  const rowH = 76 * s;
  const head = 74 * s;
  const ph = head + rowH * 3 + 24 * s;
  const left = W / 2 - pw / 2;
  const top = H * 0.47 - ph / 2;
  const font = '"Special Elite", monospace';
  const t = scene.textures;

  const board = paintBoard(pw, ph, s);
  add(t, BOARD, board.canvas);
  add(t, SPARK, paintSpark());
  const frame = scene.add
    .image(left - board.pad, top - board.pad, BOARD)
    .setOrigin(0, 0)
    .setScale(1 / RES);

  const title = scene.add
    .text(W / 2, top + 36 * s, "TOP 3", {
      fontFamily: font,
      fontSize: Math.round(28 * s) + "px",
      color: "#efe3c2",
      letterSpacing: 8,
    })
    .setOrigin(0.5);
  // a rule under the title, a small diamond in the middle
  const rule = scene.add.graphics();
  const ry = top + 62 * s;
  rule.lineStyle(1, 0xd6b05c, 0.5);
  rule.lineBetween(left + 44 * s, ry, W / 2 - 10 * s, ry);
  rule.lineBetween(W / 2 + 10 * s, ry, left + pw - 44 * s, ry);
  rule.fillStyle(0xd6b05c, 0.85);
  rule.fillPoints(
    [
      { x: W / 2, y: ry - 4 * s },
      { x: W / 2 + 4 * s, y: ry },
      { x: W / 2, y: ry + 4 * s },
      { x: W / 2 - 4 * s, y: ry },
    ],
    true,
  );
  for (let i = 1; i < 3; i++) {
    rule.lineStyle(1, 0xd6b05c, 0.14);
    rule.lineBetween(left + 30 * s, top + head + rowH * i, left + pw - 30 * s, top + head + rowH * i);
  }

  const rows = RY_WINNERS.map((w, i) => {
    const y = top + head + rowH * (i + 0.5);
    const row = scene.add.container(0, y);
    const h = (i === 0 ? 62 : 56) * s;
    const key = CUP + w.cup;
    add(t, key, paintCup(h, w.cup));
    const cup = scene.add
      .image(left + 84 * s, h * 0.5, key)
      .setOrigin(0.5, 1)
      .setScale(1 / RES);
    const label = scene.add
      .text(left + 150 * s, 0, w.place + ". " + w.name, {
        fontFamily: font,
        fontSize: Math.round(27 * s) + "px",
        color: i === 0 ? "#f6e7b8" : "#e2d9c4",
      })
      .setOrigin(0, 0.5);
    row.add([cup, label]);
    row._cup = cup;
    if (i === 0) {
      // the winner's cup catches the light
      for (const [dx, dy, r] of [
        [0.24, -0.9, 16],
        [-0.3, -0.62, 12],
        [0.05, -0.35, 9],
      ]) {
        const sp = scene.add
          .image(left + 84 * s + dx * h, h * 0.5 + dy * h, SPARK)
          .setBlendMode("ADD")
          .setDisplaySize(r * s, r * s)
          .setAlpha(0.1);
        row.add(sp);
        scene.ambientTween({
          targets: sp,
          alpha: 0.95,
          duration: 700 + r * 60,
          delay: r * 45,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      }
    }
    return row;
  });

  const podium = scene.add.container(0, 0, [frame, rule, title, ...rows]).setDepth(25);
  if (!animate) return podium;

  frame.setAlpha(0);
  rule.setAlpha(0);
  title.setAlpha(0);
  rows.forEach((row) => row.setAlpha(0));
  scene.tweens.add({ targets: [frame, rule, title], alpha: 1, duration: 700, ease: "Sine.easeOut" });
  [2, 1, 0].forEach((idx, k) => {
    const row = rows[idx];
    const ty = row.y;
    const delay = 800 + k * 750;
    row.y = ty + 14 * s;
    scene.tweens.add({ targets: row, alpha: 1, y: ty, duration: 520, delay, ease: "Cubic.easeOut" });
    scene.tweens.add({
      targets: row._cup,
      scale: { from: 0.55 / RES, to: 1 / RES },
      duration: 520,
      delay,
      ease: "Back.easeOut",
    });
  });
  return podium;
}

export function releasePodiumArt(textures) {
  const keys = [BOARD, SPARK, ...Object.keys(METALS).map((m) => CUP + m)];
  for (const key of keys) if (textures.exists(key)) textures.remove(key);
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function add(textures, key, canvas) {
  if (textures.exists(key)) textures.remove(key);
  textures.addCanvas(key, canvas);
}

// painted on the CPU: these canvases are drawn once and handed to WebGL, and
// a CPU canvas goes up as a plain copy, where a GPU one stalls to sync
function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  c.getContext("2d", { willReadFrequently: true });
  return c;
}
