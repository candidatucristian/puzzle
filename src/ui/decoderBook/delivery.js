import { rewardAsset } from './diploma.js';
import { getBookCopy } from './copy.js';
import { getRewardCopy } from './rewardCopy.js';
import './delivery.css';

let stageModule;
const loadStage = () => stageModule ??= import('./flightStage3d.js');
export async function prepareRewardDelivery() {
  const module = await loadStage();
  await module.prepareEnvelopeModel();
}

/** One small, non-blocking delivery. The motion and the mesh share a RAF clock. */
export function mountRewardDelivery(scope, { target, preferences, sounds, onLand, isObscured = () => false }) {
  let cancelCurrent = null;
  const reduced = () => preferences?.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
  async function play(entry, language, origin) {
    cancelCurrent?.();
    if (scope.closed) return false;
    if (reduced()) { sounds?.land?.(); onLand(entry); return true; }
    const token = document.createElement('div'); token.className = 'decoder-delivery'; token.setAttribute('aria-hidden', 'true');
    const canvas = document.createElement('canvas'), fallback = document.createElement('img');
    canvas.className = 'dd-model'; fallback.className = 'dd-fallback'; fallback.src = rewardAsset('reward-envelope.webp'); fallback.alt = '';
    const caption = document.createElement('div'); caption.className = 'decoder-delivery-caption'; caption.setAttribute('aria-hidden', 'true');
    const eyebrow = document.createElement('span'), name = document.createElement('p');
    eyebrow.textContent = getRewardCopy(language).earned; name.textContent = `${getBookCopy(language).award} · Fibonacci`;
    caption.append(eyebrow, name); token.append(fallback, canvas);
    // Keep it offscreen until the first fully rendered physical pose is ready.
    token.style.visibility = 'hidden'; caption.style.visibility = 'hidden'; document.body.append(token, caption);
    let native = null, ended = false, raf = 0, resolvePlay;
    const completion = new Promise(resolve => { resolvePlay = resolve; });
    const finish = landed => {
      if (ended) return; ended = true; cancelAnimationFrame(raf); native?.dispose(); native = null;
      token.remove(); caption.remove(); document.removeEventListener('visibilitychange', visibility);
      if (cancelCurrent === cancel) cancelCurrent = null;
      if (landed && !scope.closed) onLand(entry);
      resolvePlay(landed);
    };
    const cancel = () => finish(false);
    const visibility = () => { if (document.hidden) finish(true); };
    cancelCurrent = cancel;
    document.addEventListener('visibilitychange', visibility);
    try {
      const module = await loadStage();
      if (!ended) native = await module.createFlightStage(canvas);
    } catch { /* The transparent Cycles still is the fallback for unavailable WebGL. */ }
    if (ended || scope.closed) { native?.dispose(); finish(false); return completion; }
    if (native) {
      try { native.render(0); fallback.hidden = true; }
      catch { native.dispose(); native = null; canvas.hidden = true; }
    } else canvas.hidden = true;
    const source = origin ?? { x: innerWidth * .56, y: innerHeight * .66 };
    const start = { x: Math.max(100, Math.min(innerWidth - 100, source.x)), y: Math.max(180, Math.min(innerHeight - 120, source.y)) };
    const begin = performance.now(), hold = 220, travel = 1120;
    let whoosh = false, filing = false;
    token.style.visibility = 'visible'; caption.style.visibility = 'visible';
    caption.style.left = `${start.x}px`; caption.style.top = `${start.y + 52}px`;
    const tick = now => {
      if (ended || scope.closed) { finish(false); return; }
      if (reduced() || isObscured()) { finish(true); return; }
      const elapsed = now - begin, p = Math.max(0, Math.min(1, (elapsed - hold) / travel));
      const rect = target.getBoundingClientRect();
      const end = rect.width && rect.height ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : { x: innerWidth - 80, y: 28 };
      const a = { x: start.x + (end.x - start.x) * .28, y: Math.max(55, start.y - 155) };
      const b = { x: end.x - 75, y: Math.max(15, end.y + 75) };
      const q = 1 - p;
      const x = q ** 3 * start.x + 3 * q * q * p * a.x + 3 * q * p * p * b.x + p ** 3 * end.x;
      const y = q ** 3 * start.y + 3 * q * q * p * a.y + 3 * q * p * p * b.y + p ** 3 * end.y;
      const scale = 1 - .84 * p * p;
      token.style.transform = `translate3d(${x - 88}px,${y - 55}px,0) scale(${scale})`;
      token.style.opacity = String(Math.min(1, elapsed / 120) * (1 - Math.max(0, (p - .90) / .10)));
      caption.style.opacity = String(Math.min(1, elapsed / 150) * Math.max(0, 1 - p * 4));
      if (native) {
        try { native.render(p); }
        catch { native.dispose(); native = null; canvas.hidden = true; fallback.hidden = false; }
      }
      if (p > 0 && !whoosh) { whoosh = true; sounds?.whoosh?.(); }
      // The file sound's contact transient is 360 ms after its paper slide.
      if (p >= .68 && !filing) { filing = true; sounds?.file?.(); }
      if (p >= 1) finish(true); else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return completion;
  }
  scope.add(() => cancelCurrent?.());
  return { play, cancel: () => cancelCurrent?.() };
}
