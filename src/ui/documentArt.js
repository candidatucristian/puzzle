// Separate physical materials. Letter text and envelope folds stay live.
// The paper and the wax are Blender renders (art/blender/letter_paper_seal.py,
// 2026-11-06): a sheet of cream letter paper, and red sealing wax pressed
// with the Ashcombes' key.
let pending;
let materials = null;
/** The paper and wax, if they have loaded (null until then). */
export function documentArt() { return materials; }

export function loadDocumentArt() {
  if (!pending) pending = Promise.all(['letter-paper-v3', 'red-wax-seal-v2'].map(async name => {
    const image = new Image();
    image.decoding = 'async';
    image.src = `${import.meta.env.BASE_URL}assets/images/CaseFile/${name}.webp`;
    try { await image.decode(); return image; } catch { return null; }
  })).then(([paper, wax]) => (materials = { paper, wax }));
  return pending;
}

// Crop away the sheet's outer edges when texturing a folded envelope part.
// Each part retains its own clipping, lighting and opening animation.
export function paintDocumentPaper(g, x, y, width, height, opacity = 1) {
  if (!materials?.paper) return false;
  const image = materials.paper;
  g.save();
  g.globalAlpha *= opacity;
  g.drawImage(image, 70, 65, image.width - 140, image.height - 130, x, y, width, height);
  g.restore();
  return true;
}

export function paintDocumentSeal(g, { x, y, rx, ry }) {
  if (!materials?.wax) return false;
  g.save();
  g.shadowColor = '#3c100c70'; g.shadowBlur = rx * 0.12; g.shadowOffsetY = ry * 0.08;
  g.drawImage(materials.wax, x - rx * 1.12, y - ry * 1.12, rx * 2.24, ry * 2.24);
  g.restore();
  return true;
}
