import { KINETIC_FORMS, polygonVertices } from './puzzle.js';
import { makeCanvas, addCanvasTexture, releaseTextures, lcg, polygon } from '../../shared/paint.js';

// each shape its own bright paint: coral, sunflower, sea green, sky blue
const PALETTES = [
  ['#ffc0b0', '#ff7a66', '#c8402e'],
  ['#fff2b0', '#ffd23e', '#c8901a'],
  ['#b6f4e2', '#3ecbb0', '#1a8a78'],
  ['#c2e2ff', '#5aa6f4', '#2a64b8'],
];

/** Small painted wooden toys, with bevelled edges and grain in the face. */
export function paintMobileAssets(textures, scaleRef) {
  const keys = {}, displaySizes = {};
  KINETIC_FORMS.forEach((form, index) => {
    const r = form.radius * scaleRef, density = 2, pad = 1.4;
    const canvas = makeCanvas(r * pad * 2 * density, r * pad * 2 * density);
    const ctx = canvas.getContext('2d');
    ctx.scale(density, density);
    ctx.translate(canvas.width / density / 2, canvas.height / density / 2);
    const shape = () => {
      if (form.sides) polygon(ctx, polygonVertices(form.sides, r));
      else { ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); }
    };
    const colors = PALETTES[index];
    // Cut from thick board: the sawn edge shows below and to the left of the
    // face, shaded darker the further it turns away.
    const thick = Math.max(3, r * 0.26);
    for (let i = Math.ceil(thick); i >= 1; i--) {
      ctx.save(); ctx.translate(-i * 0.62, i * 0.78);
      shape();
      const k = i / thick;
      // the sawn edge takes the face's colour, deepened
      ctx.globalAlpha = 1;
      ctx.fillStyle = colors[2];
      ctx.fill();
      ctx.fillStyle = `rgba(20,8,40,${(0.25 + 0.4 * k).toFixed(2)})`;
      ctx.fill(); ctx.restore();
    }
    shape();
    const face = ctx.createLinearGradient(r, -r, -r, r);
    face.addColorStop(0, colors[0]); face.addColorStop(0.4, colors[1]); face.addColorStop(1, colors[2]);
    ctx.fillStyle = face; ctx.fill();
    ctx.save(); ctx.clip();
    const rnd = lcg(290 + index);
    for (let i = 0; i < 60; i++) {
      const y = (rnd() * 2 - 1) * r;
      ctx.strokeStyle = 'rgba(255,240,255,' + (0.03 + rnd() * 0.06) + ')'; ctx.lineWidth = 0.45;
      ctx.beginPath(); ctx.moveTo(-r, y); ctx.bezierCurveTo(-r * 0.3, y - r * 0.04, r * 0.4, y + r * 0.04, r, y); ctx.stroke();
    }
    ctx.restore();
    shape();
    const edge = ctx.createLinearGradient(r, -r, -r, r);
    edge.addColorStop(0, 'rgba(255,255,255,0.75)'); edge.addColorStop(0.5, 'rgba(255,255,255,0.1)'); edge.addColorStop(1, 'rgba(20,8,40,0.5)');
    ctx.strokeStyle = edge; ctx.lineWidth = Math.max(1, r * 0.06); ctx.stroke();
    // the paint's gloss: the moon caught on the upper right of the face
    ctx.save(); shape(); ctx.clip();
    const gloss = ctx.createRadialGradient(r * 0.42, -r * 0.46, 0, r * 0.42, -r * 0.46, r * 0.8);
    gloss.addColorStop(0, 'rgba(255,255,255,0.5)'); gloss.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gloss; ctx.fillRect(-r * 1.3, -r * 1.3, r * 2.6, r * 2.6);
    const turn = ctx.createLinearGradient(r, -r, -r, r);
    turn.addColorStop(0.6, 'rgba(30,10,60,0)'); turn.addColorStop(1, 'rgba(30,10,60,0.4)');
    ctx.fillStyle = turn; ctx.fillRect(-r * 1.3, -r * 1.3, r * 2.6, r * 2.6);
    ctx.restore();
    ctx.fillStyle = '#18121f'; ctx.beginPath(); ctx.arc(0, -r * 0.85, Math.max(0.75, r * 0.052), 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(187,166,196,.55)'; ctx.lineWidth = 0.65; ctx.stroke();
    addCanvasTexture(textures, form.id, canvas);
    keys[form.kind] = form.id;
    displaySizes[form.kind] = { width: canvas.width / density, height: canvas.height / density };
  });
  return { keys, displaySizes };
}

export function releaseMobileArt(textures) { releaseTextures(textures, KINETIC_FORMS.map(form => form.id)); }
