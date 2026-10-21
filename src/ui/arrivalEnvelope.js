import { paintDocumentPaper } from './documentArt.js';

// Sample the outside in one coordinate system so the flap fits the pocket.
export function flapPath(g, width, tip) {
  g.beginPath(); g.moveTo(0, 0); g.lineTo(width, 0);
  g.bezierCurveTo(width, tip * .17, width * .96, tip * .22, width * .91, tip * .3);
  g.lineTo(width * .54, tip * .96);
  g.quadraticCurveTo(width * .5, tip * 1.04, width * .46, tip * .96);
  g.lineTo(width * .09, tip * .3);
  g.bezierCurveTo(width * .04, tip * .22, 0, tip * .17, 0, 0);
  g.closePath();
}
function outside(g, art, width, height) {
  if (art.envelope) g.drawImage(art.envelope, 25, 34, 1537, 928, 0, 0, width, height);
  else { g.fillStyle = '#e6d8b9'; g.fillRect(0, 0, width, height); paintDocumentPaper(g, 0, 0, width, height); }
}
export function paintEnvelopePart(g, art, part, width, height, tip) {
  if (part === 'inside') {
    g.fillStyle = '#d0bd99'; g.fillRect(0, 0, width, height);
    paintDocumentPaper(g, 0, 0, width, height, .65);
    const shade = g.createLinearGradient(0, 0, 0, height * .7);
    shade.addColorStop(0, '#2c1a0e88'); shade.addColorStop(.5, '#4c352027'); shade.addColorStop(1, '#4c352000');
    g.fillStyle = shade; g.fillRect(0, 0, width, height);
    return;
  }
  g.save();
  flapPath(g, width, tip);
  if (part === 'pocket') { g.rect(0, height, width, -height); g.clip('evenodd'); }
  else g.clip();
  if (part === 'flap-in') {
    g.fillStyle = '#d5c6a6'; g.fillRect(0, 0, width, tip);
    paintDocumentPaper(g, 0, 0, width, tip, .8);
    const shade = g.createLinearGradient(0, 0, 0, tip);
    shade.addColorStop(0, '#48321c48'); shade.addColorStop(.35, '#48321c00');
    g.fillStyle = shade; g.fillRect(0, 0, width, tip);
  } else outside(g, art, width, height);
  g.restore();
}

// Cut matching pieces out of the actual seal. One stays on the flap;
// two halves remain on the pocket, moving only a few millimetres apart.
export function fractureWax(seal, flap, env, animate) {
  const polygons = [
    '0 0,100% 0,100% 44%,82% 47%,69% 42%,57% 50%,48% 43%,35% 49%,20% 45%,0 50%',
    '0 50%,20% 45%,35% 49%,48% 43%,57% 50%,51% 65%,54% 76%,46% 84%,50% 100%,0 100%',
    '57% 50%,69% 42%,82% 47%,100% 44%,100% 100%,50% 100%,46% 84%,54% 76%,51% 65%',
  ];
  polygons.forEach((polygon, i) => {
    const piece = document.createElement('canvas');
    piece.className = 'env-wax-piece'; piece.width = seal.width; piece.height = seal.height;
    piece.setAttribute('aria-hidden', 'true');
    piece.getContext('2d').drawImage(seal, 0, 0);
    Object.assign(piece.style, { width: seal.style.width, height: seal.style.height, left: seal.style.left, top: seal.style.top, clipPath: `polygon(${polygon})` });
    (i === 0 ? flap : env).append(piece);
    animate(piece, [{ transform: 'translate(0,0) rotate(0deg)' }, { transform: ['translate(0,-2px) rotate(-2deg)', 'translate(-3px,2px) rotate(-4deg)', 'translate(3px,2px) rotate(4deg)'][i] }], { duration: 160, easing: 'cubic-bezier(.2,.7,.2,1)' });
  });
  seal.style.visibility = 'hidden';
}
