import { KINETIC_FORMS, polygonVertices } from './puzzle.js';
import { makeCanvas, addCanvasTexture, releaseTextures, lcg, polygon } from '../../shared/paint.js';

const PALETTES = [
  ['#94848b', '#6e5869', '#34283d'],
  ['#a19385', '#716171', '#382d43'],
  ['#8c959d', '#5d6979', '#293443'],
  ['#a68a96', '#795a72', '#3d2a42'],
];

/** Small painted wooden toys, with bevelled edges and grain in the face. */
export function paintMobileAssets(textures, scaleRef) {
  const keys = {}, displaySizes = {};
  KINETIC_FORMS.forEach((form, index) => {
    const r = form.radius * scaleRef, density = 2, pad = 1.25;
    const canvas = makeCanvas(r * pad * 2 * density, r * pad * 2 * density);
    const ctx = canvas.getContext('2d');
    ctx.scale(density, density);
    ctx.translate(canvas.width / density / 2, canvas.height / density / 2);
    const shape = () => {
      if (form.sides) polygon(ctx, polygonVertices(form.sides, r));
      else { ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); }
    };
    const colors = PALETTES[index];
    // The thin, dark cut edge remains visible when the toy yaws.
    ctx.save(); ctx.translate(-Math.max(1, r * 0.08), Math.max(1, r * 0.07));
    shape(); ctx.fillStyle = '#241c2d'; ctx.fill(); ctx.restore();
    shape();
    const face = ctx.createLinearGradient(r, -r, -r, r);
    face.addColorStop(0, colors[0]); face.addColorStop(0.4, colors[1]); face.addColorStop(1, colors[2]);
    ctx.fillStyle = face; ctx.fill();
    ctx.save(); ctx.clip();
    const rnd = lcg(290 + index);
    for (let i = 0; i < 60; i++) {
      const y = (rnd() * 2 - 1) * r;
      ctx.strokeStyle = 'rgba(197,172,200,' + (0.025 + rnd() * 0.065) + ')'; ctx.lineWidth = 0.45;
      ctx.beginPath(); ctx.moveTo(-r, y); ctx.bezierCurveTo(-r * 0.3, y - r * 0.04, r * 0.4, y + r * 0.04, r, y); ctx.stroke();
    }
    ctx.restore();
    shape();
    const edge = ctx.createLinearGradient(r, -r, -r, r);
    edge.addColorStop(0, '#c6b8cf'); edge.addColorStop(0.5, '#8b7895'); edge.addColorStop(1, '#4a3a56');
    ctx.strokeStyle = edge; ctx.lineWidth = Math.max(0.8, r * 0.035); ctx.stroke();
    ctx.fillStyle = '#18121f'; ctx.beginPath(); ctx.arc(0, -r * 0.85, Math.max(0.75, r * 0.052), 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(187,166,196,.55)'; ctx.lineWidth = 0.65; ctx.stroke();
    addCanvasTexture(textures, form.id, canvas);
    keys[form.kind] = form.id;
    displaySizes[form.kind] = { width: canvas.width / density, height: canvas.height / density };
  });
  return { keys, displaySizes };
}

export function releaseMobileArt(textures) { releaseTextures(textures, KINETIC_FORMS.map(form => form.id)); }
