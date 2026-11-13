import { loadManorExterior, paintManorExterior, drawManorExteriorLive } from '../src/ui/manorExterior.js';
import { loadManorWind, createManorWind, windAt } from '../src/ui/manorWind.js';

// The manor at night behind the name, as the game's start screen shows it
// (src/ui/startManor.js, whose own modules these are): the Blender render,
// the wind in its trees and the rain drawn over it on the graphics card, and
// over that the lantern, the few lit windows and the mist. It moves only
// while it can be seen; with reduced motion asked for, it stands still.
const manor = document.querySelector('.manor');
const still = manor.querySelector('.manor-still'), live = manor.querySelector('.manor-live');
const quiet = matchMedia('(prefers-reduced-motion: reduce)');
let pictures = null, scene = null, wind = null;
let clock = 0, last = null, lean = windAt(0), frame = 0, inView = true;

const dropWind = () => { wind?.dispose(); wind = null; if (scene) scene.storm3D = false; still.style.visibility = ''; };

function layout() {
  if (!pictures) return;
  const box = manor.getBoundingClientRect();
  if (!box.width || !box.height) return;
  const ratio = Math.min(1.5, window.devicePixelRatio || 1);
  const W = Math.round(box.width * ratio), H = Math.round(box.height * ratio);
  if (scene && scene.W === W && scene.H === H) return;
  dropWind();
  for (const canvas of [still, live]) { canvas.width = W; canvas.height = H; }
  scene = paintManorExterior(still.getContext('2d', { willReadFrequently: true }), W, H, pictures.exterior);
  if (pictures.wind && !quiet.matches) {
    const behind = document.createElement('canvas');
    behind.width = W; behind.height = H;
    paintManorExterior(behind.getContext('2d'), W, H, pictures.wind.background);
    wind = createManorWind({ source: still, background: behind, mask: pictures.wind.mask, photo: scene.photo, weather: true, onFailure: dropWind });
    if (wind) {
      wind.canvas.className = 'manor-layer';
      still.after(wind.canvas);
      scene.storm3D = true;
      wind.draw(clock, lean, windAt(clock));
      still.style.visibility = 'hidden';
    }
  }
  drawManorExteriorLive(live.getContext('2d'), scene, clock, quiet.matches);
}

// its own clock, which runs only while it is seen and never leaps
function tick(time) {
  frame = requestAnimationFrame(tick);
  const dt = last === null ? 0 : Math.min(0.05, Math.max(0, (time - last) / 1000));
  last = time;
  if (!scene || quiet.matches || !inView || document.hidden) return;
  clock += dt;
  const gust = windAt(clock);
  lean += (gust - lean) * (1 - Math.exp(-dt / 0.7));
  scene.air = { gust, lean, still: false };
  drawManorExteriorLive(live.getContext('2d'), scene, clock, false);
  wind?.draw(clock, lean, gust);
}

loadManorExterior()
  .then(async (exterior) => ({ exterior, wind: await loadManorWind().catch(() => null) }))
  .then((loaded) => {
    pictures = loaded;
    layout();
    manor.classList.add('is-ready');
    frame = requestAnimationFrame(tick);
  })
  .catch(() => manor.classList.add('is-ready'));

let resizing = 0;
addEventListener('resize', () => { clearTimeout(resizing); resizing = setTimeout(layout, 150); });
quiet.addEventListener?.('change', () => { scene = null; layout(); });
new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; last = null; }).observe(manor);
addEventListener('pagehide', () => { cancelAnimationFrame(frame); dropWind(); });
// (come back to from the browser's history: put up again)
addEventListener('pageshow', (event) => { if (event.persisted) { scene = null; last = null; layout(); frame = requestAnimationFrame(tick); } });
