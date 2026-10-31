import { grain, vignette, makeCanvas, addCanvasTexture } from "../../shared/paint.js";
import { MOLECULES } from "./puzzle.js";
import { drawMoleculeSketch } from "./sketch.js";
import DESK from "./notebookDesk.json";

/** Silas's laboratory notebook, open on his desk under the lamp: an old
 *  green cloth binding, the block of pages thick at either side, the paper
 *  aged and faintly squared. On each page one molecule, drawn in ink — the
 *  atoms as graphite outlines and single bonds, hidden edges dashed —
 *  and under it a few words of his; nothing names it. The page's number at
 *  its foot.
 *
 *  Painted once per screen size: the desk with the book's cover and page
 *  block on it; each of the four pages, apart, to be turned (shared/
 *  pageFlip.js turns them); the shading the pages take where they curve
 *  into the spine. */

export const BOOK = { desk: "mo_desk", light: "mo_light", flip: "mo_flip" };
export const NOTEBOOK_DESK = `mo_notebook_desk_v${DESK.version}`;
export const NOTEBOOK_DESK_URL = `assets/images/Molecules/notebook-desk-v${DESK.version}.webp`;
const R = 2; // the pages are painted at twice their size, for crisp ink
const HAND = '"Cormorant Garamond", Georgia, "Times New Roman", serif'; // his hand: an old book's italic

// The notebook's own measure, in the picture of it the Blender render was laid
// out to (art/blender/notebook_desk.py: 1536 x 1024 px, 40 px a centimetre):
// the spine, where the leaves are sewn; how far a leaf can reach from it, and
// from how high to how low; the box his pages were laid out in; and the top
// sheet on each side (notebookDesk.json).
const NOTEBOOK = {
  spine: 768, top: 54, leaf: 652, height: 872,
  box: { left: 82, right: 770, top: 67, w: 684, h: 850 },
  sheet: [DESK.sheets.left, DESK.sheets.right],
};

/** The book's own picture, cut out of the render of the desk it lies on. */
export function notebookPicture(desk) {
  const c = makeCanvas(DESK.book.w, DESK.book.h);
  c.getContext("2d").drawImage(desk, -DESK.book.x, -DESK.book.y);
  return c;
}

// ── where everything is ─────────────────────────────────────────────────────

// The book as it lies once it has been brought `near` times nearer than it
// is first seen — as far as the screen still holds all of it. `zoom` is how
// much nearer that came to; `view`, the desk as far as it is seen before.
export function layoutBook(W, H, near = 1) {
  const u = Math.min(W / 1000, H / 650);
  const first = Math.min(W * 0.8, H * 1.32);
  const bw = Math.max(first, Math.min(first * near, W, H * 1.5)), bh = bw / 1.5;
  const zoom = bw / first;
  const cx = W / 2, cy = Math.min(Math.max(H * 0.52, bh / 2), H - bh / 2);
  const k = bw / 1536; // screen pixels to the photograph's
  return {
    W, H, u, cx, cy, zoom,
    view: { x: (W - W * zoom) / 2, y: (H - H * zoom) / 2, w: W * zoom, h: H * zoom },
    book: { x: cx - bw / 2, y: cy - bh / 2, w: bw, h: bh },
    pw: NOTEBOOK.leaf * k, ph: NOTEBOOK.height * k,
    top: cy - bh / 2 + NOTEBOOK.top * k, spine: cx - bw / 2 + NOTEBOOK.spine * k,
  };
}

// ── painting ────────────────────────────────────────────────────────────────

// the desk is a texture; the pages and the spine's shading are canvases,
// handed to the page turner, which draws them
export function paintBook(textures, L, photo, desk) {
  addCanvasTexture(textures, BOOK.desk, paintDesk(L, desk));
  addCanvasTexture(textures, BOOK.light, paintLight(L));
  return { shade: paintShade(L), faces: MOLECULES.map((m, i) => paintPage(L, m, i, photo)) };
}

export function releaseBook(textures) {
  for (const key of Object.values(BOOK)) if (textures.exists(key)) textures.remove(key);
}

// the desk under the lamp, as Blender rendered it — walnut, the notebook open
// on it, an inkwell, a flask on its cork ring, a pencil, his spectacles — laid
// so that the book in it lies where the book is (painted as far as the desk is
// seen while the book is still further off, in the screen's own coordinates)
function paintDesk(L, desk) {
  const { book: b, view: v } = L;
  const c = makeCanvas(Math.ceil(v.w), Math.ceil(v.h));
  const g = c.getContext("2d");
  g.translate(-v.x, -v.y);
  g.fillStyle = "#0c0704"; g.fillRect(v.x, v.y, v.w, v.h);
  const k = b.w / DESK.book.w;
  g.imageSmoothingQuality = "high";
  g.drawImage(desk, b.x - DESK.book.x * k, b.y - DESK.book.y * k, DESK.width * k, DESK.height * k);
  return c;
}

// the falling-off of the light toward the edges, and the grain of the
// picture, laid over everything — the pages, and a leaf as it turns, as much
// as the desk — so nothing lifted from the book is lit apart from it
function paintLight(L) {
  const c = makeCanvas(Math.ceil(L.view.w), Math.ceil(L.view.h)), g = c.getContext("2d");
  vignette(g, c.width, c.height, 0.45, "source-over");
  grain(g, c.width, c.height, 0.012);
  return c;
}

// the shading of the open pages: dark into the spine where they curve down,
// a soft rise either side, the outer edges a little in shadow
function paintShade(L) {
  const { pw, ph } = L;
  const w = Math.round(pw * 2), h = Math.round(ph);
  const c = makeCanvas(w, h);
  const g = c.getContext("2d");
  const s = g.createLinearGradient(0, 0, w, 0);
  s.addColorStop(0, "rgba(0,0,0,0.22)");
  s.addColorStop(0.08, "rgba(0,0,0,0)");
  s.addColorStop(0.36, "rgba(255,250,235,0.05)");
  s.addColorStop(0.46, "rgba(0,0,0,0.12)");
  s.addColorStop(0.5, "rgba(0,0,0,0.42)");
  s.addColorStop(0.54, "rgba(0,0,0,0.12)");
  s.addColorStop(0.64, "rgba(255,250,235,0.05)");
  s.addColorStop(0.92, "rgba(0,0,0,0)");
  s.addColorStop(1, "rgba(0,0,0,0.25)");
  g.fillStyle = s; g.fillRect(0, 0, w, h);
  // on the two top sheets only, not the edges of the pages under them
  const N = NOTEBOOK, k = w / (N.leaf * 2), x0 = N.spine - N.leaf;
  g.globalCompositeOperation = "destination-in";
  g.beginPath();
  for (const sheet of N.sheet) {
    sheet.forEach(([x, y], i) => (i ? g.lineTo((x - x0) * k, (y - N.top) * k) : g.moveTo((x - x0) * k, (y - N.top) * k)));
    g.closePath();
  }
  g.fillStyle = "#000"; g.fill();
  return c;
}

// one page: aged paper, faintly squared; the molecule in ink; its formula in
// his hand; his few words; the page's number at its outer foot. Painted as a
// leaf is turned: the whole reach of a leaf from the spine, out of the
// photograph, cut to the top sheet's own shape — so a leaf lifted is one
// sheet, and the edges of the pages under it stay where they are.
function paintPage(L, m, index, photo) {
  const lw = Math.round(L.pw * R), lh = Math.round(L.ph * R);
  const c = makeCanvas(lw, lh);
  const g = c.getContext("2d");
  const right = index % 2 === 1, N = NOTEBOOK;
  const k = lw / N.leaf, x0 = right ? N.spine : N.spine - N.leaf;
  // the real page surface, from the open-book photograph: the fine grid,
  // foxing, soft paper curl and worn edges remain beneath the live art
  g.imageSmoothingQuality = "high";
  g.drawImage(photo, x0, N.top, N.leaf, N.height, 0, 0, lw, lh);
  // what he put on it, laid out in the page's box as he laid it out
  const pw = N.box.w * k, ph = N.box.h * k;
  g.save();
  g.translate(((right ? N.box.right : N.box.left) - x0) * k, (N.box.top - N.top) * k);
  drawPageHeading(g, pw, ph, index);
  const caption=drawMoleculeSketch(g,m,pw*.5,ph*.37,pw*.24);
  g.fillStyle="rgba(53,43,31,.65)";g.textAlign="center";
  g.font=`italic 500 ${Math.round(ph*.027)}px ${HAND}`;
  g.fillText(caption,pw*.5,ph*.55);
  drawNotes(g,m.notes,pw,ph);
  g.restore();
  // the page's number, at the outer foot, a little in from the sheet's edge
  g.font = `400 ${Math.round(ph * 0.036)}px Georgia, "Times New Roman", serif`;
  g.fillStyle = "rgba(42,31,20,0.6)";
  g.textAlign = right ? "right" : "left";
  g.fillText(String(index + 1), ((right ? 1384 : 172) - x0) * k, (879 - N.top) * k);
  g.textAlign = "left";
  // everything outside the top sheet cleared
  g.save();
  g.globalCompositeOperation = "destination-in";
  g.beginPath();
  N.sheet[right ? 1 : 0].forEach(([x, y], i) => (i ? g.lineTo((x - x0) * k, (y - N.top) * k) : g.moveTo((x - x0) * k, (y - N.top) * k)));
  g.closePath();
  g.fillStyle = "#000"; g.fill();
  g.restore();
  return c;
}

function drawPageHeading(g, pw, ph, index) {
  g.fillStyle="rgba(54,44,32,.68)";
  g.font=`500 ${Math.round(ph*.024)}px Georgia, serif`;
  g.textAlign="left";g.textBaseline="alphabetic";
  g.fillText("LABORATORY NOTES",pw*.15,ph*.13);
  g.textAlign="right";
  g.fillText(["I","II","III","IV"][index],pw*.85,ph*.13);
  g.strokeStyle="rgba(70,51,30,.25)";g.lineWidth=Math.max(1,ph*.001);
  g.beginPath();g.moveTo(pw*.15,ph*.16);g.lineTo(pw*.85,ph*.16);g.stroke();
}

function drawNotes(g, notes, pw, ph) {
  const x=pw*.15,maxWidth=pw*.7;
  const fontSize=Math.max(20,ph*.028),lineHeight=fontSize*1.28;
  g.textAlign="left";g.textBaseline="alphabetic";
  g.fillStyle="rgba(48,39,29,.83)";
  g.font=`italic 500 ${Math.round(ph*.035)}px ${HAND}`;
  g.fillText("Observations",x,ph*.62);
  g.font=`500 ${fontSize}px ${HAND}`;
  let y=ph*.675;
  for(const text of notes) {
    const words=text.split(/\s+/),lines=[];let line="";
    for(const word of words) {
      const next=line?line+" "+word:word;
      if(line&&g.measureText(next).width>maxWidth-fontSize*.9){lines.push(line);line=word;}else line=next;
    }
    if(line)lines.push(line);
    g.fillStyle="rgba(48,39,29,.7)";g.fillText("–",x,y);
    g.fillStyle="rgba(48,39,29,.92)";
    for(const part of lines){g.fillText(part,x+fontSize*.9,y);y+=lineHeight;}
    y+=fontSize*.34;
  }
}
