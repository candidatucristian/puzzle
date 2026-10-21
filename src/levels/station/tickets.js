import { soft, grain, vignette, glowCanvas, makeCanvas, addCanvasTexture, lcg } from "../../shared/paint.js";
import { paintDrawerDepth, paintSewingBits } from "./drawerDetails.js";

/** The drawer for STATION, seen from straight above with a candle somewhere
 *  over our left shoulder: oak sides dovetailed at the corners, a lining of
 *  faded green paper, and a continuous strip of old paper tickets joined
 *  by dotted perforations, in the puzzle's original order. Each ticket is
 *  printed with where it is for, when it leaves and from which platform,
 *  and has been stamped across its foot with what became of its train. The
 *  one letter that does not belong in a destination was struck from a slug
 *  that sat low in the forme: it prints a little down and askew.
 *
 *  With them, what else gets left in such a drawer: an ink pad, a pencil,
 *  coins, a ball of thread and needle, buttons and small sewing oddments.
 *
 *  Painted once per screen size: the drawer; a glow for the candle's light. */

const K = { drawer: "tk_drawer", glow: "tk_glow" };
export const STATION_DRAWER_PHOTO = "st_drawer_photo";
export const STATION_DRAWER_PHOTO_URL = "assets/images/Station/drawer-interior.webp";
export const STATION_TICKET_CARD = "st_ticket_card";
export const STATION_TICKET_CARD_URL = "assets/images/Station/ticket-card.webp";
const WARM = "255,190,120";
const CARD = ["#e1d6b7", "#ded3b4", "#e4dabc", "#ddd1b2"];
const PRESS = '"Arial Narrow", "Roboto Condensed", "Helvetica Neue", Arial, sans-serif';
const TYPED = '"Special Elite", "Courier New", monospace';
// the stamps' inks
const STAMP = { BOARDING: "38,52,120", DELAYED: "168,92,24" };
const STAMP_RED = "150,34,28";

export function paintTickets(scene, W, H, rows) {
  const S = Math.min(W, H);
  const c = makeCanvas(W, H);
  const ctx = c.getContext("2d");
  const textures = scene.textures;
  const drawerPhoto = textures.exists(STATION_DRAWER_PHOTO)
    ? textures.get(STATION_DRAWER_PHOTO).getSourceImage()
    : null;
  const ticketCard = textures.exists(STATION_TICKET_CARD)
    ? textures.get(STATION_TICKET_CARD).getSourceImage()
    : null;
  if (drawerPhoto) {
    // The photograph contains the real drawer and its small sewing things;
    // the ticket strip below remains live and keeps the exact puzzle layout.
    ctx.drawImage(drawerPhoto, 0, 0, W, H);
  } else {
    paintDrawer(ctx, W, H, S);
    paintOddments(ctx, W, H, S);
    paintSewingBits(ctx, W, H, S);
  }
  // One continuous paper strip: the dotted perforations leave small bridges
  // between tickets. All destinations, times and stamps retain their order.
  const tw = Math.min(W * 0.112, H * 0.23), th = tw * 2.05;
  paintTicketStrip(ctx, W / 2, H * 0.5, tw, th, rows, ticketCard);
  // the candle's light, falling in from the upper left; the dark of the far end
  const light = { x: W * 0.2, y: H * 0.08, r: S * 0.9 };
  soft(ctx, light.x, light.y, W * 0.8, H * 1.1, WARM, drawerPhoto ? 0.06 : 0.16, "lighter");
  const dark = ctx.createLinearGradient(W * 0.3, 0, W, H);
  dark.addColorStop(0, "rgba(3,3,5,0)");
  dark.addColorStop(1, `rgba(3,3,5,${drawerPhoto ? 0.16 : 0.5})`);
  ctx.fillStyle = dark;
  ctx.fillRect(0, 0, W, H);
  vignette(ctx, W, H, drawerPhoto ? 0.12 : 0.6);
  grain(ctx, W, H, drawerPhoto ? 0.009 : 0.035);
  const t = scene.textures;
  addCanvasTexture(t, K.drawer, c);
  addCanvasTexture(t, K.glow, glowCanvas());
  return { keys: K, light };
}

export function releaseTicketArt(textures) {
  for (const key of Object.values(K)) if (textures.exists(key)) textures.remove(key);
}

function paintTicketStrip(ctx, cx, cy, tw, th, rows, ticketCard) {
  const width = rows.length * tw;
  const strip = makeCanvas(width * 2, th * 2);
  const g = strip.getContext("2d");
  g.scale(2, 2);
  const rnd = lcg(2241);
  rows.forEach((row, i) => paintTicket(g, tw * (i + 0.5), th / 2, tw, th, 0, row, i, rnd, ticketCard));

  // Only the first three tickets retain their accordion folds. Adjacent
  // panels share an edge, so the perforated strip stays physically connected.
  const lifts = [tw * 0.12, 0, tw * 0.26, 0];
  const widths = [0.98, 0.92, 0.92];
  let foldedWidth = 0;
  const panels = rows.map((_, i) => {
    const panel = { x: foldedWidth, w: tw * (widths[i] ?? 1), left: lifts[i] ?? 0, right: lifts[i + 1] ?? 0 };
    foldedWidth += panel.w;
    if (panel.left !== panel.right) {
      const shade = g.createLinearGradient(i * tw, 0, (i + 1) * tw, 0);
      if (panel.right > panel.left) {
        shade.addColorStop(0, "rgba(255,247,211,0.03)");
        shade.addColorStop(0.84, "rgba(255,247,211,0.18)");
        shade.addColorStop(1, "rgba(255,250,225,0.28)");
      } else {
        shade.addColorStop(0, "rgba(47,32,15,0.24)");
        shade.addColorStop(0.18, "rgba(47,32,15,0.15)");
        shade.addColorStop(1, "rgba(47,32,15,0.025)");
      }
      g.fillStyle = shade; g.fillRect(i * tw, 0, tw, th);
    }
    return panel;
  });

  // A shallow fold at each seam catches light, followed by the actual holes.
  for (let i = 1; i < rows.length; i++) {
    const x = i * tw;
    const fold = g.createLinearGradient(x - tw * 0.085, 0, x + tw * 0.065, 0);
    fold.addColorStop(0, "rgba(56,35,12,0)");
    fold.addColorStop(0.48, "rgba(56,35,12,0.14)");
    fold.addColorStop(0.53, "rgba(255,249,220,0.21)");
    fold.addColorStop(1, "rgba(255,249,220,0)");
    g.fillStyle = fold; g.fillRect(x - tw * 0.085, 0, tw * 0.15, th);
    const pitch = Math.max(3.5, tw * 0.044), hole = Math.max(0.5, tw * 0.006);
    g.save(); g.globalCompositeOperation = "destination-out";
    for (let y = pitch; y < th - 2; y += pitch) {
      g.beginPath(); g.ellipse(x, y, hole, hole * 1.35, 0, 0, Math.PI * 2);
      g.fillStyle = "#000"; g.fill();
    }
    for (const y of [0, th]) {
      g.beginPath(); g.arc(x, y, tw * 0.016, 0, Math.PI * 2); g.fill();
    }
    g.restore();
    g.strokeStyle = "rgba(255,247,210,0.48)"; g.lineWidth = 0.5;
    g.setLineDash([hole * 1.8, pitch - hole * 1.8]);
    g.beginPath(); g.moveTo(x + hole, pitch); g.lineTo(x + hole, th - pitch); g.stroke();
    g.setLineDash([]);
  }
  // The thin cut edge and a lifted final corner show the stock's thickness.
  g.fillStyle = "rgba(244,235,204,0.7)"; g.fillRect(0, 0, width, 0.9);
  g.fillStyle = "rgba(95,68,29,0.24)"; g.fillRect(0, th - 1.2, width, 1.2);
  const curl = tw * 0.12;
  g.beginPath(); g.moveTo(width - curl, th); g.quadraticCurveTo(width - curl * 0.5, th - curl, width, th - curl);
  g.lineTo(width, th); g.closePath();
  g.fillStyle = "#c0b08c"; g.fill();
  g.beginPath(); g.moveTo(width - curl, th); g.quadraticCurveTo(width - curl * 0.25, th - curl * 0.3, width, th - curl);
  g.quadraticCurveTo(width - curl * 0.05, th - curl * 0.03, width - curl, th);
  g.fillStyle = "#eee2be"; g.fill();

  ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.012);
  ctx.translate(-foldedWidth / 2, -th / 2);
  // Shadows spread farther underneath a raised ridge and tighten at a valley.
  // Paint every shadow before the paper, keeping ink and neighbouring panels clear.
  ctx.save();
  for (const p of panels) {
    const raised = Math.max(p.left, p.right);
    ctx.shadowColor = "rgba(0,0,0,0.56)";
    ctx.shadowBlur = tw * 0.045 + raised * 0.3;
    ctx.shadowOffsetX = tw * 0.018 + raised * 0.12;
    ctx.shadowOffsetY = tw * 0.035 + raised * 0.35;
    ctx.beginPath(); ctx.moveTo(p.x, -p.left); ctx.lineTo(p.x + p.w, -p.right);
    ctx.lineTo(p.x + p.w, th - p.right); ctx.lineTo(p.x, th - p.left); ctx.closePath();
    ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.fill();
  }
  ctx.restore();
  // Shear the printing with each paper face, not just its outline. Matching
  // endpoints preserve the dotted joins and keep every clue fully visible.
  panels.forEach((p, i) => {
    ctx.save();
    ctx.transform(p.w / tw, (p.left - p.right) / tw, 0, 1, p.x, -p.left);
    ctx.drawImage(strip, i * tw * 2, 0, tw * 2, th * 2, 0, 0, tw, th);
    ctx.restore();
  });
  ctx.restore();
}

// The drawer itself: its paper lining, stained; its four sides, standing up
// round it and throwing their shadow in; the dovetails at its corners.
function paintDrawer(ctx, W, H, S) {
  const rnd = lcg(907);
  const b = S * 0.055; // how thick its sides look from here
  const paper = ctx.createLinearGradient(0, 0, W, H);
  paper.addColorStop(0, "#36402f");
  paper.addColorStop(1, "#1f271d");
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, W, H);
  // the lining's little printed sprig, mostly faded out
  for (let y = b; y < H - b; y += S * 0.045) {
    for (let x = b + ((y / (S * 0.045)) % 2) * S * 0.0225; x < W - b; x += S * 0.045) {
      ctx.fillStyle = `rgba(214,206,160,${(0.02 + rnd() * 0.05).toFixed(3)})`;
      ctx.beginPath(); ctx.arc(x, y, S * 0.0026, 0, Math.PI * 2); ctx.fill();
    }
  }
  // foxing, a ring where something wet stood, a tear with the wood through it
  for (let i = 0; i < 40; i++) soft(ctx, rnd() * W, rnd() * H, S * (0.02 + rnd() * 0.07), S * (0.015 + rnd() * 0.05), rnd() < 0.6 ? "20,14,8" : "120,110,70", 0.05 + rnd() * 0.08);
  ctx.strokeStyle = "rgba(14,10,6,0.3)";
  ctx.lineWidth = S * 0.005;
  ctx.beginPath(); ctx.arc(W * 0.83, H * 0.74, S * 0.05, 0.3, Math.PI * 1.8); ctx.stroke();
  ctx.fillStyle = "#3a2616";
  ctx.beginPath();
  ctx.moveTo(W * 0.1, H - b); ctx.lineTo(W * 0.13, H - b - S * 0.035); ctx.lineTo(W * 0.15, H - b - S * 0.012); ctx.lineTo(W * 0.175, H - b - S * 0.028); ctx.lineTo(W * 0.19, H - b);
  ctx.closePath();
  ctx.fill();
  // the sides' shadow on the bottom: deepest under the left and the top
  for (const [x0, y0, x1, y1, a] of [[0, b, 0, b + S * 0.09, 0.75], [b, 0, b + S * 0.07, 0, 0.6], [0, H - b, 0, H - b - S * 0.03, 0.35], [W - b, 0, W - b - S * 0.03, 0, 0.35]]) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, `rgba(0,0,0,${a})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  // the sides: oak, each with its grain along it
  const side = (x, y, w, h, along, tone) => {
    ctx.fillStyle = tone;
    ctx.fillRect(x, y, w, h);
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    for (let i = 0; i < 46; i++) {
      ctx.strokeStyle = rnd() < 0.6 ? "rgba(8,4,2,0.22)" : "rgba(255,206,160,0.07)";
      ctx.lineWidth = 0.6 + rnd() * 1.4;
      ctx.beginPath();
      if (along) { const yy = y + rnd() * h; ctx.moveTo(x, yy); ctx.bezierCurveTo(x + w * 0.3, yy + (rnd() - 0.5) * 5, x + w * 0.7, yy + (rnd() - 0.5) * 5, x + w, yy); }
      else { const xx = x + rnd() * w; ctx.moveTo(xx, y); ctx.bezierCurveTo(xx + (rnd() - 0.5) * 5, y + h * 0.3, xx + (rnd() - 0.5) * 5, y + h * 0.7, xx, y + h); }
      ctx.stroke();
    }
    ctx.restore();
  };
  side(0, 0, W, b, true, "#4a3120");
  side(0, H - b, W, b, true, "#2c1c11");
  side(0, 0, b, H, false, "#3c2718");
  side(W - b, 0, b, H, false, "#30200f");
  // the dovetails: the ends of the long sides showing in the short ones
  for (const x of [0, W - b]) {
    for (const [y, flip] of [[0, 1], [H - b, -1]]) {
      for (let i = 0; i < 2; i++) {
        const cy = y + b * (0.28 + i * 0.44), wide = b * 0.15, narrow = b * 0.08;
        const near = x === 0 ? x + b : x, far = x === 0 ? x : x + b;
        ctx.fillStyle = flip > 0 ? "#553a26" : "#3a2616";
        ctx.beginPath();
        ctx.moveTo(near, cy - narrow); ctx.lineTo(far, cy - wide); ctx.lineTo(far, cy + wide); ctx.lineTo(near, cy + narrow);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "rgba(6,3,1,0.7)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }
  // the top edges of the sides catch the candle; their inner faces do not
  ctx.fillStyle = "rgba(255,214,170,0.14)";
  ctx.fillRect(0, 0, W, b * 0.12);
  ctx.fillRect(0, 0, b * 0.12, H);
  ctx.strokeStyle = "rgba(4,2,1,0.85)";
  ctx.lineWidth = Math.max(1.5, S * 0.004);
  ctx.strokeRect(b, b, W - b * 2, H - b * 2);
  paintDrawerDepth(ctx, W, H, S);
}

// what else is in the drawer: an ink pad with its lid off, a pencil, three coins
function paintOddments(ctx, W, H, S) {
  // the ink pad: a flat tin, the felt in it gone nearly black
  const px = W * 0.8, py = H * 0.17, pw = S * 0.2, ph = S * 0.115;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(0.07);
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = S * 0.02;
  ctx.shadowOffsetY = S * 0.008;
  const tin = ctx.createLinearGradient(0, -ph / 2, 0, ph / 2);
  tin.addColorStop(0, "#6a6e72");
  tin.addColorStop(1, "#33363a");
  ctx.fillStyle = tin;
  ctx.beginPath(); ctx.roundRect(-pw / 2, -ph / 2, pw, ph, S * 0.012); ctx.fill();
  ctx.shadowColor = "transparent";
  const felt = ctx.createLinearGradient(-pw / 2, 0, pw / 2, 0);
  felt.addColorStop(0, "#1a1f44");
  felt.addColorStop(1, "#0c0e22");
  ctx.fillStyle = felt;
  ctx.beginPath(); ctx.roundRect(-pw * 0.44, -ph * 0.39, pw * 0.88, ph * 0.78, S * 0.006); ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.6)";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(-pw / 2 + S * 0.01, -ph / 2 + 1.5, pw - S * 0.02, 1.5);
  ctx.restore();
  // the pencil: red, chewed, sharpened with a knife
  ctx.save();
  ctx.translate(W * 0.36, H * 0.85);
  ctx.rotate(-0.045);
  const len = S * 0.3, th = S * 0.014;
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = S * 0.012;
  ctx.shadowOffsetY = S * 0.006;
  const body = ctx.createLinearGradient(0, -th / 2, 0, th / 2);
  body.addColorStop(0, "#a03a2c");
  body.addColorStop(0.45, "#7a2218");
  body.addColorStop(1, "#40100a");
  ctx.fillStyle = body;
  ctx.fillRect(-len / 2, -th / 2, len, th);
  ctx.shadowColor = "transparent";
  ctx.fillStyle = "#c8a878";
  ctx.beginPath(); ctx.moveTo(len / 2, -th / 2); ctx.lineTo(len / 2 + th * 1.9, 0); ctx.lineTo(len / 2, th / 2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#1a1a1c";
  ctx.beginPath(); ctx.moveTo(len / 2 + th * 1.3, -th * 0.16); ctx.lineTo(len / 2 + th * 1.9, 0); ctx.lineTo(len / 2 + th * 1.3, th * 0.16); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "rgba(255,230,210,0.25)";
  ctx.fillRect(-len / 2, -th * 0.3, len, th * 0.12);
  ctx.restore();
  // three coins
  for (const [fx, fy, r, tone] of [[0.615, 0.86, 0.02, "#8a6a34"], [0.648, 0.835, 0.016, "#77787c"], [0.66, 0.878, 0.018, "#8a6a34"]]) {
    const x = W * fx, y = H * fy, R = S * r;
    soft(ctx, x + R * 0.2, y + R * 0.3, R * 1.5, R * 1.5, "0,0,0", 0.6);
    const g = ctx.createRadialGradient(x - R * 0.4, y - R * 0.4, R * 0.1, x, y, R);
    g.addColorStop(0, "#d8c8a0");
    g.addColorStop(0.5, tone);
    g.addColorStop(1, "#1e1608");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, y, R * 0.8, 0, Math.PI * 2); ctx.stroke();
  }
}

// One card ticket, w by h, its middle at (cx, cy), turned by `rot`.
function paintTicket(ctx, cx, cy, w, h, rot, row, i, rnd, ticketCard) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  // A photographed, individually cut piece of ticket card; all printed
  // puzzle information stays live below, so every clue remains exact.
  if (ticketCard) {
    ctx.drawImage(ticketCard, -w / 2, -h / 2, w, h);
  } else {
    ctx.fillStyle = CARD[i % CARD.length];
    ctx.beginPath(); ctx.rect(-w / 2, -h / 2, w, h); ctx.fill();
  }
  ctx.save();
  ctx.beginPath(); ctx.rect(-w / 2, -h / 2, w, h);
  ctx.clip();
  // Keep every stain and every line of live type inside the photographed
  // card's transparent cut edge, including its slightly worn corners.
  if (ticketCard) ctx.globalCompositeOperation = "source-atop";
  // the years on it: gone brown toward the edges, thumbed, flecked
  const age = ctx.createRadialGradient(0, 0, w * 0.2, 0, 0, h * 0.62);
  age.addColorStop(0, "rgba(120,84,40,0)");
  age.addColorStop(1, "rgba(120,84,40,0.3)");
  ctx.fillStyle = age;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  for (let k = 0; k < 850; k++) {
    ctx.fillStyle = rnd() < 0.7 ? `rgba(70,46,20,${(0.025 + rnd() * 0.07).toFixed(3)})` : "rgba(255,250,235,0.16)";
    ctx.fillRect((rnd() - 0.5) * w, (rnd() - 0.5) * h, 0.2 + rnd() * 1.3, 0.25 + rnd() * 0.5);
  }
  soft(ctx, (rnd() - 0.5) * w * 0.6, h * (0.38 + rnd() * 0.1), w * 0.3, w * 0.2, "80,56,28", 0.14);
  // ── what is printed on it
  const ink = "rgba(30,24,20,0.88)";
  const rule = (y, weight = 1) => { ctx.fillStyle = ink; ctx.fillRect(-w * 0.42, h * y, w * 0.84, Math.max(1, w * 0.008 * weight)); };
  const small = (text, y, size = 0.068) => {
    ctx.font = `700 ${w * size}px ${PRESS}`;
    ctx.fillStyle = ink;
    ctx.fillText(text, 0, h * y);
  };
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  rule(-0.455, 2);
  rule(-0.445);
  small("2ND CLASS  ·  SINGLE", -0.41);
  ctx.font = `${w * 0.092}px ${TYPED}`;
  ctx.fillStyle = "rgba(122,40,30,0.85)";
  ctx.fillText("No " + String(1000 + Math.floor(rnd() * 8999)).padStart(5, "0"), 0, -h * 0.345);
  rule(-0.295);
  small("TO", -0.255);
  // the destination, letter by letter — the one struck from the low slug
  // prints a little down and askew
  const n = row.dest.length, pitch = (w * 0.84) / n, fs = Math.min(w * 0.19, pitch / 0.78);
  ctx.font = `700 ${fs}px ${PRESS}`;
  ctx.fillStyle = ink;
  for (let k = 0; k < n; k++) {
    const x = (k - (n - 1) / 2) * pitch, y = -h * 0.165;
    if (k !== row.wrongIdx) { ctx.fillText(row.dest[k], x, y); continue; }
    ctx.save();
    ctx.translate(x, y + fs * 0.085);
    ctx.rotate(-0.07);
    ctx.fillText(row.dest[k], 0, 0);
    ctx.fillText(row.dest[k], w * 0.004, 0);
    ctx.restore();
  }
  rule(-0.085);
  small("DEP.", -0.048);
  ctx.font = `${w * 0.215}px ${TYPED}`;
  ctx.fillStyle = ink;
  ctx.fillText(row.time, 0, h * 0.04);
  rule(0.108);
  paintTrainMark(ctx, 0, h * 0.19, w, h);
  rule(0.27);
  rule(0.45, 2);
  // ── what became of its train, stamped across its foot (and off its edge)
  const stamp = paintStamp(row.remark, w, rnd);
  ctx.globalCompositeOperation = ticketCard ? "source-atop" : "multiply";
  ctx.translate((rnd() - 0.5) * w * 0.05, h * 0.352);
  ctx.rotate(-0.17 + (rnd() - 0.5) * 0.1);
  ctx.drawImage(stamp, -stamp.width / 2, -stamp.height / 2);
  ctx.globalCompositeOperation = "source-over";
  ctx.restore();
  ctx.restore();
}

function paintTrainMark(ctx, x, y, w, h) {
  // A small printer's sketch, not a filled badge: the station mark should
  // read as a train at a glance without taking over the ticket face.
  const s = Math.min(w * 0.22, h * 0.12);
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = "rgba(48,38,29,0.76)";
  ctx.lineWidth = Math.max(0.7, s * 0.055);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // Fine, slightly imperfect outlines like a little engraved rail mark.
  roundRect(ctx, -s * 0.78, -s * 0.25, s * 0.92, s * 0.52, s * 0.09);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(s * 0.12, -s * 0.1);
  ctx.lineTo(s * 0.38, -s * 0.1);
  ctx.lineTo(s * 0.62, s * 0.1);
  ctx.lineTo(s * 0.62, s * 0.27);
  ctx.lineTo(s * 0.12, s * 0.27);
  ctx.stroke();
  ctx.strokeRect(-s * 0.38, -s * 0.52, s * 0.17, s * 0.27);
  ctx.strokeRect(s * 0.28, -s * 0.37, s * 0.16, s * 0.3);
  ctx.beginPath();
  ctx.arc(-s * 0.45, s * 0.31, s * 0.17, 0, Math.PI * 2);
  ctx.arc(s * 0.08, s * 0.31, s * 0.17, 0, Math.PI * 2);
  ctx.arc(s * 0.45, s * 0.31, s * 0.17, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = Math.max(0.55, s * 0.035);
  ctx.beginPath();
  ctx.moveTo(-s * 0.86, s * 0.53);
  ctx.lineTo(s * 0.68, s * 0.53);
  ctx.stroke();
  // a brief smoke curl, deliberately only two light strokes
  ctx.beginPath();
  ctx.moveTo(-s * 0.29, -s * 0.57);
  ctx.quadraticCurveTo(-s * 0.46, -s * 0.78, -s * 0.25, -s * 0.87);
  ctx.moveTo(-s * 0.04, -s * 0.55);
  ctx.quadraticCurveTo(s * 0.1, -s * 0.71, -s * 0.02, -s * 0.82);
  ctx.stroke();
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// A rubber stamp's mark, for a ticket w wide: the word in a box, the ink
// thin in places where the rubber did not meet the card.
function paintStamp(word, w, rnd) {
  const sw = Math.ceil(w * 0.86), sh = Math.ceil(w * 0.25);
  const c = makeCanvas(sw, sh);
  const g = c.getContext("2d");
  const rgb = STAMP[word] || STAMP_RED;
  g.strokeStyle = `rgba(${rgb},0.85)`;
  g.lineWidth = Math.max(1.5, w * 0.022);
  g.strokeRect(g.lineWidth, g.lineWidth, sw - g.lineWidth * 2, sh - g.lineWidth * 2);
  let fs = sh * 0.58;
  g.font = `700 ${fs}px ${PRESS}`;
  const fit = (sw * 0.84) / g.measureText(word).width;
  if (fit < 1) { fs *= fit; g.font = `700 ${fs}px ${PRESS}`; }
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = `rgba(${rgb},0.88)`;
  g.fillText(word, sw / 2, sh / 2 + fs * 0.04);
  g.globalCompositeOperation = "destination-out";
  for (let k = 0; k < 260; k++) {
    g.fillStyle = `rgba(0,0,0,${(0.3 + rnd() * 0.6).toFixed(2)})`;
    g.fillRect(rnd() * sw, rnd() * sh, 0.6 + rnd() * 2.6, 0.6 + rnd() * 1.6);
  }
  const thin = g.createLinearGradient(0, 0, sw, 0);
  thin.addColorStop(0, "rgba(0,0,0,0)");
  thin.addColorStop(1, `rgba(0,0,0,${(0.2 + rnd() * 0.35).toFixed(2)})`);
  g.fillStyle = thin;
  g.fillRect(0, 0, sw, sh);
  return c;
}
