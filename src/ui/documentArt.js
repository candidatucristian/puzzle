// Separate physical materials. Letter text and envelope folds stay live.
let pending;
let materials = null;
let envelopePending;
export function loadArrivalArt() {
  if (!envelopePending) envelopePending = Promise.all([loadDocumentArt(), (async () => {
    const image = new Image();
    image.decoding = 'async';
    image.src = `${import.meta.env.BASE_URL}assets/images/CaseFile/envelope-back.png`;
    try { await image.decode(); return image; } catch { return null; }
  })()]).then(([art, envelope]) => ({ ...art, envelope }));
  return envelopePending;
}
export function loadDocumentArt() {
  if (!pending) pending = Promise.all(['letter-paper-v2', 'red-wax-seal'].map(async name => {
    const image = new Image();
    image.decoding = 'async';
    image.src = `${import.meta.env.BASE_URL}assets/images/CaseFile/${name}.png`;
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
