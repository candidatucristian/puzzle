import { METRO_STATIONS } from "./puzzle.js";
import { soft, grain, vignette, glowCanvas, makeCanvas, addCanvasTexture, lcg, polygon } from "../../shared/paint.js";

/** The station for METRO: a real underground platform late at night, seen
 *  down its length. To the left the track in its trench, running into the
 *  tunnel under a signal lamp; to the right the platform wall in glazed
 *  tile, the station's name on it, posters, a bench, a tannoy horn; overhead
 *  a row of fluorescent tubes. And hanging over the platform, facing us, the
 *  enamel line diagram every station has: this line's stops in order, the
 *  first of them this station, an arrow for the way the trains run.
 *
 *  The station is drawn in one-point perspective from where we stand: a
 *  place is how far across (X) and down (Y) it is from the eye, and how near
 *  (s, 1 at the picture, smaller further off).
 *
 *  Painted once per screen size: the station with the diagram; the diagram's
 *  line as a layer of its own (so the scene can breathe light along it); a
 *  glow. */

const K = { room: "mt_room", line: "mt_line", glow: "mt_glow" };
const SIGN_FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif';
const AMBER = "255,176,64";
const TUBE = "214,236,226"; // the fluorescent tubes' cold green-white
const FAR = 0.1; // how near the far end of the platform is

// ── where everything is ─────────────────────────────────────────────────────

export function layoutStation(W, H) {
  const u = Math.min(W / 1000, H / 700);
  const L = { W, H, u };
  L.vp = { x: W * 0.4, y: H * 0.5 };
  // the station's section at the picture: the platform's edge and wall, its
  // floor and ceiling, the track bed and the tunnel's far wall
  L.sec = {
    edge: -W * 0.17,
    wall: W * 0.64,
    floor: H * 0.52,
    ceil: -H * 0.66,
    bed: H * 0.72,
    left: -W * 0.66,
  };
  L.P = (X, Y, s) => ({ x: L.vp.x + X * s, y: L.vp.y + Y * s, s });
  // the line diagram, hanging over the platform and facing us
  const mw = Math.min(W * 0.56, H * 1.16);
  const mh = mw * 0.3;
  L.map = { x: W * 0.55 - mw / 2, y: H * 0.075, w: mw, h: mh };
  const m = L.map;
  const y = m.y + mh * 0.6;
  const x0 = m.x + mw * 0.1;
  const x1 = m.x + mw * 0.88;
  L.dot = mh * 0.052;
  L.lit = {
    path: [
      { x: m.x + mw * 0.045, y },
      { x: m.x + mw * 0.955, y },
    ],
    stations: METRO_STATIONS.map((name, i) => ({
      name,
      x: x0 + ((x1 - x0) * i) / (METRO_STATIONS.length - 1),
      y,
      side: i % 2 ? 1 : -1,
    })),
  };
  // the tannoy horn, on the wall beside us
  const sp = L.P(L.sec.wall, -H * 0.2, 0.74);
  L.speaker = { x: sp.x - 26 * u, y: sp.y, w: 64 * u, h: 52 * u };
  // the signal at the tunnel mouth, the train's lamps far down the tunnel
  const sg = L.P(L.sec.left * 0.94, -H * 0.02, 0.2);
  L.signal = { x: sg.x, y: sg.y, r: 5 * u };
  const tr = L.P((L.sec.left + L.sec.edge) / 2, H * 0.34, 0.035);
  L.far = { x: tr.x, y: tr.y };
  // the tube that is on its way out
  const tb = L.P(W * 0.18, L.sec.ceil, 0.46);
  L.flicker = { x: tb.x, y: tb.y, w: 120 * u, h: 60 * u };
  return L;
}

// ── painting ────────────────────────────────────────────────────────────────

export function paintStation(scene, L) {
  const t = scene.textures;
  const { W, H } = L;
  const c = makeCanvas(W, H);
  const ctx = c.getContext("2d");
  paintShell(ctx, L);
  paintTrack(ctx, L);
  paintPlatform(ctx, L);
  paintWall(ctx, L);
  paintCeiling(ctx, L);
  paintFarEnd(ctx, L);
  paintFurniture(ctx, L);
  paintGloom(ctx, L);
  paintDiagram(ctx, L);
  vignette(ctx, W, H, 0.6);
  grain(ctx, W, H, 0.035);
  addCanvasTexture(t, K.room, c);
  addCanvasTexture(t, K.line, paintLitLine(L));
  addCanvasTexture(t, K.glow, glowCanvas());
  return { keys: K };
}

export function releaseStationArt(textures) {
  for (const key of Object.values(K)) if (textures.exists(key)) textures.remove(key);
}

// the levels of nearness at which the tiling's upright joints fall: evenly
// spaced down the platform, so crowding toward the far end
function depths(spacing) {
  const out = [];
  for (let z = 1; ; z += spacing) {
    const s = 1 / z;
    if (s < FAR) break;
    out.push(s);
  }
  return out;
}

// the dark the whole thing is cut from
function paintShell(ctx, L) {
  ctx.fillStyle = "#07090b";
  ctx.fillRect(0, 0, L.W, L.H);
}

// the track: ballast and sleepers in the trench, two running rails worn
// bright and the live rail beside them, the tunnel wall with its cables
function paintTrack(ctx, L) {
  const { P, sec, u, H } = L;
  const rnd = lcg(2401);
  // the tunnel's wall beyond the track: sooty brick, cable runs along it
  polygon(ctx, [P(sec.left, sec.ceil, 1), P(sec.left, sec.ceil, FAR), P(sec.left, sec.bed, FAR), P(sec.left, sec.bed, 1)]);
  const wg = ctx.createLinearGradient(0, 0, L.vp.x, 0);
  wg.addColorStop(0, "#15181a");
  wg.addColorStop(1, "#0a0c0e");
  ctx.fillStyle = wg;
  ctx.fill();
  for (const [yk, w, col] of [
    [-0.3, 5, "#0a0a0c"],
    [-0.24, 3.4, "#1a1410"],
    [-0.2, 3.4, "#0a0a0c"],
    [0.06, 6, "#2a2420"],
  ]) {
    const a = P(sec.left, H * yk, 1.2);
    const b = P(sec.left, H * yk, FAR);
    ctx.strokeStyle = col;
    ctx.lineWidth = w * u;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  // brackets holding the cables
  for (const s of depths(0.5)) {
    const a = P(sec.left, -H * 0.33, s);
    const b = P(sec.left, -H * 0.17, s);
    ctx.strokeStyle = "rgba(60,60,64,0.8)";
    ctx.lineWidth = Math.max(1, 3 * u * s);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  // the bed
  polygon(ctx, [P(sec.left, sec.bed, 1.4), P(sec.edge, sec.bed, 1.4), P(sec.edge, sec.bed, FAR), P(sec.left, sec.bed, FAR)]);
  ctx.fillStyle = "#121212";
  ctx.fill();
  ctx.save();
  ctx.clip();
  for (let i = 0; i < 2600; i++) {
    const s = 1 / (0.7 + rnd() * 9);
    const p = P(sec.left + rnd() * (sec.edge - sec.left), sec.bed, s);
    ctx.fillStyle = rnd() < 0.5 ? "rgba(0,0,0,0.5)" : `rgba(120,116,108,${(0.1 + rnd() * 0.16).toFixed(2)})`;
    ctx.fillRect(p.x, p.y, 3.4 * u * s, 2 * u * s);
  }
  // sleepers
  const railL = sec.left + (sec.edge - sec.left) * 0.3;
  const railR = sec.left + (sec.edge - sec.left) * 0.7;
  for (const s of depths(0.17)) {
    const s2 = 1 / (1 / s + 0.055);
    polygon(ctx, [P(railL - L.W * 0.05, sec.bed, s), P(railR + L.W * 0.05, sec.bed, s), P(railR + L.W * 0.05, sec.bed, s2), P(railL - L.W * 0.05, sec.bed, s2)]);
    ctx.fillStyle = "#1e1814";
    ctx.fill();
  }
  ctx.restore();
  // the rails: a dark foot, a bright worn head
  const rail = (X, head) => {
    const a = P(X, sec.bed - H * 0.018, 1.5);
    const b = P(X, sec.bed - H * 0.018, FAR * 0.3);
    ctx.lineCap = "butt";
    ctx.strokeStyle = "#0a0a0a";
    ctx.lineWidth = 9 * u;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y + 4 * u);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
    g.addColorStop(0, head[0]);
    g.addColorStop(0.7, head[1]);
    g.addColorStop(1, head[2]);
    ctx.strokeStyle = g;
    ctx.lineWidth = 3.2 * u;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  };
  rail(railL, ["#8e9aa0", "#c8d6d8", "#ffffff"]);
  rail(railR, ["#8e9aa0", "#c8d6d8", "#ffffff"]);
  // the live rail on its insulators, and a warning in yellow along it
  rail(sec.left + (sec.edge - sec.left) * 0.12, ["#5a5246", "#6a6252", "#8a8068"]);
  // the platform's face, down into the trench, and the dark under its lip
  polygon(ctx, [P(sec.edge, sec.floor, 1.4), P(sec.edge, sec.floor, FAR), P(sec.edge, sec.bed, FAR), P(sec.edge, sec.bed, 1.4)]);
  const fg = ctx.createLinearGradient(0, L.vp.y + sec.floor * 0.4, 0, L.vp.y + sec.bed);
  fg.addColorStop(0, "#1c1c1e");
  fg.addColorStop(1, "#060607");
  ctx.fillStyle = fg;
  ctx.fill();
}

// the platform: worn grey paving, the white line at its edge and the
// knobbled yellow strip behind it, the tubes' light lying down its length
function paintPlatform(ctx, L) {
  const { P, sec, u, W } = L;
  const rnd = lcg(77);
  polygon(ctx, [P(sec.edge, sec.floor, 1.4), P(sec.wall, sec.floor, 1.4), P(sec.wall, sec.floor, FAR), P(sec.edge, sec.floor, FAR)]);
  const g = ctx.createLinearGradient(0, L.vp.y, 0, L.H);
  g.addColorStop(0, "#585c5e");
  g.addColorStop(1, "#34373a");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // the paving's joints
  const cols = 7;
  for (let i = 0; i <= cols; i++) {
    const X = sec.edge + W * 0.085 + ((sec.wall - sec.edge - W * 0.085) * i) / cols;
    const a = P(X, sec.floor, 1.4);
    const b = P(X, sec.floor, FAR);
    ctx.strokeStyle = "rgba(14,16,18,0.55)";
    ctx.lineWidth = Math.max(0.8, 1.4 * u);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  for (const s of depths(0.22)) {
    const a = P(sec.edge + W * 0.085, sec.floor, s);
    const b = P(sec.wall, sec.floor, s);
    ctx.strokeStyle = "rgba(14,16,18,0.5)";
    ctx.lineWidth = Math.max(0.6, 1.6 * u * s);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  // years of feet: stains, gum, a scuffed path down the middle
  for (let i = 0; i < 900; i++) {
    const s = 1 / (0.75 + rnd() * 8);
    const p = P(sec.edge + rnd() * (sec.wall - sec.edge), sec.floor, s);
    ctx.fillStyle = rnd() < 0.6 ? `rgba(0,0,0,${(0.08 + rnd() * 0.16).toFixed(2)})` : "rgba(220,226,222,0.05)";
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, (3 + rnd() * 16) * u * s, (1 + rnd() * 4) * u * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // the edge: a white line, then the yellow strip with its rows of studs
  const strip = (X0, X1, col) => {
    polygon(ctx, [P(X0, sec.floor, 1.4), P(X1, sec.floor, 1.4), P(X1, sec.floor, FAR), P(X0, sec.floor, FAR)]);
    ctx.fillStyle = col;
    ctx.fill();
  };
  strip(sec.edge, sec.edge + W * 0.018, "#b9bcb4");
  strip(sec.edge + W * 0.026, sec.edge + W * 0.072, "#b08a1c");
  for (const s of depths(0.045)) {
    for (let k = 0; k < 4; k++) {
      const p = P(sec.edge + W * (0.032 + k * 0.011), sec.floor, s);
      ctx.fillStyle = "rgba(255,226,120,0.4)";
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 3.4 * u * s, 1.5 * u * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // each tube's light, a pool on the paving under it
  for (const s of depths(0.62)) {
    const p = P(W * 0.18, sec.floor, s);
    soft(ctx, p.x, p.y, W * 0.34 * s, L.H * 0.11 * s, TUBE, 0.2, "lighter");
  }
  ctx.restore();
}

// the platform wall: glazed tile, cream above a band of oxblood, a deep
// green dado; the station's name in its enamel sign; posters behind glass
function paintWall(ctx, L) {
  const { P, sec, u, H } = L;
  const X = sec.wall;
  const band = (y0, y1, near, far) => {
    polygon(ctx, [P(X, y0, 1.4), P(X, y0, FAR), P(X, y1, FAR), P(X, y1, 1.4)]);
    const g = ctx.createLinearGradient(L.vp.x + X * FAR, 0, L.W, 0);
    g.addColorStop(0, far);
    g.addColorStop(1, near);
    ctx.fillStyle = g;
    ctx.fill();
  };
  band(sec.ceil, sec.floor, "#b9b49c", "#7c7a6a");
  band(H * 0.26, sec.floor, "#1d3a30", "#12241e");
  band(H * 0.2, H * 0.26, "#5a1c1c", "#3a1212");
  band(-H * 0.4, -H * 0.36, "#5a1c1c", "#3a1212");
  // the tiles' joints: courses running to the far end, uprights between
  ctx.save();
  polygon(ctx, [P(X, sec.ceil, 1.4), P(X, sec.ceil, FAR), P(X, sec.floor, FAR), P(X, sec.floor, 1.4)]);
  ctx.clip();
  ctx.strokeStyle = "rgba(40,36,28,0.36)";
  for (let yk = -0.64; yk < 0.52; yk += 0.04) {
    const a = P(X, H * yk, 1.4);
    const b = P(X, H * yk, FAR);
    ctx.lineWidth = Math.max(0.6, u);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  const rnd = lcg(808);
  for (const s of depths(0.07)) {
    const a = P(X, sec.ceil, s);
    const b = P(X, sec.floor, s);
    ctx.lineWidth = Math.max(0.5, 1.2 * u * s);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    // a tile here and there chipped, or a different batch
    if (rnd() < 0.5) {
      const yk = -0.6 + Math.floor(rnd() * 20) * 0.04;
      const s2 = 1 / (1 / s + 0.07);
      polygon(ctx, [P(X, H * yk, s), P(X, H * yk, s2), P(X, H * (yk + 0.04), s2), P(X, H * (yk + 0.04), s)]);
      ctx.fillStyle = rnd() < 0.5 ? "rgba(0,0,0,0.12)" : "rgba(255,250,230,0.1)";
      ctx.fill();
    }
  }
  // the glaze: every tube down the platform caught in it
  for (const s of depths(0.62)) {
    const p = P(X, -H * 0.3, s);
    soft(ctx, p.x, p.y, 60 * u * s * 2.2, H * 0.36 * s, TUBE, 0.16, "lighter");
  }
  // damp coming through near the floor
  for (let i = 0; i < 9; i++) {
    const s = 1 / (1 + rnd() * 7);
    const p = P(X, H * (0.3 + rnd() * 0.2), s);
    soft(ctx, p.x, p.y, 70 * u * s, 40 * u * s, "6,10,8", 0.4);
  }
  ctx.restore();

  // something flat on the wall at a nearness: drawn in the wall's own plane
  const onWall = (s, y, draw) => {
    const o = P(X, y, s);
    // one unit toward us along the wall (it runs away fast: the wall is seen
    // nearly edge on), one unit down
    const k = (s * s) / (L.W * 0.9);
    ctx.save();
    ctx.transform(X * k, y * k, 0, s, o.x, o.y);
    draw();
    ctx.restore();
  };
  // the name: a white bar across a red ring, three times down the platform
  for (const s of [0.86, 0.46, 0.27]) {
    onWall(s, -H * 0.13, () => {
      const k = H / 700;
      ctx.scale(k, k);
      ctx.fillStyle = "#b9b49c";
      ctx.fillRect(-150, -62, 300, 124);
      ctx.strokeStyle = "#a01c1c";
      ctx.lineWidth = 20;
      ctx.beginPath();
      ctx.ellipse(0, 0, 76, 52, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#16224a";
      ctx.fillRect(-140, -17, 280, 34);
      ctx.fillStyle = "#f2f0e6";
      ctx.font = `700 21px ${SIGN_FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(METRO_STATIONS[0].toUpperCase(), 0, 1.5, 264);
    });
  }
  // posters, sun-faded behind their glass
  [
    [0.62, ["#284a6a", "#c8a03c"]],
    [0.35, ["#6a2a3a", "#d8d0b8"]],
  ].forEach(([s, cols], i) => {
    onWall(s, -H * 0.12, () => {
      const k = H / 700;
      ctx.scale(k, k);
      ctx.fillStyle = "#101214";
      ctx.fillRect(-82, -112, 164, 224);
      const g = ctx.createLinearGradient(0, -104, 0, 104);
      g.addColorStop(0, cols[0]);
      g.addColorStop(1, "#14181c");
      ctx.fillStyle = g;
      ctx.fillRect(-74, -104, 148, 208);
      ctx.fillStyle = cols[1];
      if (i === 0) {
        // a seaside: a sun, a band of sea
        ctx.beginPath();
        ctx.arc(20, -40, 34, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(240,236,220,0.75)";
        ctx.fillRect(-74, 20, 148, 5);
        ctx.fillRect(-74, 34, 148, 3);
      } else {
        // a theatre bill: blocks of type too far off to read
        for (let r = 0; r < 6; r++) ctx.fillRect(-56, -80 + r * 26, 112 - (r % 3) * 26, r === 0 ? 14 : 7);
      }
      ctx.fillStyle = "rgba(255,255,255,0.07)";
      ctx.beginPath();
      ctx.moveTo(-74, -104);
      ctx.lineTo(10, -104);
      ctx.lineTo(-40, 104);
      ctx.lineTo(-74, 104);
      ctx.fill();
    });
  });
}

// the ceiling: soot-dark, a conduit, and the row of tubes in their troughs
function paintCeiling(ctx, L) {
  const { P, sec, u, W } = L;
  polygon(ctx, [P(sec.left, sec.ceil, 1.6), P(sec.wall, sec.ceil, 1.6), P(sec.wall, sec.ceil, FAR), P(sec.left, sec.ceil, FAR)]);
  ctx.fillStyle = "#101214";
  ctx.fill();
  // a beam over the platform's edge, the conduit along it
  for (const [X, w, col] of [
    [sec.edge, 16, "#08090a"],
    [W * 0.42, 4, "#2a2c2e"],
  ]) {
    const a = P(X, sec.ceil, 1.6);
    const b = P(X, sec.ceil, FAR);
    ctx.strokeStyle = col;
    ctx.lineWidth = w * u;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  const zs = depths(0.62);
  zs.forEach((s, i) => {
    const s2 = 1 / (1 / s + 0.36);
    const X0 = W * 0.15;
    const X1 = W * 0.21;
    // the trough, then the tube in it
    polygon(ctx, [P(X0 - W * 0.012, sec.ceil, s), P(X1 + W * 0.012, sec.ceil, s), P(X1 + W * 0.012, sec.ceil, s2), P(X0 - W * 0.012, sec.ceil, s2)]);
    ctx.fillStyle = "#3a4040";
    ctx.fill();
    polygon(ctx, [P(X0, sec.ceil, s), P(X1, sec.ceil, s), P(X1, sec.ceil, s2), P(X0, sec.ceil, s2)]);
    // the third one down is failing: the scene flickers it
    ctx.fillStyle = i === 2 ? "#8a9a94" : "#f2fff8";
    ctx.fill();
    if (i !== 2) {
      const p = P((X0 + X1) / 2, sec.ceil, (s + s2) / 2);
      soft(ctx, p.x, p.y, W * 0.16 * s, L.H * 0.16 * s, TUBE, 0.5, "lighter");
    }
  });
}

// the far end: the tunnel's mouth swallowing the track, the end wall of the
// platform with the way out lit in it
function paintFarEnd(ctx, L) {
  const { P, sec, u, H } = L;
  const a = P(sec.left, sec.ceil, FAR);
  const b = P(sec.wall, sec.bed, FAR);
  ctx.fillStyle = "#040506";
  ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
  // the tunnel: an arch of brick rings going in
  const mx = P((sec.left + sec.edge) / 2, 0, FAR).x;
  const bed = P(0, sec.bed, FAR).y;
  const hw = ((sec.edge - sec.left) / 2) * FAR;
  for (let i = 0; i < 5; i++) {
    const k = 1 - i * 0.16;
    ctx.strokeStyle = `rgba(70,64,56,${0.5 - i * 0.09})`;
    ctx.lineWidth = Math.max(1, 2.4 * u * k);
    ctx.beginPath();
    ctx.moveTo(mx - hw * k, bed);
    ctx.lineTo(mx - hw * k, bed - H * 0.07 * k);
    ctx.arc(mx, bed - H * 0.07 * k, hw * k, Math.PI, 0);
    ctx.lineTo(mx + hw * k, bed);
    ctx.stroke();
  }
  // the platform's end wall, tiled like the side, and the exit in it
  const e0 = P(sec.edge, sec.ceil, FAR);
  const e1 = P(sec.wall, sec.floor, FAR);
  ctx.fillStyle = "#56564a";
  ctx.fillRect(e0.x, e0.y, e1.x - e0.x, e1.y - e0.y);
  const door = { x: e0.x + (e1.x - e0.x) * 0.36, y: e1.y - (e1.y - e0.y) * 0.62, w: (e1.x - e0.x) * 0.3, h: (e1.y - e0.y) * 0.62 };
  const dg = ctx.createLinearGradient(0, door.y, 0, door.y + door.h);
  dg.addColorStop(0, "#fff6d8");
  dg.addColorStop(1, "#c8a868");
  ctx.fillStyle = dg;
  ctx.fillRect(door.x, door.y, door.w, door.h);
  // stairs going up in it
  ctx.fillStyle = "rgba(90,70,40,0.5)";
  for (let i = 0; i < 6; i++) ctx.fillRect(door.x, door.y + door.h * (0.4 + i * 0.1), door.w, door.h * 0.03);
  ctx.fillStyle = "#1c6a3c";
  ctx.fillRect(door.x, door.y - door.h * 0.18, door.w, door.h * 0.13);
  soft(ctx, door.x + door.w / 2, door.y + door.h / 2, door.w * 2.2, door.h * 1.6, "255,236,190", 0.3, "lighter");
  // the signal by the tunnel mouth: its box and hood; the scene lights it
  const sg = L.signal;
  ctx.fillStyle = "#0a0a0c";
  ctx.fillRect(sg.x - sg.r * 2, sg.y - sg.r * 5.4, sg.r * 4, sg.r * 8);
  ctx.fillRect(sg.x - sg.r * 0.5, sg.y + sg.r * 2.6, sg.r, sg.r * 8);
  for (const dy of [-3.2, 0]) {
    ctx.fillStyle = "#1c1c20";
    ctx.beginPath();
    ctx.arc(sg.x, sg.y + dy * sg.r, sg.r * 1.1, 0, Math.PI * 2);
    ctx.fill();
  }
}

// what stands on the platform: a slatted bench against the wall, a litter
// bin, the tannoy horn on its bracket
function paintFurniture(ctx, L) {
  const { P, sec, u, H, W } = L;
  // the bench: a box of slats on iron legs, seen down its length
  const bx0 = sec.wall - W * 0.012;
  const bx1 = sec.wall - W * 0.105;
  const s0 = 0.64;
  const s1 = 0.4;
  const seat = H * 0.36;
  const sh = P((bx0 + bx1) / 2, sec.floor, (s0 + s1) / 2);
  soft(ctx, sh.x, sh.y, W * 0.07, H * 0.02, "0,0,0", 0.6);
  for (const s of [s0, s1]) {
    for (const X of [bx0 - W * 0.012, bx1 + W * 0.006]) {
      const a = P(X, seat, s);
      const b = P(X, sec.floor, s);
      ctx.strokeStyle = "#0c0d0e";
      ctx.lineWidth = Math.max(1.5, 6 * u * s);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }
  // its back against the wall, its seat
  polygon(ctx, [P(bx0, seat - H * 0.16, s0), P(bx0, seat - H * 0.16, s1), P(bx0, seat - H * 0.02, s1), P(bx0, seat - H * 0.02, s0)]);
  ctx.fillStyle = "#4a3320";
  ctx.fill();
  polygon(ctx, [P(bx0, seat, s0), P(bx1, seat, s0), P(bx1, seat, s1), P(bx0, seat, s1)]);
  const sg = ctx.createLinearGradient(P(bx1, 0, s0).x, 0, P(bx0, 0, s0).x, 0);
  sg.addColorStop(0, "#8a6842");
  sg.addColorStop(1, "#5a3e24");
  ctx.fillStyle = sg;
  ctx.fill();
  for (let i = 1; i < 4; i++) {
    const X = bx0 + ((bx1 - bx0) * i) / 4;
    const a = P(X, seat, s0);
    const b = P(X, seat, s1);
    ctx.strokeStyle = "rgba(20,12,6,0.7)";
    ctx.lineWidth = Math.max(0.8, 1.4 * u);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  polygon(ctx, [P(bx1, seat, s0), P(bx1, seat + H * 0.02, s0), P(bx0, seat + H * 0.02, s0), P(bx0, seat, s0)]);
  ctx.fillStyle = "#3a2614";
  ctx.fill();
  // a litter bin further down
  const bin = P(sec.wall - W * 0.04, sec.floor, 0.3);
  const bw = W * 0.03 * 0.3;
  const bh = H * 0.2 * 0.3;
  soft(ctx, bin.x, bin.y, bw * 1.4, bh * 0.12, "0,0,0", 0.6);
  const bg = ctx.createLinearGradient(bin.x - bw, 0, bin.x + bw, 0);
  bg.addColorStop(0, "#1c2022");
  bg.addColorStop(0.4, "#5a6266");
  bg.addColorStop(1, "#14181a");
  ctx.fillStyle = bg;
  ctx.fillRect(bin.x - bw, bin.y - bh, bw * 2, bh);
  // the tannoy: a grey horn on a bracket, its mouth toward the platform
  const sp = L.speaker;
  ctx.strokeStyle = "#1c1e20";
  ctx.lineWidth = 5 * u;
  ctx.beginPath();
  ctx.moveTo(sp.x + sp.w * 0.7, sp.y);
  ctx.lineTo(sp.x + sp.w * 0.2, sp.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(sp.x + sp.w * 0.3, sp.y - sp.h * 0.12);
  ctx.lineTo(sp.x - sp.w * 0.5, sp.y - sp.h * 0.5);
  ctx.lineTo(sp.x - sp.w * 0.5, sp.y + sp.h * 0.5);
  ctx.lineTo(sp.x + sp.w * 0.3, sp.y + sp.h * 0.12);
  ctx.closePath();
  const hg = ctx.createLinearGradient(0, sp.y - sp.h * 0.5, 0, sp.y + sp.h * 0.5);
  hg.addColorStop(0, "#9aa2a4");
  hg.addColorStop(1, "#3a4244");
  ctx.fillStyle = hg;
  ctx.fill();
  ctx.fillStyle = "#101214";
  ctx.beginPath();
  ctx.ellipse(sp.x - sp.w * 0.5, sp.y, sp.w * 0.14, sp.h * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#b8c0c2";
  ctx.lineWidth = 1.6 * u;
  ctx.stroke();
}

// the dark of a station with half its lamps off: deep toward the tunnel and
// along the near edges
function paintGloom(ctx, L) {
  const { W, H, u } = L;
  const step = Math.max(6, Math.round(10 * u));
  const cx = W * 0.6;
  const cy = H * 0.5;
  for (let y = 0; y < H; y += step) {
    for (let x = 0; x < W; x += step) {
      const d = Math.hypot((x + step / 2 - cx) / (W * 0.6), (y + step / 2 - cy) / (H * 0.8));
      const left = Math.max(0, (W * 0.3 - x) / (W * 0.3)) * 0.18;
      const a = Math.min(0.78, Math.max(0, d - 0.42) * 1.0 + left);
      if (a <= 0.004) continue;
      ctx.fillStyle = `rgba(4,6,8,${a.toFixed(3)})`;
      ctx.fillRect(x, y, step, step);
    }
  }
}

// The line diagram: an enamel plate on two rods from the ceiling, lit along
// its top. The line's badge and direction, the line itself with a ring at
// every stop, the stops' names above and below it by turns, the first of
// them marked as where we stand, an arrow for the way the trains run.
function paintDiagram(ctx, L) {
  const { u } = L;
  const m = L.map;
  // the rods, and the strip-lamp that lights the plate
  ctx.fillStyle = "#1a1c1e";
  for (const f of [0.12, 0.88]) ctx.fillRect(m.x + m.w * f - 3 * u, 0, 6 * u, m.y + 4 * u);
  soft(ctx, m.x + m.w / 2, m.y + m.h * 0.5, m.w * 0.7, m.h * 1.3, TUBE, 0.14, "lighter");
  // its shadow on the air behind, its steel edge
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(m.x + 5 * u, m.y + 8 * u, m.w, m.h);
  ctx.fillStyle = "#3a3e40";
  ctx.beginPath();
  ctx.roundRect(m.x - 5 * u, m.y - 5 * u, m.w + 10 * u, m.h + 10 * u, 5 * u);
  ctx.fill();
  const g = ctx.createLinearGradient(0, m.y, 0, m.y + m.h);
  g.addColorStop(0, "#1c2430");
  g.addColorStop(0.2, "#101620");
  g.addColorStop(1, "#080b12");
  ctx.fillStyle = g;
  ctx.fillRect(m.x, m.y, m.w, m.h);
  ctx.strokeStyle = "rgba(236,238,230,0.5)";
  ctx.lineWidth = Math.max(1, 1.4 * u);
  ctx.strokeRect(m.x + m.h * 0.04, m.y + m.h * 0.04, m.w - m.h * 0.08, m.h * 0.92);
  // the badge and the heading
  const by = m.y + m.h * 0.17;
  const bx = m.x + m.h * 0.17;
  ctx.fillStyle = `rgb(${AMBER})`;
  ctx.beginPath();
  ctx.arc(bx, by, m.h * 0.075, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#101620";
  ctx.font = `700 ${Math.round(m.h * 0.1)}px ${SIGN_FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("6", bx, by + m.h * 0.006);
  ctx.fillStyle = "#eceee6";
  ctx.textAlign = "left";
  ctx.font = `700 ${Math.round(m.h * 0.085)}px ${SIGN_FONT}`;
  ctx.fillText("EASTBOUND", bx + m.h * 0.12, by - m.h * 0.035);
  ctx.fillStyle = "rgba(236,238,230,0.6)";
  ctx.font = `${Math.round(m.h * 0.06)}px ${SIGN_FONT}`;
  ctx.fillText("Night service · all stations", bx + m.h * 0.12, by + m.h * 0.052);
  // the stops' names
  const fs = Math.max(10, Math.round(m.h * 0.092));
  ctx.textAlign = "center";
  for (const [i, s] of L.lit.stations.entries()) {
    ctx.font = `700 ${fs}px ${SIGN_FONT}`;
    ctx.fillStyle = "#f4f4ec";
    ctx.fillText(s.name, s.x, s.y + s.side * m.h * 0.15);
    if (i === 0) {
      ctx.font = `${Math.round(fs * 0.62)}px ${SIGN_FONT}`;
      ctx.fillStyle = `rgb(${AMBER})`;
      ctx.fillText("YOU ARE HERE", s.x, s.y + m.h * 0.14);
    }
  }
  // the plate has been up thirty years: chips in the enamel, rust from the bolts
  const rnd = lcg(606);
  for (let i = 0; i < 14; i++) {
    const x = m.x + rnd() * m.w;
    const y = m.y + rnd() * m.h;
    ctx.fillStyle = rnd() < 0.5 ? "rgba(60,30,14,0.5)" : "rgba(0,0,0,0.5)";
    ctx.beginPath();
    ctx.ellipse(x, y, (1 + rnd() * 3) * u, (1 + rnd() * 2) * u, rnd() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const [fx, fy] of [
    [0.02, 0.1],
    [0.98, 0.1],
    [0.02, 0.9],
    [0.98, 0.9],
  ]) {
    const x = m.x + m.w * fx;
    const y = m.y + m.h * fy;
    soft(ctx, x, y + 6 * u, 4 * u, 10 * u, "110,56,20", 0.5);
    ctx.fillStyle = "#8a9094";
    ctx.beginPath();
    ctx.arc(x, y, 2.6 * u, 0, Math.PI * 2);
    ctx.fill();
  }
  // the lamp's sheen along its top
  const sheen = ctx.createLinearGradient(0, m.y, 0, m.y + m.h * 0.3);
  sheen.addColorStop(0, "rgba(220,240,232,0.12)");
  sheen.addColorStop(1, "rgba(220,240,232,0)");
  ctx.fillStyle = sheen;
  ctx.fillRect(m.x, m.y, m.w, m.h * 0.3);
}

// the line itself, as its own layer: amber, a white-centred ring at each
// stop, a solid one where we stand, an arrow at its running end
function paintLitLine(L) {
  const c = makeCanvas(L.W, L.H);
  const ctx = c.getContext("2d");
  const [a, b] = L.lit.path;
  const d = L.dot;
  ctx.lineCap = "round";
  ctx.strokeStyle = `rgba(${AMBER},0.14)`;
  ctx.lineWidth = d * 2.2;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x - d * 2, b.y);
  ctx.stroke();
  ctx.strokeStyle = `rgb(${AMBER})`;
  ctx.lineWidth = d * 0.9;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x - d * 2, b.y);
  ctx.stroke();
  // the arrow
  ctx.fillStyle = `rgb(${AMBER})`;
  ctx.beginPath();
  ctx.moveTo(b.x + d * 1.4, b.y);
  ctx.lineTo(b.x - d * 2.4, b.y - d * 2.2);
  ctx.lineTo(b.x - d * 2.4, b.y + d * 2.2);
  ctx.closePath();
  ctx.fill();
  for (const [i, s] of L.lit.stations.entries()) {
    ctx.fillStyle = "#0a0e16";
    ctx.beginPath();
    ctx.arc(s.x, s.y, d * 1.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = i === 0 ? `rgb(${AMBER})` : "#f6f6ee";
    ctx.beginPath();
    ctx.arc(s.x, s.y, d * 1.25, 0, Math.PI * 2);
    ctx.fill();
    if (i === 0) {
      ctx.fillStyle = "#0a0e16";
      ctx.beginPath();
      ctx.arc(s.x, s.y, d * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  return c;
}
