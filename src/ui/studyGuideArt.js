import { roomRenderAsset } from '../levels/house/roomRender.js';
import { layoutStudy } from '../levels/study/study.js';
import nativeTree from '../levels/binarytree/nativeTree.json';
import { paintInteractionSparkle } from '../shared/movableSparkles.js';
import { guideBetween as between, lookInto } from './guide.js';
import { en } from '../locales/en.js';

// The study's introduction, drawn from the room's own render and the
// puzzle's, one unbroken film on one picture: the glass case on its table
// glinting — plainly, more than it does in the game, so that it is seen for
// what it is — the pointer clicking it, the eye going to it and on into it
// until the puzzle's own picture of the case takes its place at the top of
// the window, the game's own answer row coming up under it; then, on that
// same picture, an answer
// typed in and sent. The room is cut to the window's own shape, so it fills
// the window edge to edge; whatever is not picture is the card's own dark.

export const STUDY_GUIDE_SIZE = Object.freeze({ width: 480, height: 560 });
const BASE = import.meta.env.BASE_URL;
const CARD = '#0f1110';
const PICTURE = 0.74; // of the window's height the puzzle takes in the second step, the answer row under it
const roomAsset = roomRenderAsset('Study');
const treeAsset = {
  key: `binarytree_native_cycles_v${nativeTree.version}`,
  url: `assets/images/BinaryTree/old-tree-native-v${nativeTree.version}.webp`,
};
export const studyGuidePoster = BASE + roomAsset.url;
const mix = (a, b, k) => a + (b - a) * k;

async function image(game, asset) {
  if (game.textures?.exists(asset.key)) return game.textures.get(asset.key).getSourceImage();
  const picture = new Image();
  picture.decoding = 'async';
  await new Promise((resolve, reject) => {
    picture.onload = resolve;
    picture.onerror = () => reject(new Error('Study introduction image unavailable.'));
    picture.src = BASE + asset.url;
  });
  return picture;
}

/** The part of a picture, `aspect` wide for its height, that holds `area`
 *  with its middle and no more than it must beyond, within the picture. */
function cover(area, aspect, width, height) {
  let w = Math.max(area.width, area.height * aspect), h = w / aspect;
  if (h < area.height) { h = area.height; w = h * aspect; }
  if (w > width) { w = width; h = w / aspect; }
  if (h > height) { h = height; w = h * aspect; }
  const cx = area.x + area.width / 2, cy = area.y + area.height / 2;
  return { x: Math.min(width - w, Math.max(0, cx - w / 2)), y: Math.min(height - h, Math.max(0, cy - h / 2)), width: w, height: h };
}

export async function createStudyGuideArt(game, canvas, scene) {
  const [room, puzzle] = await Promise.all([image(game, roomAsset), image(game, treeAsset)]);
  const context = canvas.getContext('2d');
  if (!context) return null;
  const W = canvas.width, H = canvas.height;
  const layout = layoutStudy(1880, 1000);
  const specimen = layout.things.find(thing => thing.level === 'binarytree').box;
  // the room, cut to the window's shape about the case
  const crop = cover({ x: specimen.x - specimen.width * 0.5, y: specimen.y - specimen.height * 0.75, width: specimen.width * 2, height: specimen.height * 2.3 }, W / H, layout.W, layout.H);
  const scale = W / crop.width;
  const focus = {
    x: (specimen.x - crop.x) * scale, y: (specimen.y - crop.y) * scale,
    width: specimen.width * scale, height: specimen.height * scale,
  };
  const camera = {
    width: W, height: H, zoom: 1, scrollX: 0, scrollY: 0,
    setZoom(value) { this.zoom = value; }, setScroll(x, y) { this.scrollX = x; this.scrollY = y; },
  };
  // the puzzle's picture: what it keeps clear of its edges (its safe bounds),
  // with its own surroundings out to the part of the window over the answer row
  const safe = nativeTree.safeBounds, margin = { x: safe.x - safe.width * 0.06, y: safe.y - safe.height * 0.06, width: safe.width * 1.12, height: safe.height * 1.12 };
  const upper = cover(margin, W / (H * PICTURE), puzzle.width, puzzle.height);
  // where the puzzle sits: the top of the window, the answer row under it
  const placed = { x: 0, y: 0, width: W, height: Math.round(H * PICTURE) };

  // A demonstration of the same answer controls, kept out of the game's form.
  const panel = document.createElement('div');
  panel.className = 'study-guide-input-panel';
  panel.setAttribute('aria-hidden', 'true');
  panel.hidden = true;
  panel.style.top = `${PICTURE * 100}%`;
  panel.innerHTML = `<span class="study-guide-example"></span><div class="input-wrapper">
    <input class="study-guide-code" type="text" readonly tabindex="-1" autocomplete="off" spellcheck="false">
    <button class="study-guide-submit" type="button" tabindex="-1"><span></span><span aria-hidden="true">→</span></button>
  </div>`;
  scene.append(panel);
  const field = panel.querySelector('input'), submit = panel.querySelector('button');
  let letterCache = [], lastLocale = null;
  function localize(i18n) {
    const language = i18n?.language ?? 'en';
    if (language === lastLocale) return;
    lastLocale = language;
    const say = key => i18n?.t(key) ?? key.split('.').reduce((value, part) => value?.[part], en);
    panel.querySelector('.study-guide-example').textContent = say('studyGuide.example');
    field.placeholder = say('input.placeholder');
    submit.querySelector('span').textContent = say('common.submit');
    const sample = say('studyGuide.sample');
    letterCache = Array.from(sample);
  }

  const sparkle = {
    lineStyle(width, colour, alpha) {
      context.lineWidth = width;
      context.strokeStyle = `rgba(${colour >> 16 & 255},${colour >> 8 & 255},${colour & 255},${alpha})`;
    },
    lineBetween(x1, y1, x2, y2) {
      context.beginPath(); context.moveTo(x1, y1); context.lineTo(x2, y2); context.stroke();
    },
  };
  function puzzlePicture(part, rect, alpha = 1) {
    if (alpha <= 0) return;
    context.save();
    context.globalAlpha = alpha;
    context.drawImage(puzzle, part.x, part.y, part.width, part.height, rect.x, rect.y, rect.width, rect.height);
    context.restore();
  }
  // the eye going to the case, then on into it: the case grows to the size
  // the puzzle's picture shows it at and rises to where that picture sits,
  // so that the one dissolves into the other with nothing jumping
  const nearAt = (t, still) => (still ? 0 : between(t, 1.35, 2.35));
  const pushAt = (t, still) => (still ? 0 : between(t, 2.0, 2.9));
  const centre = [focus.x + focus.width / 2, focus.y + focus.height / 2];
  const PUSH = Math.max(1, 0.92 * W / (focus.width * 1.9));
  function view(t, still) {
    const near = nearAt(t, still), push = pushAt(t, still);
    lookInto(camera, centre, near, 1.9);
    if (!push) return near;
    const zoom = camera.zoom * mix(1, PUSH, push);
    const sx = (centre[0] - W / 2 - camera.scrollX) * camera.zoom + W / 2;
    const sy = mix((centre[1] - H / 2 - camera.scrollY) * camera.zoom + H / 2, placed.y + placed.height / 2, push);
    camera.setZoom(zoom);
    camera.setScroll(centre[0] - W / 2 - (sx - W / 2) / zoom, centre[1] - H / 2 - (sy - H / 2) / zoom);
    return near;
  }
  function roomPicture(t, still, alpha = 1) {
    if (alpha <= 0) return;
    const near = view(t, still);
    context.save();
    context.globalAlpha = alpha;
    context.translate(W / 2, H / 2);
    context.scale(camera.zoom, camera.zoom);
    context.translate(-W / 2 - camera.scrollX, -H / 2 - camera.scrollY);
    const sx = room.width / layout.W, sy = room.height / layout.H;
    context.drawImage(room, crop.x * sx, crop.y * sy, crop.width * sx, crop.height * sy, 0, 0, W, H);
    // the glints: the game's own, only larger and more of them, so that the
    // case is seen to glint at a glance; they settle as the eye comes to it
    const anchors = [
      [focus.x - 3, focus.y + focus.height * .22],
      [focus.x + focus.width + 3, focus.y + focus.height * .42],
      [focus.x + focus.width * .72, focus.y - 3],
      [focus.x + focus.width * .3, focus.y + focus.height + 2],
    ];
    const calm = 1 - near * 0.7;
    context.globalCompositeOperation = 'lighter';
    context.shadowColor = 'rgba(255, 225, 164, .55)';
    context.shadowBlur = 12;
    anchors.forEach(([x, y], index) => {
      const alpha = (still ? .9 : .55 + .45 * (.5 + .5 * Math.sin(t * 3.1 + index * 1.9))) * calm;
      paintInteractionSparkle(sparkle, x, y, 5.5 + alpha * 4, alpha);
    });
    if (!still) {
      for (let index = 0; index < 7; index++) {
        const life = (t * .8 + index * .143) % 1;
        const alpha = Math.sin(life * Math.PI) ** 2 * .95 * calm;
        const x = focus.x + focus.width * (.1 + index * .13) + Math.sin(life * Math.PI + index) * 4;
        const y = focus.y + focus.height * (.25 + (index % 3) * .2) - life * 12;
        paintInteractionSparkle(sparkle, x, y, 3 + alpha * 2.4, alpha);
      }
    }
    context.restore();
  }
  function pointerInput(t, still) {
    const fieldBox = field.getBoundingClientRect(), submitBox = submit.getBoundingClientRect(), parentBox = scene.getBoundingClientRect();
    const centre = box => [(box.left - parentBox.left + box.width / 2) * W / parentBox.width,
      (box.top - parentBox.top + box.height / 2) * H / parentBox.height];
    const inputAt = parentBox.width ? centre(fieldBox) : [W * .35, H * .8];
    const submitAt = parentBox.width ? centre(submitBox) : [W * .78, H * .8];
    if (still) return submitAt;
    const arrive = between(t, .15, .9), onward = between(t, 3.2, 3.85);
    return [
      mix(mix(W * .87, inputAt[0], arrive), submitAt[0], onward),
      mix(mix(H * .9, inputAt[1], arrive), submitAt[1], onward),
    ];
  }
  return {
    localize,
    draw({ step, t, still }) {
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.fillStyle = CARD; context.fillRect(0, 0, W, H);
      if (step === 0) {
        // the case glints; the pointer clicks it; the eye goes to it and on
        // into it, the puzzle dissolving in, already in its place, over the
        // room as it goes to dark, and the answer row coming up under it —
        // the very frame the second step goes on with
        roomPicture(t, still, still ? 1 : 1 - between(t, 2.5, 2.95));
        if (!still) puzzlePicture(upper, placed, between(t, 2.2, 2.8));
        panel.hidden = still || t < 2.6;
        panel.style.opacity = String(between(t, 2.6, 3.1));
        field.value = '';
        field.dataset.typing = 'false';
        field.dataset.sent = 'false';
        submit.dataset.pressed = 'false';
        return {
          pressAt: 1.2,
          target: [focus.x + focus.width * .58, focus.y + focus.height * .42],
          pointerOpacity: still ? 1 : 1 - between(t, 1.45, 1.8),
        };
      }
      // the same picture: the answer typed, and sent
      panel.hidden = false;
      panel.style.opacity = '1';
      puzzlePicture(upper, placed);
      const count = still ? letterCache.length : Math.min(letterCache.length, Math.max(0, Math.floor((t - 1.15) / .12) + 1));
      field.value = letterCache.slice(0, count).join('');
      field.dataset.typing = String(still || t >= 1 && t < 4);
      submit.dataset.pressed = String(!still && t >= 4 && t < 4.18);
      // sent: the field takes the light a moment
      field.dataset.sent = String(!still && t >= 4.08 && t < 4.9);
      return {
        pressAt: 4, pointer: pointerInput(t, still),
        pointerOpacity: still ? 1 : Math.min(between(t, 0, .35), 1 - between(t, 4.75, 5.1)),
        opacity: still ? 1 : 1 - between(t, 4.75, 5.1),
      };
    },
    dispose() { panel.remove(); },
  };
}
