// Three hinged panels carrying matching slices of the live letter.
// The back faces are blank paper; canvas copies preserve the wax.
export function letterFolds(article, root, folded = false) {
  const box = article.getBoundingClientRect();
  const rig = document.createElement('div');
  rig.className = 'letter-folds';
  rig.setAttribute('aria-hidden', 'true');
  Object.assign(rig.style, { left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px` });
  const panels = [];
  for (let i = 0; i < 3; i++) {
    const panel = document.createElement('div');
    panel.className = `letter-fold-panel fold-${i}`;
    Object.assign(panel.style, { top: `${i * box.height / 3}px`, height: `${box.height / 3 + 0.5}px` });
    const face = document.createElement('div');
    face.className = 'letter-fold-face';
    const copy = article.cloneNode(true);
    Object.assign(copy.style, { width: `${box.width}px`, height: `${box.height}px`, position: 'absolute', left: '0', top: `${-i * box.height / 3}px`, margin: '0' });
    const sources = article.querySelectorAll('canvas');
    copy.querySelectorAll('canvas').forEach((canvas, index) => canvas.getContext('2d').drawImage(sources[index], 0, 0));
    face.append(copy);
    const back = document.createElement('div');
    back.className = 'letter-fold-back';
    panel.append(face, back);
    if (i !== 1) panel.style.transform = folded ? `rotateX(${i === 0 ? -179 : 179}deg)` : 'rotateX(0deg)';
    rig.append(panel); panels.push(panel);
  }
  root.append(rig);
  return { rig, top: panels[0], bottom: panels[2], box };
}
