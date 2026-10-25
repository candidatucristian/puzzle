import { Scope } from '../shared/Scope.js';
import { renderLetter } from './letterPage.js';
import FILM from './letterFilm.json';

// A letter found in the house, opened on the desk. A film (art/blender/
// letter_film.py): from straight above an old walnut desk in lamplight, the
// envelope lies on the leather; the flap lifts, the wax breaking across; the
// letter, folded in three, is drawn out of it, laid down and opened out. Its
// words are then laid over the paper in the film's last frame, coming up as
// if typed there. Filed, the film runs backward: the letter folds up and goes
// back into its envelope, and the desk goes dark. The film plays the moves;
// here are only fades.
const BASE = import.meta.env.BASE_URL;
export const letterArt = name => `${BASE}assets/images/CaseFile/letter/${name}.webp`;
const still = name => `${BASE}assets/images/CaseFile/letter/${name}`;
const filmOf = name => `${BASE}assets/video/${name}`;
const W = FILM.width, H = FILM.height;

// where the paper lies in the last frame, and the envelope in the first, in the film's pixels
const corners = list => list.map(([x, y]) => [x * W, y * H]);
const PAPER = (() => {
  const [tl, tr, , bl] = corners(FILM.paper), all = corners(FILM.paper);
  return {
    cx: all.reduce((s, p) => s + p[0], 0) / 4, cy: all.reduce((s, p) => s + p[1], 0) / 4,
    w: Math.hypot(tr[0] - tl[0], tr[1] - tl[1]), h: Math.hypot(bl[0] - tl[0], bl[1] - tl[1]),
    angle: Math.atan2(tr[1] - tl[1], tr[0] - tl[0]) * 180 / Math.PI,
  };
})();
const ENVELOPE = (() => {
  const all = corners(FILM.envelope), xs = all.map(p => p[0]), ys = all.map(p => p[1]);
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
})();

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  node.className = className;
  if (text) node.textContent = text;
  return node;
};
const image = (src, className) => {
  const node = el('img', className);
  node.alt = ''; node.draggable = false; node.src = src;
  return node;
};
const video = (className) => {
  const node = el('video', className);
  node.muted = true; node.playsInline = true; node.preload = 'auto';
  node.disablePictureInPicture = true; node.setAttribute('aria-hidden', 'true');
  return node;
};
// The films, loading ahead of time while a letter waits in the side panel —
// the very ones then played, so what has come in is there to play.
let prepared = null;
export function prepareLetterFilm() {
  if (prepared) return;
  prepared = { opening: video('film-frame film-open'), folding: video('film-frame film-fold') };
  prepared.opening.src = filmOf(FILM.open.src); prepared.folding.src = filmOf(FILM.fold.src);
  prepared.opening.load(); prepared.folding.load();
}
const films = () => {
  const ready_ = prepared ?? { opening: video('film-frame film-open'), folding: video('film-frame film-fold') };
  prepared = null;
  return ready_;
};

// there to be shown: decoded, or loaded enough to play — or given up on
const decoded = (node, ms = 4000) => Promise.race([
  node.decode().then(() => true, () => false), new Promise(done => setTimeout(() => done(false), ms))]);
const playable = (node, ms = 6000) => new Promise(done => {
  if (node.readyState >= 3) { done(true); return; }
  const ok = () => { off(); done(true); }, bad = () => { off(); done(false); };
  const timer = setTimeout(bad, ms);
  const off = () => { clearTimeout(timer); node.removeEventListener('canplay', ok); node.removeEventListener('error', bad); };
  node.addEventListener('canplay', ok); node.addEventListener('error', bad);
});

/** Plays it over the page. `origin`: the envelope waiting in the side panel
 *  that was clicked — it goes into the desk, and the letter is opened at
 *  once; without one the desk comes up with the envelope on it, waiting to be
 *  opened. `target`: where it is filed. Resolves "read" once filed, "later"
 *  if put away unopened. */
export function playArrival(scope, { letter, sounds, target, origin = null, reducedMotion = false, i18n = null }) {
  if (scope.closed) return Promise.resolve('later');
  const still_ = reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const text = (key, fallback) => (i18n ? i18n.t(key) : fallback);
  return new Promise(resolve => {
    const life = new Scope(), moves = new Set();
    const previousFocus = document.activeElement;
    const waiting = origin?.closest('.waiting-letter') ?? null;

    // ── the room it is shown in ──
    const root = el('div', 'arrival');
    root.tabIndex = -1;
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', `${text('casefile.letterFound', 'A letter found')}: ${letter.title}`);
    const veil = el('div', 'arrival-veil');
    const stage = el('div', 'arrival-stage');
    Object.assign(stage.style, { width: `${W}px`, height: `${H}px` });
    const first = image(still(FILM.stills.first), 'film-frame film-first');
    const last = image(still(FILM.stills.last), 'film-frame film-last');
    const { opening, folding } = films();
    const env = el('button', 'env');
    env.type = 'button';
    env.setAttribute('aria-label', text('casefile.openLetter', 'Open the letter'));
    Object.assign(env.style, { left: `${ENVELOPE.x}px`, top: `${ENVELOPE.y}px`, width: `${ENVELOPE.w}px`, height: `${ENVELOPE.h}px` });
    stage.append(first, opening, last, folding, env);
    const caption = el('div', 'arrival-caption');
    caption.append(el('p', 'arrival-eyebrow', text('casefile.letterFound', 'A letter found')), el('p', 'arrival-title', letter.title));
    const hint = el('p', 'arrival-hint', text('casefile.openLetter', 'Open the letter'));
    // the words, laid on the paper
    const sheet = el('div', 'letter-sheet');
    const page = el('div', 'arrival-page');
    page.tabIndex = 0; page.setAttribute('aria-label', letter.title);
    sheet.append(page);
    const file = el('button', 'arrival-file', text('casefile.fileLetter', 'File it in the case file'));
    file.type = 'button'; file.disabled = true;
    root.append(veil, stage, caption, hint, sheet, file);
    document.body.append(root);

    let state = '', typist = null, plain = false;
    const stateTo = value => { state = value; root.dataset.state = value; };
    const alive = () => !life.closed;
    const move = (node, frames, options) => {
      if (still_ || !alive()) { Object.assign(node.style, frames[frames.length - 1]); return Promise.resolve(); }
      const animation = node.animate(frames, { fill: 'forwards', ...options });
      moves.add(animation);
      return animation.finished.then(() => {}, () => {});
    };
    const show = (node, ms = 300) => move(node, [{ opacity: 0 }, { opacity: 1 }], { duration: ms, easing: 'ease-out' });
    const hide = (node, ms = 300) => move(node, [{ opacity: getComputedStyle(node).opacity }, { opacity: 0 }], { duration: ms, easing: 'ease-in' });
    const pause = ms => new Promise(done => life.later(done, still_ ? 0 : ms));
    const finish = how => {
      if (!alive()) return;
      stateTo('gone');
      typist?.stop(); typist = null;
      for (const animation of moves) animation.cancel();
      for (const film of [opening, folding]) { film.pause(); film.removeAttribute('src'); film.load(); }
      life.dispose(); root.remove();
      waiting?.classList.remove('is-in-flight');
      scope.cleanups.delete(parentCleanup);
      const focus = how === 'read' && target?.isConnected ? target : previousFocus?.isConnected ? previousFocus : target;
      focus?.focus?.({ preventScroll: true });
      resolve(how);
    };
    const parentCleanup = scope.add(() => finish('later'));

    // ── the film laid over the screen: its full height shown, centred; the
    // words on its paper in screen pixels, large enough to read ──
    let scale = 1;
    const fit = () => {
      scale = innerHeight / H;
      const x = (innerWidth - W * scale) / 2;
      stage.style.transform = `translate(${x}px, 0px) scale(${scale})`;
      const w = PAPER.w * scale, h = PAPER.h * scale;
      Object.assign(sheet.style, {
        left: `${x + PAPER.cx * scale - w / 2}px`, top: `${PAPER.cy * scale - h / 2}px`,
        width: `${w}px`, height: `${h}px`, transform: `rotate(${PAPER.angle}deg)`,
        fontSize: `${Math.max(13, Math.min(18, w / 34))}px`,
      });
    };
    fit();
    life.on(window, 'resize', fit);

    // ── its sounds, at the film's moments ──
    const cueing = (film, cues, voices) => {
      const pending = Object.entries(cues).sort((a, b) => a[1] - b[1]);
      let watching = null;
      const look = () => {
        watching = null;
        if (!alive()) return;
        while (pending.length && film.currentTime >= pending[0][1]) voices[pending.shift()[0]]?.();
        if (pending.length && !film.ended) watching = requestAnimationFrame(look);
      };
      watching = requestAnimationFrame(look);
      life.add(() => watching !== null && cancelAnimationFrame(watching));
    };
    const play = film => new Promise(done => {
      const ended = () => done(true), failed = () => done(false);
      film.addEventListener('ended', ended, { once: true });
      film.addEventListener('error', failed, { once: true });
      // (shown only once it is playing: it opens on the frame under it, so nothing flickers)
      film.addEventListener('playing', () => { film.style.opacity = '1'; }, { once: true });
      film.currentTime = 0;
      film.play()?.catch(failed);
      // a film that never gets going does not keep the letter waiting
      life.later(() => done(false), (film === opening ? FILM.open.duration : FILM.fold.duration) * 1000 + 4000);
    });

    // ── it comes ──
    const arrive = async () => {
      stateTo('arriving');
      const shown = [show(veil, 420), show(stage, 520),
        move(caption, [{ opacity: 0, transform: 'translateY(-10px)' }, { opacity: 1, transform: 'none' }], { duration: 640, delay: 200, easing: 'cubic-bezier(.16,1,.3,1)' })];
      // from the side panel: the envelope there goes down onto the desk
      if (origin?.isConnected && !still_) {
        const from = origin.getBoundingClientRect(), stageBox = stage.getBoundingClientRect();
        const to = { w: ENVELOPE.w * scale / FILM.icon[0], h: ENVELOPE.h * scale / FILM.icon[1] };
        to.x = stageBox.left + (ENVELOPE.x + ENVELOPE.w / 2) * scale - to.w / 2;
        to.y = stageBox.top + (ENVELOPE.y + ENVELOPE.h / 2) * scale - to.h / 2;
        const flier = image(letterArt('envelope-sealed'), 'arrival-flier');
        Object.assign(flier.style, { left: `${to.x}px`, top: `${to.y}px`, width: `${to.w}px`, height: `${to.h}px` });
        root.append(flier);
        waiting?.classList.add('is-in-flight');
        sounds?.whoosh?.();
        const dx = from.left + from.width / 2 - (to.x + to.w / 2), dy = from.top + from.height / 2 - (to.y + to.h / 2);
        shown.push(move(flier, [{ transform: `translate(${dx}px, ${dy}px) scale(${from.width / to.w})`, opacity: 1 },
          { transform: 'none', opacity: 1, offset: 0.82 }, { transform: 'none', opacity: 0 }], { duration: 900, easing: 'cubic-bezier(.16,1,.3,1)' })
          .then(() => flier.remove()));
      }
      await Promise.all(shown);
      if (!alive()) return;
      if (origin) { await pause(240); if (alive()) void open(); return; }
      stateTo('waiting');
      show(hint, 420);
      env.focus({ preventScroll: true });
    };

    // ── it is opened ──
    const open = async () => {
      if (!alive() || (state !== 'waiting' && state !== 'arriving')) return;
      stateTo('opening');
      env.disabled = true;
      root.focus({ preventScroll: true });
      if (getComputedStyle(hint).opacity !== '0') hide(hint, 200);
      if (!still_) {
        cueing(opening, FILM.open.cues, {
          crack: () => sounds?.crack?.(), open: () => sounds?.open?.(),
          // (the title goes as the letter comes out, before the letter is lifted up under it)
          slide: () => { sounds?.page?.(true); hide(caption, 600); },
          unfold: () => sounds?.unfold?.(), unfold2: () => sounds?.unfold?.(),
        });
        const played = await play(opening);
        if (!alive()) return;
        if (!played) last.style.opacity = '1';
      } else {
        last.style.opacity = '1';
      }
      caption.style.opacity = '0';
      read();
    };

    // ── the words come up on the paper, and it is there to be read ──
    const read = () => {
      stateTo('reading');
      env.hidden = true;
      const article = renderLetter(page, letter, plain ? { seal: false } : { paper: false, seal: false });
      sheet.style.opacity = '1';
      if (!still_) {
        article.classList.add('is-writing');
        typist = sounds?.typing?.() ?? null;
        life.later(() => article.classList.remove('is-writing'), 2100);
      }
      file.disabled = false;
      show(file, 360);
      page.focus({ preventScroll: true });
    };

    // ── filed: folded up again into its envelope, and the desk goes dark ──
    const fileIt = async () => {
      if (!alive() || state !== 'reading') return;
      stateTo('filing');
      file.disabled = true;
      root.focus({ preventScroll: true });
      typist?.stop(); typist = null;
      hide(file, 220);
      await hide(sheet, 280);
      if (!alive()) return;
      if (!still_ && !plain && opening.ended) {
        cueing(folding, FILM.fold.cues, { fold: () => sounds?.unfold?.(), fold2: () => sounds?.unfold?.(), slide: () => sounds?.page?.(true) });
        await play(folding);
        if (!alive()) return;
      }
      sounds?.file?.();
      await Promise.all([hide(stage, 460), hide(veil, 520)]);
      finish('read');
    };

    // ── put away unopened ──
    const putAway = async () => {
      if (!alive() || (state !== 'waiting' && state !== 'arriving')) return;
      stateTo('filing');
      await Promise.all([hide(stage, 380), hide(caption, 240), hide(hint, 200), hide(veil, 460)]);
      finish('later');
    };

    life.on(env, 'click', () => void open());
    life.on(file, 'click', () => void fileIt());
    life.on(root, 'keydown', event => {
      event.stopPropagation();
      if (event.key === 'Escape') {
        event.preventDefault();
        if (state === 'reading') void fileIt();
        else if (state === 'waiting' || state === 'arriving') void putAway();
        // (in the middle of the film: on to its end, the letter open)
        else if (state === 'opening' && opening.duration) opening.currentTime = opening.duration;
      } else if (event.key === 'Tab') {
        event.preventDefault();
        if (state === 'reading') (document.activeElement === page ? file : page).focus({ preventScroll: true });
        else if (state === 'waiting') env.focus({ preventScroll: true });
      }
    });

    // ready: its first frame drawn and (unless motion is reduced) its films loaded
    stateTo('preparing');
    root.focus({ preventScroll: true });
    void (async () => {
      if (!still_ && !opening.getAttribute('src')) { opening.src = filmOf(FILM.open.src); folding.src = filmOf(FILM.fold.src); }
      const [hasFirst, hasLast, hasFilm] = await Promise.all([decoded(first), decoded(last), still_ ? Promise.resolve(true) : playable(opening)]);
      if (!alive()) return;
      // (nothing of the desk to be had: the letter on its own paper, there to be read)
      if (!hasFirst || !hasLast || !hasFilm) {
        plain = true;
        root.classList.add('is-plain');
        stage.hidden = true; hint.hidden = true; caption.style.opacity = '1';
        await show(veil, 260);
        if (alive()) read();
        return;
      }
      await arrive();
    })();
  });
}
