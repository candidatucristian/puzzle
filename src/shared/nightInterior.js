import { makeCanvas, lcg, polygon, soft } from './paint.js';

// Materials are evaluated in surface coordinates. The floor grain therefore
// recedes with the boards instead of sitting on top as screen-space noise.
const mix = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);
const hash = (x, y) => {
  let n = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
};
export function materialNoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = smooth(x - ix), fy = smooth(y - iy);
  return mix(mix(hash(ix, iy), hash(ix + 1, iy), fx), mix(hash(ix, iy + 1), hash(ix + 1, iy + 1), fx), fy);
}
const fbm = (x, y) => materialNoise(x, y) * 0.58 + materialNoise(x * 2.13 + 31, y * 2.13) * 0.28 + materialNoise(x * 4.41, y * 4.41 + 17) * 0.14;

function floorMaterial(x, y, W, H, horizon, bright) {
  const vanishingY = horizon - H * 0.14, depth = H * 0.24 / Math.max(1, y - vanishingY);
  const wx = (x / W - 0.5) * 8 * depth, wz = depth * 4.5;
  const board = Math.floor((wx + 20) / 0.38), across = ((wx + 20) / 0.38) % 1;
  const stagger = hash(board, 42) * 2.4;
  const along = ((wz + stagger) % 2.4) / 2.4;
  const edge = Math.min(across, 1 - across), joint = Math.min(along, 1 - along);
  const bend = materialNoise(wx * 4, wz * 0.6) * 1.8;
  const rings = Math.sin(wx * 340 + bend * 12 + Math.sin(wz * 2.6 + board) * 2);
  const grain = materialNoise(wx * 240, wz * 8) * 0.38 + rings * 0.08 + fbm(wx * 9, wz * 1.1) * 0.30;
  const variation = 0.73 + hash(board, Math.floor((wz + stagger) / 2.4)) * 0.34;
  const bevel = Math.min(1, edge * 85) * Math.min(1, joint * 180);
  const wear = 0.84 + grain * 0.52;
  const knots = Math.max(0, Math.sin(wx * 17 + fbm(wx * 3, wz) * 3) - 0.8) * Math.pow(materialNoise(board * 4, wz * 5), 6);
  const pool = Math.exp(-(((x / W - 0.50) / 0.43) ** 2) - ((y / H - 0.65) / 0.5) ** 2);
  const strength = bright ? 1.7 : 0.26 + pool * 0.15;
  const material = variation * wear * (0.3 + 0.7 * bevel) * (1 - knots * 1.8);
  const specular = bright ? Math.pow(Math.max(0, materialNoise(wx * 36, wz * 3) - 0.45), 2) * 28 : 0;
  return [
    (bright ? 91 : 64) * material * strength + specular,
    (bright ? 106 : 57) * material * strength + specular * 1.1,
    (bright ? 128 : 54) * material * strength + specular * 1.35,
  ];
}

export function paintInteriorSurface(ctx, W, H, horizon, { bright = false } = {}) {
  const res = Math.min(1.25, 1250 / W);
  const cv = makeCanvas(W * res, H * res), out = cv.getContext('2d');
  const pixels = out.createImageData(cv.width, cv.height), d = pixels.data;
  for (let py = 0; py < cv.height; py++) {
    const y = py / res;
    for (let px = 0; px < cv.width; px++) {
      const x = px / res, i = (py * cv.width + px) * 4;
      let color;
      if (y >= horizon) color = floorMaterial(x, y, W, H, horizon, bright);
      else {
        const cloud = fbm(x / 90, y / 110), plaster = materialNoise(x * 0.9, y * 0.9);
        const damp = Math.pow(materialNoise(x / 130 + 81, y / 60), 3);
        const moon = Math.exp(-(((x / W - 0.5) / 0.38) ** 2) - ((y / horizon - 0.67) / 0.85) ** 2);
        const relief = 0.6 + cloud * 0.45 + plaster * 0.08 - damp * 0.27;
        color = [(18 + moon * 15) * relief, (20 + moon * 21) * relief, (25 + moon * 27) * relief];
      }
      // A soft optical falloff leaves the centre clear and lets the corners
      // of the room disappear, instead of drawing black outlines around props.
      const edge = Math.min(1, 1.08 - Math.pow(Math.abs(x / W - 0.5) * 1.7, 2) * 0.47);
      const fine = hash(px, py) * 1.6;
      d[i] = color[0] * edge + fine; d[i + 1] = color[1] * edge + fine; d[i + 2] = color[2] * edge + fine;
      d[i + 3] = 255;
    }
  }
  out.putImageData(pixels, 0, 0); ctx.drawImage(cv, 0, 0, W, H);
}

function strokeLine(ctx, a, b, color, width = 1) {
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke();
}

export function paintPanelling(ctx, W, H, floor) {
  const top = floor * 0.60, bottom = floor - H * 0.016;
  ctx.fillStyle = 'rgba(11,12,15,0.43)'; ctx.fillRect(0, top, W, bottom - top);
  for (let x = -W * 0.04; x < W; x += W * 0.15) {
    const ww = W * 0.13, hh = bottom - top - H * 0.035;
    const g = ctx.createLinearGradient(x, 0, x + ww, 0);
    g.addColorStop(0, '#0d1117'); g.addColorStop(0.6, '#1b1c20'); g.addColorStop(1, '#10141a');
    ctx.fillStyle = g; ctx.fillRect(x, top + H * 0.014, ww, hh);
    ctx.strokeStyle = 'rgba(122,111,93,0.13)'; ctx.lineWidth = 1;
    ctx.strokeRect(x + 2, top + H * 0.014, ww - 4, hh);
    ctx.strokeStyle = '#090d12'; ctx.lineWidth = Math.max(2, W * 0.003);
    ctx.strokeRect(x + W * 0.011, top + H * 0.029, ww - W * 0.023, hh - H * 0.031);
    strokeLine(ctx, [x + W * 0.013, top + H * 0.030], [x + ww - W * 0.013, top + H * 0.030], 'rgba(128,129,121,0.13)', 0.8);
  }
  for (const [dy, color, width] of [[-4,'#080c11',5],[-6,'#4a4640',1],[0,'#15181e',4],[3,'#777268',0.7]]) {
    strokeLine(ctx, [0, top + dy], [W, top + dy], color, width);
  }
  const base = ctx.createLinearGradient(0, bottom, 0, floor + 5);
  base.addColorStop(0, '#373a3d'); base.addColorStop(0.15, '#0b1016'); base.addColorStop(1, '#080b0f');
  ctx.fillStyle = base; ctx.fillRect(0, bottom, W, floor + 5 - bottom);
  // The side walls recede into the front wall, with a real corner and crown.
  for (const side of [0, 1]) {
    const a = side ? W : 0, b = side ? W * 0.94 : W * 0.06;
    const g = ctx.createLinearGradient(a, 0, b, 0);
    g.addColorStop(0, 'rgba(1,4,8,0.74)'); g.addColorStop(1, 'rgba(1,4,8,0)');
    ctx.fillStyle = g; polygon(ctx, [[a,0],[b,H * 0.035],[b,floor],[a,H * 0.75]]); ctx.fill();
    strokeLine(ctx, [b,H * 0.035], [b,floor], 'rgba(102,109,118,0.09)', 0.75);
  }
  for (let i = 0; i < 4; i++) strokeLine(ctx, [0,H * 0.018 + i * 2], [W,H * 0.018 + i * 2], i % 2 ? '#2a2b2c' : '#080c11', 1.5);
}

export function paintWallpaper(ctx, W, H, floor) {
  ctx.save();
  const step = Math.max(23, Math.min(W, H) * 0.055);
  for (let row = 0, y = H * 0.03; y < floor * 0.61; row++, y += step) {
    for (let x = -step + (row % 2) * step * 0.5; x < W; x += step) {
      const moon = Math.exp(-((x / W - 0.5) / 0.42) ** 2);
      ctx.strokeStyle = `rgba(134,130,111,${moon * 0.062})`; ctx.lineWidth = 0.6;
      const r = step * 0.17;
      ctx.beginPath();
      ctx.moveTo(x, y - r * 1.3); ctx.bezierCurveTo(x - r * 0.6,y - r * 0.6,x - r,y + r * 0.1,x,y + r * 1.3);
      ctx.bezierCurveTo(x + r,y + r * 0.1,x + r * 0.6,y - r * 0.6,x,y - r * 1.3); ctx.stroke();
      for (const sign of [-1,1]) {
        ctx.beginPath(); ctx.moveTo(x,y + r); ctx.bezierCurveTo(x + sign * r * 1.7,y + r,x + sign * r * 1.9,y - r * 0.8,x + sign * r * 0.55,y - r * 0.3); ctx.stroke();
      }
    }
  }
  // Hairline cracks and lifted paper. Their strokes are deliberately sparse.
  const rnd = lcg(41852);
  for (let i = 0; i < 24; i++) {
    let x = rnd() * W, y = rnd() * floor * 0.6;
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let k = 0; k < 7; k++) { x += (rnd() - 0.4) * 11; y += rnd() * 14; ctx.lineTo(x, y); }
    ctx.strokeStyle = 'rgba(4,7,10,0.65)'; ctx.lineWidth = 0.65; ctx.stroke();
    ctx.strokeStyle = 'rgba(176,165,140,0.075)'; ctx.translate(0.6,0); ctx.stroke(); ctx.translate(-0.6,0);
  }
  ctx.restore();
}

export function archPath(ctx, b, grow = 0) {
  const x = b.x - grow, y = b.y - grow, w = b.w + grow * 2, h = b.h + grow * 2;
  ctx.beginPath(); ctx.moveTo(x,y + h); ctx.lineTo(x,y + h * 0.28);
  ctx.bezierCurveTo(x,y + h * 0.13,x + w * 0.29,y + h * 0.03,x + w / 2,y);
  ctx.bezierCurveTo(x + w * 0.71,y + h * 0.03,x + w,y + h * 0.13,x + w,y + h * 0.28);
  ctx.lineTo(x + w,y + h); ctx.closePath();
}

function moonDisc(ctx, x, y, r) {
  const size = Math.ceil(r * 2.1), cv = makeCanvas(size, size), c = cv.getContext('2d');
  const image = c.createImageData(size, size), d = image.data, rnd = lcg(72019);
  const craters = Array.from({ length: 35 }, () => ({ x: (rnd() - 0.5) * 1.5, y: (rnd() - 0.5) * 1.5, r: 0.012 + rnd() * 0.06 }));
  for (let yy = 0; yy < size; yy++) for (let xx = 0; xx < size; xx++) {
    const nx = (xx - size / 2) / (r * 0.97), ny = (yy - size / 2) / (r * 0.97), rr = nx * nx + ny * ny;
    if (rr > 1) continue;
    const nz = Math.sqrt(1 - rr), albedo = fbm(nx * 5 + 73, ny * 5 + 69);
    let tone = 0.74 + albedo * 0.27 - Math.max(0, 0.54 - fbm(nx * 2.9 + 8,ny * 2.9 + 41)) * 0.57;
    for (const crater of craters) {
      const dist = Math.hypot(nx - crater.x,ny - crater.y) / crater.r;
      if (dist < 1.4) tone += Math.exp(-((dist - 1) * 6) ** 2) * 0.05 - Math.exp(-(dist * 1.7) ** 2) * 0.08;
    }
    const lit = 0.79 + nz * 0.16 - nx * 0.055 - ny * 0.025;
    const i = (yy * size + xx) * 4;
    d[i] = 250 * tone * lit; d[i + 1] = 247 * tone * lit; d[i + 2] = 231 * tone * lit; d[i + 3] = Math.min(1,(1 - rr) * 90) * 255;
  }
  c.putImageData(image,0,0);
  soft(ctx,x,y,r * 4,r * 4,'163,191,236',0.12,'screen');
  soft(ctx,x,y,r * 1.7,r * 1.7,'209,225,249',0.19,'screen');
  ctx.drawImage(cv,x - size / 2,y - size / 2);
}

export function paintOrnateWindow(ctx, b, { fog = false, rectangular = false } = {}) {
  const { x,y,w,h } = b, u = Math.min(w,h);
  const path = (grow = 0) => {
    if (rectangular) { ctx.beginPath(); ctx.rect(x - grow,y - grow,w + grow * 2,h + grow * 2); }
    else archPath(ctx,b,grow);
  };
  // A deep stone/wood reveal with five independently lit mouldings.
  soft(ctx,x + w / 2,y + h * 0.5,w * 0.95,h * 0.9,'110,143,182',0.13,'screen');
  for (const [grow,width,color] of [[u * 0.075,u * 0.055,'#101317'],[u * 0.073,1,'#77766a'],
    [u * 0.045,u * 0.036,'#34332e'],[u * 0.042,1,'#9a9380'],[u * 0.027,u * 0.024,'#111720'],[u * 0.014,1.6,'#596473']]) {
    path(grow); ctx.lineWidth = width; ctx.strokeStyle = color; ctx.stroke();
  }
  ctx.save(); path(); ctx.clip();
  const sky = ctx.createLinearGradient(0,y,0,y + h);
  sky.addColorStop(0,'#111c31'); sky.addColorStop(0.65,'#263c57'); sky.addColorStop(1,'#506075');
  ctx.fillStyle = sky; ctx.fillRect(x,y,w,h);
  const rnd = lcg(31690);
  for (let i = 0; i < 95; i++) {
    ctx.fillStyle = `rgba(209,222,239,${rnd() * 0.5})`;
    ctx.fillRect(x + rnd() * w,y + rnd() * h,0.55 + rnd() * 0.6,0.55 + rnd() * 0.6);
  }
  moonDisc(ctx,x + w * 0.57,y + h * 0.30,Math.min(w * 0.30,h * 0.26));
  for (let i = 0; i < 15; i++) {
    const yy = y + h * (0.20 + rnd() * 0.8), xx = x + rnd() * w;
    soft(ctx,xx,yy,w * (0.2 + rnd() * 0.3),h * (0.008 + rnd() * 0.018),'154,174,193',0.025,'screen');
  }
  if (fog) {
    const haze = ctx.createLinearGradient(0,y,0,y + h);
    haze.addColorStop(0,'rgba(166,182,194,0.05)'); haze.addColorStop(1,'rgba(188,201,209,0.53)');
    ctx.fillStyle = haze; ctx.fillRect(x,y,w,h);
  } else {
    for (let layer = 0; layer < 3; layer++) {
      ctx.fillStyle = ['#243443','#182935','#10222c'][layer];
      ctx.beginPath(); ctx.moveTo(x,y + h);
      for (let xx = 0; xx <= 30; xx++) ctx.lineTo(x + xx / 30 * w,y + h * (0.80 + layer * 0.055) + Math.sin(xx * 0.19 + layer) * h * 0.04 + rnd() * h * 0.009);
      ctx.lineTo(x + w,y + h); ctx.fill();
    }
    for (let i = 0; i < 13; i++) {
      const xx = x + rnd() * w, yy = y + h * (0.90 + rnd() * 0.06), hh = h * (0.018 + rnd() * 0.044);
      ctx.fillStyle = '#0e1c28'; polygon(ctx,[[xx - hh * 0.12,yy],[xx,yy - hh],[xx + hh * 0.12,yy]]); ctx.fill();
    }
  }
  // Individual old glass panes: slight waviness, vertical runoff and tiny chips.
  for (let i = 0; i < 85; i++) {
    const xx = x + rnd() * w, yy = y + rnd() * h;
    strokeLine(ctx,[xx,yy],[xx + (rnd() - 0.5) * 2,yy + h * (0.015 + rnd() * 0.07)],'rgba(169,196,220,0.055)',0.6);
  }
  if (rectangular) {
    for (const t of [0.33,0.67]) {
      ctx.fillStyle = '#101822'; ctx.fillRect(x + w * t,y,w * 0.012,h);
      strokeLine(ctx,[x + w * t + w * 0.012,y],[x + w * t + w * 0.012,y + h],'#798792',0.8);
    }
  } else {
    // Tracery stays in the crown; no unexplained mullion crosses a grille hole.
    for (const t of [0.27,0.73]) {
      const cx = x + w * t;
      ctx.strokeStyle = '#17212c'; ctx.lineWidth = u * 0.014;
      ctx.beginPath(); ctx.moveTo(cx,y + h * 0.20); ctx.quadraticCurveTo(cx - w * 0.14,y + h * 0.10,x + w / 2,y - h * 0.03); ctx.stroke();
    }
  }
  ctx.restore();
  // The outer casement is carved, its fluting catching narrow silver edges.
  for (const sign of [-1,1]) {
    const xx = sign < 0 ? x - u * 0.053 : x + w + u * 0.053;
    for (let i = -2; i <= 2; i++) strokeLine(ctx,[xx + i * u * 0.008,y + h * 0.30],[xx + i * u * 0.008,y + h],i % 2 ? '#151a20' : 'rgba(137,139,129,0.34)',Math.max(0.7,u * 0.002));
    for (const yy of [y + h * 0.31,y + h * 0.89]) {
      ctx.fillStyle = '#2c302f'; ctx.fillRect(xx - u * 0.033,yy,u * 0.066,u * 0.025);
      strokeLine(ctx,[xx - u * 0.034,yy],[xx + u * 0.034,yy],'#696b60',1);
    }
  }
  const sillY = y + h, depth = u * 0.055;
  const stone = ctx.createLinearGradient(0,sillY,0,sillY + depth);
  stone.addColorStop(0,'#777c7b'); stone.addColorStop(0.15,'#38444d'); stone.addColorStop(0.38,'#202833'); stone.addColorStop(1,'#090e15');
  ctx.fillStyle = stone; polygon(ctx,[[x - u * 0.08,sillY],[x + w + u * 0.08,sillY],[x + w + u * 0.11,sillY + depth],[x - u * 0.11,sillY + depth]]); ctx.fill();
  strokeLine(ctx,[x - u * 0.08,sillY],[x + w + u * 0.08,sillY],'#b0b0a0',0.7);
}

export function paintGiltFrame(ctx, x, y, w, h, tilt = 0) {
  ctx.save(); ctx.translate(x,y); ctx.rotate(tilt);
  ctx.shadowColor = 'rgba(0,0,0,0.65)'; ctx.shadowBlur = 8; ctx.shadowOffsetX = 5; ctx.shadowOffsetY = 5;
  ctx.fillStyle = '#100f0f'; ctx.fillRect(-w / 2,0,w,h); ctx.shadowBlur = 0; ctx.shadowOffsetX = ctx.shadowOffsetY = 0;
  for (const [inset,width,color] of [[0,w * 0.045,'#353026'],[w * 0.013,0.8,'#8f8062'],[w * 0.041,w * 0.032,'#151711'],[w * 0.059,0.75,'#5d5848']]) {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.strokeRect(-w / 2 + inset,inset,w - inset * 2,h - inset * 2);
  }
  const rnd = lcg(54193);
  for (let i = 0; i < 45; i++) {
    const xx = -w / 2 + rnd() * w, yy = rnd() * h;
    if (xx > -w * 0.40 && xx < w * 0.4 && yy > h * 0.08 && yy < h * 0.9) continue;
    ctx.fillStyle = 'rgba(184,168,127,0.18)'; ctx.fillRect(xx,yy,1.5,0.7);
  }
  ctx.restore();
}

export function paintChair(ctx, x, y, scale) {
  ctx.save(); ctx.translate(x,y); ctx.scale(scale,scale);
  // Rounded joinery, a worn velvet cushion, turned front legs and curved rails.
  const wood = ctx.createLinearGradient(-40,0,45,0);
  wood.addColorStop(0,'#121517'); wood.addColorStop(0.5,'#484039'); wood.addColorStop(0.7,'#262626'); wood.addColorStop(1,'#11151b');
  ctx.strokeStyle = wood; ctx.lineCap = 'round'; ctx.lineWidth = 5;
  for (const sign of [-1,1]) {
    ctx.beginPath(); ctx.moveTo(sign * 29,43); ctx.bezierCurveTo(sign * 34,3,sign * 37,-55,sign * 30,-93); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sign * 37,28); ctx.bezierCurveTo(sign * 30,60,sign * 42,73,sign * 36,97); ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(-30,-86); ctx.bezierCurveTo(-19,-106,18,-106,30,-86); ctx.stroke();
  ctx.lineWidth = 2;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath(); ctx.moveTo(i * 10,-88 + Math.abs(i) * 3); ctx.bezierCurveTo(i * 8,-50,i * 8,-15,i * 9,12); ctx.stroke();
  }
  const cushion = ctx.createRadialGradient(-5,16,0,0,20,53);
  cushion.addColorStop(0,'#343336'); cushion.addColorStop(1,'#101720');
  ctx.fillStyle = cushion; ctx.beginPath(); ctx.ellipse(0,24,44,14,-0.12,0,Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#6c6556'; ctx.lineWidth = 0.6; ctx.stroke();
  ctx.strokeStyle = wood; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(0,31,44,10,-0.12,0,Math.PI); ctx.stroke();
  ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-32,71); ctx.lineTo(33,65); ctx.stroke();
  ctx.restore();
}

export function paintCobweb(ctx, x, y, size, direction = 1) {
  ctx.save(); ctx.translate(x,y); ctx.scale(direction,1);
  const points = Array.from({ length: 7 },(_,i) => { const a = i / 6 * Math.PI / 2; return [Math.cos(a) * size,Math.sin(a) * size]; });
  ctx.strokeStyle = 'rgba(159,182,199,0.16)'; ctx.lineWidth = 0.5;
  for (const point of points) { ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(...point); ctx.stroke(); }
  for (const fraction of [0.16,0.31,0.49,0.7,0.94]) {
    ctx.beginPath(); ctx.moveTo(points[0][0] * fraction,0);
    for (let i = 1; i < points.length; i++) ctx.quadraticCurveTo((points[i - 1][0] + points[i][0]) * fraction * 0.42,(points[i - 1][1] + points[i][1]) * fraction * 0.42,points[i][0] * fraction,points[i][1] * fraction);
    ctx.stroke();
  }
  ctx.restore();
}

export function paintNightFinish(ctx, W, H) {
  const v = ctx.createRadialGradient(W * 0.5,H * 0.44,H * 0.23,W * 0.5,H * 0.44,Math.hypot(W,H) * 0.62);
  v.addColorStop(0,'rgba(0,0,0,0)'); v.addColorStop(0.62,'rgba(1,4,9,0.06)'); v.addColorStop(1,'rgba(1,4,9,0.77)');
  ctx.fillStyle = v; ctx.fillRect(0,0,W,H);
}
