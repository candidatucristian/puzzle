import { soft, grain, vignette, makeCanvas, addCanvasTexture, lcg } from "../../shared/paint.js";
import { RACK, TAG } from "./puzzle.js";
import { photographPhial, photographPhialsFront, photographPhialsRoom } from "./photography.js";

/** TWO PHIALS, painted: close at Silas's sinks, under the window — the white
 *  tiles of the splashback in the moon, the slate of the counter, the brass of
 *  a tap and the lip of a basin at the edge, and on the counter his little
 *  rack: a phial of yellow, an empty tube, a phial of blue; a paper tag tied
 *  to its post, in his hand.
 *
 *  The three tubes are painted apart, so they can be lifted from the rack. */

export const KEYS = {
  room: "ph_room",
  front: "ph_rack_front",
  tube: (i) => `ph_tube_${i}`,
};

const RES = 2; // the tubes are painted at twice their size

export function layoutPhials(W, H) {
  const u = Math.min(W / 1000, H / 620);
  const L = { W, H, u };
  L.counter = H * 0.62; // the counter's back edge, against the tiles
  L.front = H * 0.97; // its front edge
  L.rack = { x: W * 0.52, base: L.counter + 92 * u, w: 330 * u, h: 128 * u };
  L.tube = { w: 36 * u, h: 220 * u };
  L.lift = 150 * u;
  L.clearAt = .5;
  // where each tube stands in the rack: its foot on the rack's lower bar
  L.tubes = RACK.map((t, i) => ({ ...t, i, home: { x: L.rack.x + (i - 1) * 104 * u, y: L.rack.base - 16 * u } }));
  return L;
}

export function paintPhials(scene, L) {
  const t = scene.textures;
  const room = photographPhialsRoom(scene, L) ?? paintRoom(L);
  addCanvasTexture(t, KEYS.room, room);
  const front = photographPhialsFront(L, room);
  if (front) addCanvasTexture(t, KEYS.front, front);
  for (const tube of L.tubes) addCanvasTexture(t, KEYS.tube(tube.i), paintTube(L, tube, L.photographic ? photographPhial(scene, tube.i) : null));
}

export function releasePhials(textures) {
  for (const k of [KEYS.room, KEYS.front, ...RACK.map((_, i) => KEYS.tube(i))]) if (textures.exists(k)) textures.remove(k);
}

export function tubeBox(L) {
  return { w: L.tube.w + 14 * L.u, h: L.photographic ? L.tube.h * 1.12 + 8 * L.u : L.tube.h + 26 * L.u };
}
// ── the room ───────────────────────────────────────────────────────────────

function paintRoom(L) {
  const { W, H, u, counter, front, rack } = L;
  const c = makeCanvas(W, H), g = c.getContext("2d");
  const rnd = lcg(7741);

  // the splashback: white glazed tiles, laid as bricks, in the moon's blue
  const wall = g.createLinearGradient(0, 0, 0, counter);
  wall.addColorStop(0, "#5a6470"); wall.addColorStop(0.55, "#7d8894"); wall.addColorStop(1, "#8e98a2");
  g.fillStyle = wall; g.fillRect(0, 0, W, counter);
  const tw = 128 * u, th = 62 * u, grout = 3.2 * u;
  for (let row = 0, y = counter - th; y > -th; row++, y -= th) {
    for (let x = (row % 2 ? -tw / 2 : 0) - tw; x < W + tw; x += tw) {
      const shade = 0.92 + rnd() * 0.12;
      const tile = g.createLinearGradient(x, y, x, y + th);
      tile.addColorStop(0, `rgba(${Math.round(196 * shade)},${Math.round(204 * shade)},${Math.round(212 * shade)},1)`);
      tile.addColorStop(1, `rgba(${Math.round(150 * shade)},${Math.round(160 * shade)},${Math.round(170 * shade)},1)`);
      g.fillStyle = tile;
      g.beginPath(); g.roundRect(x + grout / 2, y + grout / 2, tw - grout, th - grout, 4 * u); g.fill();
      // the glaze: a soft sheen along its top edge
      g.fillStyle = "rgba(255,255,255,0.16)";
      g.beginPath(); g.roundRect(x + grout, y + grout, tw - grout * 2, th * 0.22, 3 * u); g.fill();
    }
  }
  // the grout's own dark
  g.globalCompositeOperation = "destination-over";
  g.fillStyle = "#2c3238"; g.fillRect(0, 0, W, counter);
  g.globalCompositeOperation = "source-over";
  // the night on the tiles: dark above and to the left, the moon from the window at the right
  const night = g.createLinearGradient(0, 0, W, counter);
  night.addColorStop(0, "rgba(6,9,14,0.78)"); night.addColorStop(0.55, "rgba(10,14,22,0.42)"); night.addColorStop(1, "rgba(14,20,30,0.2)");
  g.fillStyle = night; g.fillRect(0, 0, W, counter);
  soft(g, W * 0.78, counter * 0.35, W * 0.42, counter * 0.6, "150,178,232", 0.22, "screen");
  // the warm of the lamp across the room, faint, low on the left
  soft(g, W * 0.06, counter * 0.9, W * 0.3, counter * 0.4, "255,190,120", 0.12, "screen");

  // the counter: slate, dark, wet in places, its back edge a thin line of light
  const slate = g.createLinearGradient(0, counter, 0, front);
  slate.addColorStop(0, "#232a31"); slate.addColorStop(0.5, "#1a1f25"); slate.addColorStop(1, "#0d1014");
  g.fillStyle = slate; g.fillRect(0, counter, W, H - counter);
  for (let k = 0; k < 2600; k++) {
    g.fillStyle = rnd() < 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.12)";
    g.fillRect(rnd() * W, counter + rnd() * (front - counter), 1.4 * u, 1.4 * u);
  }
  g.fillStyle = "rgba(170,190,215,0.28)"; g.fillRect(0, counter, W, 1.6 * u);
  soft(g, W * 0.7, counter + 60 * u, W * 0.4, 70 * u, "150,178,232", 0.1, "screen");
  // its front edge, and the dark under it
  g.fillStyle = "rgba(160,180,205,0.18)"; g.fillRect(0, front - 2 * u, W, 2 * u);
  g.fillStyle = "#06080a"; g.fillRect(0, front, W, H - front);

  // at the left edge: the white lip of a basin, and the brass tap over it
  g.save();
  g.beginPath(); g.ellipse(-30 * u, counter + 120 * u, 250 * u, 74 * u, 0, 0, Math.PI * 2);
  g.fillStyle = "#c9ccc8"; g.fill();
  g.beginPath(); g.ellipse(-36 * u, counter + 124 * u, 228 * u, 60 * u, 0, 0, Math.PI * 2);
  const bowl = g.createRadialGradient(-30 * u, counter + 140 * u, 10 * u, -30 * u, counter + 124 * u, 230 * u);
  bowl.addColorStop(0, "#5f6466"); bowl.addColorStop(1, "#a7aba8"); g.fillStyle = bowl; g.fill();
  g.restore();
  soft(g, 0, counter + 120 * u, 260 * u, 90 * u, "4,6,9", 0.45);
  const brassAt = (x0, x1) => { const gr = g.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, "#3a2a0e"); gr.addColorStop(0.45, "#c9a457"); gr.addColorStop(0.6, "#f2dc9c"); gr.addColorStop(1, "#5a4012"); return gr; };
  const tapX = 128 * u;
  g.fillStyle = brassAt(tapX - 12 * u, tapX + 12 * u); g.fillRect(tapX - 11 * u, counter - 150 * u, 22 * u, 150 * u);
  g.strokeStyle = brassAt(tapX - 60 * u, tapX + 20 * u); g.lineWidth = 20 * u; g.lineCap = "round";
  g.beginPath(); g.moveTo(tapX, counter - 150 * u); g.quadraticCurveTo(tapX, counter - 205 * u, tapX - 46 * u, counter - 196 * u); g.lineTo(tapX - 64 * u, counter - 150 * u); g.stroke();
  g.fillStyle = brassAt(tapX - 26 * u, tapX + 26 * u); g.beginPath(); g.ellipse(tapX, counter + 4 * u, 26 * u, 8 * u, 0, 0, Math.PI * 2); g.fill();
  soft(g, tapX, counter - 120 * u, 50 * u, 110 * u, "4,6,9", 0.38);

  // the rack: walnut, two posts, a bar with three holes, a foot bar below
  const { x, base, w, h } = rack;
  const wood = (x0, x1) => { const gr = g.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, "#2a160a"); gr.addColorStop(0.5, "#5a3518"); gr.addColorStop(1, "#24130a"); return gr; };
  // its shadow on the slate, away from the moon
  soft(g, x - 30 * u, base + 8 * u, w * 0.62, 22 * u, "0,0,0", 0.6);
  // the foot board
  g.fillStyle = wood(x - w / 2, x + w / 2); g.fillRect(x - w / 2, base - 18 * u, w, 18 * u);
  g.fillStyle = "rgba(255,220,170,0.14)"; g.fillRect(x - w / 2, base - 18 * u, w, 2 * u);
  // the posts
  for (const side of [-1, 1]) {
    const px = x + side * (w / 2 - 12 * u);
    g.fillStyle = wood(px - 10 * u, px + 10 * u); g.fillRect(px - 10 * u, base - h, 20 * u, h - 18 * u);
    g.fillStyle = "rgba(150,178,232,0.12)"; g.fillRect(px + 6 * u, base - h, 3 * u, h - 18 * u);
  }
  // the upper bar the tubes stand through (its holes are drawn over by the tubes)
  const barY = base - h + 22 * u;
  g.fillStyle = wood(x - w / 2, x + w / 2); g.fillRect(x - w / 2 + 4 * u, barY, w - 8 * u, 20 * u);
  g.fillStyle = "rgba(255,220,170,0.16)"; g.fillRect(x - w / 2 + 4 * u, barY, w - 8 * u, 2 * u);
  g.fillStyle = "rgba(0,0,0,0.35)"; g.fillRect(x - w / 2 + 4 * u, barY + 18 * u, w - 8 * u, 2 * u);
  for (const t of L.tubes) {
    g.fillStyle = "#120a05"; g.beginPath(); g.ellipse(t.home.x, barY + 4 * u, L.tube.w * 0.62, 5 * u, 0, 0, Math.PI * 2); g.fill();
  }
  L.barY = barY;

  // the tag, tied to the right post with a thread, hanging a little turned
  const knot = { x: x + w / 2 - 12 * u, y: base - h + 8 * u };
  const tag = { x: knot.x + 34 * u, y: knot.y + 62 * u, w: 196 * u, h: 66 * u, a: 0.09 };
  g.strokeStyle = "rgba(210,196,160,0.8)"; g.lineWidth = 1.2 * u;
  g.beginPath(); g.moveTo(knot.x, knot.y); g.quadraticCurveTo(knot.x + 26 * u, knot.y + 22 * u, tag.x + 8 * u, tag.y + 6 * u); g.stroke();
  g.save();
  g.translate(tag.x, tag.y); g.rotate(tag.a);
  soft(g, 10 * u, tag.h * 0.6, tag.w * 0.6, tag.h * 0.5, "0,0,0", 0.4);
  g.beginPath();
  g.moveTo(14 * u, 0); g.lineTo(tag.w, 0); g.lineTo(tag.w, tag.h); g.lineTo(14 * u, tag.h); g.lineTo(0, tag.h - 16 * u); g.lineTo(0, 16 * u); g.closePath();
  const paper = g.createLinearGradient(0, 0, tag.w, tag.h);
  paper.addColorStop(0, "#c8b994"); paper.addColorStop(1, "#a08d66");
  g.fillStyle = paper; g.fill();
  g.strokeStyle = "rgba(60,40,20,0.35)"; g.lineWidth = 0.8 * u; g.stroke();
  // its eyelet
  g.fillStyle = "#3a2a16"; g.beginPath(); g.arc(12 * u, tag.h / 2, 4.5 * u, 0, Math.PI * 2); g.fill();
  g.strokeStyle = "rgba(230,215,180,0.7)"; g.lineWidth = 1.2 * u; g.stroke();
  // his hand, in ink
  g.fillStyle = "#1f150c"; g.textBaseline = "middle"; g.textAlign = "left";
  g.font = `500 ${Math.round(23 * u)}px "Dancing Script", "Segoe Script", cursive`;
  g.fillText(TAG, 24 * u, tag.h / 2 + 2 * u);
  // the moon on it
  g.fillStyle = "rgba(150,178,232,0.12)"; g.fillRect(0, 0, tag.w, tag.h);
  g.restore();

  grain(g, W, H, 0.05);
  vignette(g, W, H, 0.55);
  return c;
}

// ── a tube ─────────────────────────────────────────────────────────────────

// A glass tube, round at the foot; a coloured one stoppered with cork. Painted
// standing at the bottom middle of the texture.
function paintTube(L, tube, photograph = null) {
  const { u } = L, R = RES, { w, h } = L.tube;
  const { w: W, h: Hh } = tubeBox(L);
  const c = makeCanvas(W * R, Hh * R), g = c.getContext("2d");
  g.scale(R, R);
  const cx = W / 2, foot = Hh - 3 * u, top = foot - h, r = w / 2;
  if (photograph) {
    const height = h * (tube.liquid ? 1.094 : 1), width = w + 4 * u;
    g.filter = "brightness(.82) saturate(.86)";
    g.drawImage(photograph, cx - width / 2, foot - height, width, height);
    return c;
  }
  const body = () => {
    g.beginPath();
    g.moveTo(cx - r, top + 4 * u);
    g.lineTo(cx - r, foot - r);
    g.arc(cx, foot - r, r, Math.PI, 0, true);
    g.lineTo(cx + r, top + 4 * u);
    g.closePath();
  };
  // the glass
  body(); g.fillStyle = "rgba(190,210,225,0.12)"; g.fill();
  // what is in it
  if (tube.liquid) {
    const [lr, lg, lb] = tube.liquid;
    const level = foot - (foot - top) * tube.full;
    g.save(); body(); g.clip();
    const liquid = g.createLinearGradient(cx - r, 0, cx + r, 0);
    liquid.addColorStop(0, `rgba(${lr * 0.55},${lg * 0.55},${lb * 0.55},0.95)`);
    liquid.addColorStop(0.35, `rgba(${lr},${lg},${lb},0.92)`);
    liquid.addColorStop(0.7, `rgba(${Math.min(255, lr * 1.12)},${Math.min(255, lg * 1.12)},${Math.min(255, lb * 1.12)},0.9)`);
    liquid.addColorStop(1, `rgba(${lr * 0.5},${lg * 0.5},${lb * 0.5},0.95)`);
    g.fillStyle = liquid; g.fillRect(cx - r, level, w, foot - level);
    // the light through it, pooled at the foot
    const glowFoot = g.createRadialGradient(cx, foot - r * 0.8, 0, cx, foot - r * 0.8, r * 1.4);
    glowFoot.addColorStop(0, `rgba(${Math.min(255, lr + 60)},${Math.min(255, lg + 60)},${Math.min(255, lb + 60)},0.5)`);
    glowFoot.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = glowFoot; g.fillRect(cx - r, foot - r * 2.4, w, r * 2.4);
    // its surface: the meniscus, a little lighter
    g.fillStyle = `rgba(${Math.min(255, lr + 50)},${Math.min(255, lg + 50)},${Math.min(255, lb + 50)},0.75)`;
    g.beginPath(); g.ellipse(cx, level, r, 2.6 * u, 0, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  // the glass's edges and its shine
  body(); g.strokeStyle = "rgba(225,238,245,0.55)"; g.lineWidth = 1 * u; g.stroke();
  g.fillStyle = "rgba(255,255,255,0.55)"; g.fillRect(cx - r + 3.6 * u, top + 14 * u, 2 * u, h * 0.72);
  g.fillStyle = "rgba(255,255,255,0.2)"; g.fillRect(cx + r - 6 * u, top + 20 * u, 1.2 * u, h * 0.6);
  // the lip
  g.fillStyle = "rgba(220,235,242,0.6)"; g.beginPath(); g.ellipse(cx, top + 4 * u, r + 2 * u, 3.4 * u, 0, 0, Math.PI * 2); g.fill();
  // the cork, for the two that are full
  if (tube.liquid) {
    const cork = g.createLinearGradient(cx - r, 0, cx + r, 0);
    cork.addColorStop(0, "#6a4a26"); cork.addColorStop(0.5, "#b08654"); cork.addColorStop(1, "#5a3c1c");
    g.fillStyle = cork;
    g.beginPath(); g.moveTo(cx - r - 1 * u, top - 16 * u); g.lineTo(cx + r + 1 * u, top - 16 * u); g.lineTo(cx + r - 2 * u, top + 10 * u); g.lineTo(cx - r + 2 * u, top + 10 * u); g.closePath(); g.fill();
    const rnd = lcg(91 + tube.i);
    for (let k = 0; k < 30; k++) { g.fillStyle = "rgba(40,24,10,0.5)"; g.fillRect(cx - r + rnd() * w, top - 14 * u + rnd() * 22 * u, 1 * u, 1 * u); }
    g.fillStyle = "rgba(255,230,190,0.25)"; g.beginPath(); g.ellipse(cx, top - 16 * u, r + 1 * u, 3 * u, 0, 0, Math.PI * 2); g.fill();
  }
  return c;
}
