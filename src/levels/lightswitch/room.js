import { seededRandom } from '../../shared/sketch.js';

const KEYS = ['lightswitch-room-dark', 'lightswitch-room-lit'];

// Two identical paintings under different illumination. Switching textures by
// opacity preserves the sharp Morse pulses; all expensive work happens on resize.
export function paintRoom(scene, W, H, geo) {
  releaseRoom(scene.textures);
  for (const [index, key] of KEYS.entries()) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(W); canvas.height = Math.ceil(H);
    const ctx = canvas.getContext('2d');
    ctx.scale(W / 1000, H / 800);
    drawRoom(ctx, index === 1, {
      x: geo.door.x / W * 1000, y: geo.door.y / H * 800,
      w: geo.door.w / W * 1000, h: geo.door.h / H * 800,
    }, scene.textures.get('samuel').getSourceImage());
    scene.textures.addCanvas(key, canvas);
  }
  return { dark: KEYS[0], lit: KEYS[1] };
}

export function releaseRoom(textures) {
  for (const key of KEYS) if (textures.exists(key)) textures.remove(key);
}

function drawRoom(c, lit, d, portrait) {
  const rnd = seededRandom(718);
  const floor = 576;
  const poly = (points, fill, stroke) => {
    c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
    c.closePath(); c.fillStyle = fill; c.fill();
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = 0.7; c.stroke(); }
  };
  const line = (x, y, xx, yy, color, width = 1) => {
    c.beginPath(); c.moveTo(x, y); c.lineTo(xx, yy);
    c.strokeStyle = color; c.lineWidth = width; c.stroke();
  };
  const gradient = (x, y, xx, yy, stops) => {
    const g = c.createLinearGradient(x, y, xx, yy);
    stops.forEach(([p, color]) => g.addColorStop(p, color)); return g;
  };
  const glow = (x, y, rx, ry, color) => {
    c.save(); c.translate(x, y); c.scale(rx, ry);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, color); g.addColorStop(1, 'transparent');
    c.fillStyle = g; c.fillRect(-1, -1, 2, 2); c.restore();
  };

  // Plaster back wall, ceiling and receding side wall.
  c.fillStyle = gradient(0, 0, 900, 620, [[0, lit ? '#393b36' : '#141919'],
    [.5, lit ? '#716c57' : '#20221f'], [1, lit ? '#39392f' : '#121717']]);
  c.fillRect(0, 0, 1000, 800);
  poly([[0, 0], [1000, 0], [902, 77], [0, 77]],
    gradient(0, 0, 0, 90, [[0, '#101516'], [1, lit ? '#49493d' : '#202421']]));
  poly([[902, 77], [1000, 0], [1000, 800], [902, floor]],
    gradient(900, 0, 1000, 0, [[0, lit ? '#494a3e' : '#181f1e'], [1, '#101716']]));
  line(902, 77, 902, floor, '#111816', 2);
  line(0, 77, 902, 77, lit ? '#9a9178' : '#393a30', 2);
  line(0, 82, 902, 82, '#080f0e', 3);
  glow(535, 275, 480, 400, lit ? 'rgba(247,206,132,.32)' : 'rgba(138,132,98,.025)');

  // Fine, repeatable mineral grain, hairline wear and lower wall panels.
  for (let i = 0; i < 23000; i++) {
    const x = rnd() * 1000, y = 85 + rnd() * 490;
    c.fillStyle = rnd() > .5 ? 'rgba(230,222,192,.035)' : 'rgba(0,0,0,.065)';
    c.fillRect(x, y, .5 + rnd() * 1.3, .5 + rnd());
  }
  c.fillStyle = gradient(0, 407, 0, floor, [[0, lit ? '#393b31' : '#181e1c'], [1, '#141b18']]);
  c.fillRect(0, 414, 902, floor - 414);
  for (let x = -10; x < 900; x += 98) {
    c.strokeStyle = lit ? '#65614d' : '#2b3028'; c.lineWidth = 1;
    c.strokeRect(x + 9, 433, 78, 120);
    c.strokeStyle = '#101612'; c.strokeRect(x + 11, 435, 75, 117);
  }
  c.fillStyle = gradient(0, 405, 0, 417, [[0, '#141a16'], [.35, lit ? '#8a8064' : '#3b3e30'], [1, '#20281e']]);
  c.fillRect(0, 405, 902, 12);

  // Perspective floorboards, with grain confined to each plank.
  const projectFloor = (x, z) => [520 + (x - 520) * z, 335 + (floor - 335) * z];
  c.fillStyle = '#191a15'; c.fillRect(0, floor, 1000, 800 - floor);
  for (let row = 0; row < 8; row++) {
    const z0 = 1 + row * .16, z1 = z0 + .16;
    for (let col = -8; col < 16; col++) {
      const x = col * 90 + (row % 2) * 45;
      const pts = [projectFloor(x, z0), projectFloor(x + 90, z0), projectFloor(x + 90, z1), projectFloor(x, z1)];
      const v = Math.floor(rnd() * 12);
      poly(pts, lit ? `rgb(${55 + v},${46 + v},${32 + v})` : `rgb(${24 + v},${25 + v},${21 + v})`, '#0c100c');
      c.save(); c.clip();
      for (let j = 0; j < 6; j++) {
        const a = projectFloor(x + rnd() * 90, z0), b = projectFloor(x + rnd() * 90, z1);
        line(...a, ...b, 'rgba(167,142,93,.08)', .6);
      }
      c.restore();
    }
  }
  c.fillStyle = gradient(0, 558, 0, 581, [[0, '#101712'], [.22, lit ? '#81755a' : '#41422f'], [.4, '#303426'], [1, '#090e0b']]);
  c.fillRect(0, 558, 902, 23);
  poly([[902, 558], [1000, 766], [1000, 800], [902, 581]], '#182017');

  // A real hallway through the opening: return walls, a distant door,
  // a ceiling fixture, and a continuous pool of light on the parquet.
  c.save(); c.beginPath(); c.rect(d.x, d.y, d.w, d.h); c.clip();
  c.fillStyle = gradient(d.x, 0, d.x + d.w, 0, [[0, '#494335'], [.45, '#b4a27a'], [1, '#6f6a50']]);
  c.fillRect(d.x, d.y, d.w, d.h);
  const bx = d.x + d.w * .3, by = d.y + d.h * .14, bw = d.w * .53, bh = d.h * .7;
  poly([[d.x, d.y], [bx, by], [bx, by + bh], [d.x, floor]], '#615e49');
  poly([[d.x + d.w, d.y], [bx + bw, by], [bx + bw, by + bh], [d.x + d.w, floor]], '#8b8060');
  poly([[d.x, floor], [bx, by + bh], [bx + bw, by + bh], [d.x + d.w, floor]], '#756748');
  c.fillStyle = '#3c4032'; c.fillRect(bx + bw * .3, by + bh * .26, bw * .42, bh * .74);
  c.strokeStyle = '#c1b18c'; c.lineWidth = 3; c.strokeRect(bx + bw * .3, by + bh * .26, bw * .42, bh * .74);
  line(bx + bw * .35, by + bh * .35, bx + bw * .35, by + bh * .91, '#676750');
  glow(bx + bw / 2, by + 18, 95, 125, 'rgba(255,223,155,.45)');
  c.fillStyle = '#eee0b5'; c.fillRect(bx + bw * .32, by + 8, bw * .35, 5);
  c.restore();
  c.save();
  poly([[d.x + 3, floor], [d.x + d.w - 3, floor], [d.x + d.w * 2.8, 800], [d.x - d.w * .6, 800]], '#0000');
  c.clip();
  c.fillStyle = gradient(0, floor, 0, 800, [[0, 'rgba(238,204,129,.29)'], [1, 'rgba(208,164,90,.025)']]);
  c.fillRect(0, floor, 1000, 224); c.restore();
  // Layered timber casing and a recessed threshold.
  for (let i = 9; i >= 0; i--) {
    c.strokeStyle = i > 6 ? '#111a14' : i > 3 ? (lit ? '#74664b' : '#4e4d38') : '#272c20';
    c.lineWidth = 2; c.strokeRect(d.x - i, d.y - i, d.w + i * 2, d.h + i);
  }
  line(d.x, floor, d.x + d.w, floor, '#b0a07a', 2);

  // Furniture shares one camera and is built from solid cuboids in room units.
  const P = (x, y, z) => [520 + x * 540 / z, 335 + (145 - y) * 540 / z];
  const box = (x, y, z, w, h, depth, colors) => {
    const a = P(x, y, z), b = P(x + w, y, z), cc = P(x + w, y + h, z), dd = P(x, y + h, z);
    const e = P(x, y + h, z + depth), f = P(x + w, y + h, z + depth), q = P(x + w, y, z + depth);
    poly([b, q, f, cc], colors[1], '#171a13');
    poly([a, b, cc, dd], colors[0], '#171a13');
    poly([dd, cc, f, e], colors[2], '#66593f');
  };
  const wood = lit ? ['#574733', '#342f22', '#8a7250'] : ['#25291f', '#192219', '#3d3c2a'];
  glow(580, 645, 205, 42, 'rgba(0,0,0,.65)');
  glow(820, 635, 85, 27, 'rgba(0,0,0,.65)');
  // Console table, apron, tapered-looking legs and drawer.
  for (const z of [310, 270]) for (const x of [-20, 93]) box(x, 0, z, 5, 73, 5, wood);
  box(-24, 62, 267, 128, 14, 6, wood);
  box(-28, 76, 262, 138, 4, 57, wood);
  box(-9, 65, 265, 94, 8, 1, wood);
  const knob = P(38, 69, 263); glow(...knob, 5, 4, 'rgba(0,0,0,.8)');
  c.fillStyle = lit ? '#baa071' : '#71694b'; c.beginPath(); c.ellipse(...knob, 2.5, 1.6, 0, 0, Math.PI * 2); c.fill();
  for (let i = 0; i < 16; i++) {
    const y = 76.5 + rnd() * 2.7;
    line(...P(-24, y, 261), ...P(106, y, 261), 'rgba(188,151,96,.10)', .5);
  }
  // A closed book and an unmarked folded paper, atmosphere rather than clues.
  box(-12, 80, 279, 27, 3, 22, ['#393b2b', '#20281e', '#66644b']);
  box(-10, 81, 278, 25, 1.2, 21, ['#a89b78', '#7d775d', '#989070']);
  poly([P(40, 80.2, 274), P(67, 80.2, 277), P(64, 80.2, 300), P(39, 80.2, 297)], lit ? '#b0a386' : '#555747');
  // Chair to the right, with rear posts, rails and a padded seat.
  for (const z of [303, 275]) for (const x of [143, 177]) box(x, 0, z, 3.5, z === 303 ? 95 : 44, 4, wood);
  box(142, 43, 271, 41, 4, 38, wood);
  box(144, 47, 273, 37, 3, 33, ['#343a2c', '#252f24', '#515543']);
  box(144, 82, 302, 35, 12, 3, wood);
  box(144, 62, 302, 35, 5, 3, wood);

  // The identity clue is painted ONLY in the illuminated version.
  const px = 690, py = 270, pw = 112, ph = 152;
  glow(px + 8, py + 8, 84, 105, 'rgba(0,0,0,.35)');
  c.fillStyle = '#141c17'; c.fillRect(px - pw / 2 - 10, py - ph / 2 - 10, pw + 20, ph + 20);
  c.fillStyle = gradient(px - 65, py - 80, px + 65, py + 80, [[0, lit ? '#95815b' : '#3c4030'], [.3, '#363a29'], [.6, lit ? '#695c3e' : '#292e23'], [1, '#151e17']]);
  c.fillRect(px - pw / 2 - 7, py - ph / 2 - 7, pw + 14, ph + 14);
  c.fillStyle = '#131914'; c.fillRect(px - pw / 2, py - ph / 2, pw, ph);
  if (lit && portrait?.width) {
    const ratio = Math.max(pw / portrait.width, ph / portrait.height);
    const sw = pw / ratio, sh = ph / ratio;
    c.save(); c.globalAlpha = .78;
    c.drawImage(portrait, (portrait.width - sw) / 2, (portrait.height - sh) / 2, sw, sh, px - pw / 2, py - ph / 2, pw, ph);
    c.fillStyle = 'rgba(83,65,32,.25)'; c.fillRect(px - pw / 2, py - ph / 2, pw, ph); c.restore();
  }
  c.strokeStyle = '#151910'; c.lineWidth = 4; c.strokeRect(px - pw / 2, py - ph / 2, pw, ph);

  // Broad falloff and contact darkness replace hard, stacked light rings.
  if (!lit) {
    c.fillStyle = 'rgba(2,6,7,.23)'; c.fillRect(0, 0, 1000, 800);
  } else glow(540, 340, 360, 350, 'rgba(245,209,144,.055)');
  const vignette = c.createRadialGradient(490, 370, 160, 490, 370, 670);
  vignette.addColorStop(0, 'transparent'); vignette.addColorStop(1, 'rgba(0,5,7,.8)');
  c.fillStyle = vignette; c.fillRect(0, 0, 1000, 800);
}
