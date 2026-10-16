import { Scope } from '../shared/Scope.js';
import { paintSeal } from '../shared/envelope.js';
import { renderLetter } from './letterPage.js';
import { loadArrivalArt, paintDocumentSeal } from './documentArt.js';
import { paintEnvelopePart, fractureWax } from './arrivalEnvelope.js';
import { letterFolds } from './letterFolds.js';

// A physical envelope, attached pieces of wax and a letter with two hinges.
// Text and filing use the same case-file documents.
export async function playArrival(scope, { letter, sounds, target, reducedMotion = false }) {
  const art = await loadArrivalArt();
  if (scope.closed) return 'later';
  const still = reducedMotion;
  return new Promise(resolve => {
    const life = new Scope(), animations = new Set();
    const previousFocus = document.activeElement;
    const W = Math.round(Math.min(560, innerWidth * .7, innerHeight * .52 * 1.65));
    const H = Math.round(W / 1.65), TIP = Math.round(H * .7);
    const dpr = Math.min(2, devicePixelRatio || 1);
    const root = el('div', 'arrival');
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', `A letter found: ${letter.title}`); root.tabIndex = -1;
    root.dataset.material = art.envelope ? 'ready' : 'fallback';
    const caption = el('div', 'arrival-caption');
    caption.append(el('p', 'arrival-eyebrow', 'A letter found'), el('p', 'arrival-title', letter.title));
    const stage = el('div', 'arrival-stage'), rest = el('div', 'arrival-rest');
    Object.assign(rest.style, { width: `${W}px`, height: `${H}px` });
    const shadow = el('div', 'env-contact-shadow'), env = el('div', 'env');
    Object.assign(env.style, { width: `${W}px`, height: `${H}px` });
    env.tabIndex = -1; env.setAttribute('role', 'button'); env.setAttribute('aria-label', 'Break the seal');
    const inside = layer('env-inside', W, H, dpr, g => paintEnvelopePart(g, art, 'inside', W, H, TIP));
    const sheet = el('div', 'env-letter');
    Object.assign(sheet.style, { left: `${W * .06}px`, width: `${W * .88}px`, top: `${H * .08}px`, height: `${H * .72}px` });
    const pocket = layer('env-pocket', W, H, dpr, g => paintEnvelopePart(g, art, 'pocket', W, H, TIP));
    const flap = el('div', 'env-flap');
    Object.assign(flap.style, { width: `${W}px`, height: `${TIP + 2}px` });
    const flapOut = layer('env-flap-out', W, TIP + 2, dpr, g => paintEnvelopePart(g, art, 'flap-out', W, H, TIP));
    const flapIn = layer('env-flap-in', W, TIP + 2, dpr, g => {
      g.translate(0, TIP + 2); g.scale(1, -1);
      paintEnvelopePart(g, art, 'flap-in', W, H, TIP);
    });
    flap.append(flapOut, flapIn);
    const r = W * .071;
    const seal = layer('env-seal', r * 3, r * 3, dpr, g => {
      const shape = { x: r * 1.5, y: r * 1.5, rx: r, ry: r };
      if (!paintDocumentSeal(g, shape)) paintSeal(g, shape, { wax: '#a4251b', shine: true });
    });
    Object.assign(seal.style, { left: `${W / 2 - r * 1.5}px`, top: `${TIP - r * 1.6}px` });
    const hint = el('button', 'env-hint', 'Break the seal'); hint.type = 'button'; hint.disabled = true;
    env.append(inside, sheet, pocket, flap, seal); rest.append(shadow, env); stage.append(rest, hint);
    const later = el('button', 'arrival-later', 'Later'); later.type = 'button'; later.disabled = true;
    const reading = el('div', 'arrival-reading'), page = el('div', 'arrival-page');
    page.tabIndex = 0; page.setAttribute('aria-label', letter.title);
    const file = el('button', 'arrival-file', 'File it in the case file'); file.type = 'button'; file.disabled = true;
    reading.append(page, file);
    root.append(el('div', 'arrival-veil'), caption, stage, later, reading); document.body.append(root);

    let state;
    const setState = value => { state = value; root.dataset.state = value; };
    const alive = () => !life.closed;
    const wait = ms => new Promise(done => life.later(done, still ? 0 : ms));
    const animate = (node, frames, options) => {
      if (still || !alive()) { Object.assign(node.style, frames[frames.length - 1]); return null; }
      const animation = node.animate(frames, { fill: 'forwards', ...options });
      animations.add(animation); return animation;
    };
    const finished = animation => animation?.finished.catch(() => {}) ?? Promise.resolve();
    const finish = how => {
      if (!alive()) return;
      setState('gone');
      for (const animation of animations) animation.cancel();
      life.dispose(); root.remove(); scope.cleanups.delete(parentCleanup);
      (target?.isConnected ? target : previousFocus)?.focus?.({ preventScroll: true });
      resolve(how);
    };
    const parentCleanup = scope.add(() => finish('later'));

    const unfold = async from => {
      const article = renderLetter(page, letter);
      page.style.visibility = 'hidden'; reading.classList.add('is-shown');
      // Paint the canvases before making the matching panel copies.
      await new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
      if (!alive()) return;
      if (still) { page.style.visibility = 'visible'; return; }
      const folds = letterFolds(article, root, true), { rig, box } = folds;
      const area = page.getBoundingClientRect();
      const fit = Math.min(1, (area.height - 44) / box.height);
      const dx = from.left + from.width / 2 - box.left - box.width / 2;
      const dy = from.top + from.height / 2 - box.top - box.height / 2;
      const lift = area.top + area.height / 2 - box.top - box.height / 2;
      const restPose = `translate(0,${lift}px) scale(${fit})`;
      sheet.style.visibility = 'hidden';
      await finished(animate(rig, [
        { transform: `translate(${dx}px,${dy}px) scale(${from.width / box.width}) rotate(-2deg)` },
        { transform: restPose },
      ], { duration: 540, easing: 'cubic-bezier(.22,.65,.3,1)' }));
      if (!alive()) return;
      setState('unfolding'); sounds?.unfold();
      const top = animate(folds.top, [{ transform: 'rotateX(-179deg)' }, { transform: 'rotateX(-78deg)', offset: .55 }, { transform: 'rotateX(0deg)' }], { duration: 780, easing: 'cubic-bezier(.25,.55,.25,1)' });
      await wait(380);
      if (!alive()) return;
      const bottom = animate(folds.bottom, [{ transform: 'rotateX(179deg)' }, { transform: 'rotateX(65deg)', offset: .65 }, { transform: 'rotateX(0deg)' }], { duration: 740, easing: 'cubic-bezier(.25,.55,.25,1)' });
      await Promise.all([finished(top), finished(bottom)]);
      if (!alive()) return;
      await finished(animate(rig, [{ transform: restPose }, { transform: 'translate(0,0) scale(1)' }], { duration: 420, easing: 'cubic-bezier(.3,.65,.3,1)' }));
      page.style.visibility = 'visible'; rig.remove();
    };

    const open = async () => {
      if (state !== 'waiting') return;
      setState('breaking'); hint.disabled = true; later.hidden = true; env.tabIndex = -1;
      root.classList.remove('is-waiting'); root.focus({ preventScroll: true });
      await finished(animate(flap, [{ transform: 'rotateX(0deg)' }, { transform: 'rotateX(-5deg)' }, { transform: 'rotateX(-2deg)' }], { duration: 310, easing: 'ease-in-out' }));
      if (!alive()) return;
      sounds?.crack(); fractureWax(seal, flap, env, animate);
      caption.classList.add('is-away'); hint.classList.add('is-away');
      await wait(170);
      if (!alive()) return;
      setState('opening'); sounds?.open();
      animate(flapOut, [{ opacity: 1 }, { opacity: .72, offset: .5 }, { opacity: .9 }], { duration: 880 });
      await finished(animate(flap, [{ transform: 'rotateX(-2deg)' }, { transform: 'rotateX(-100deg)', offset: .62 }, { transform: 'rotateX(-168deg)' }], { duration: 880, easing: 'cubic-bezier(.3,.55,.3,1)' }));
      if (!alive()) return;
      flap.style.zIndex = '0'; setState('drawing'); sounds?.open();
      await finished(animate(sheet, [{ transform: 'translateY(0)' }, { transform: `translateY(${-H * .95}px) rotate(-1deg)` }], { duration: 700, easing: 'cubic-bezier(.3,.2,.2,1)' }));
      if (!alive()) return;
      const from = sheet.getBoundingClientRect();
      animate(env, [{ transform: resting, opacity: 1 }, { transform: 'translate(12px,90px) rotateX(8deg) rotate(2deg)', opacity: 0 }], { duration: 600, easing: 'ease-in' });
      animate(shadow, [{ opacity: .65 }, { opacity: 0 }], { duration: 600 });
      await unfold(from);
      if (!alive()) return;
      setState('reading'); file.disabled = false;
      (page.scrollHeight > page.clientHeight ? page : file).focus({ preventScroll: true });
    };

    const away = async how => {
      if (!['waiting', 'reading'].includes(state)) return;
      const wasReading = state === 'reading'; setState('filing');
      file.disabled = hint.disabled = later.disabled = true; env.tabIndex = -1;
      caption.classList.add('is-away'); hint.classList.add('is-away');
      sounds?.file();
      let node = env, from = env.getBoundingClientRect();
      if (wasReading && !still) {
        const folds = letterFolds(page.querySelector('.letter-page'), root);
        node = folds.rig; from = folds.box; page.style.visibility = 'hidden';
        const top = animate(folds.top, [{ transform: 'rotateX(0deg)' }, { transform: 'rotateX(-179deg)' }], { duration: 600, easing: 'ease-in-out' });
        const bottom = animate(folds.bottom, [{ transform: 'rotateX(0deg)' }, { transform: 'rotateX(179deg)' }], { duration: 650, delay: 110, easing: 'ease-in-out' });
        await Promise.all([finished(top), finished(bottom)]);
      } else if (wasReading) node = page;
      if (!alive()) return;
      const into = target?.getBoundingClientRect();
      if (into && from.width) {
        const dx = into.left + into.width / 2 - from.left - from.width / 2;
        const dy = into.top + into.height / 2 - from.top - from.height / 2;
        const scale = Math.max(.035, into.height / from.width);
        await finished(animate(node, [
          { transform: 'translate(0,0) scale(1)', opacity: 1 },
          { transform: `translate(${dx * .38}px,${dy * .28}px) scale(.6) rotate(-3deg)`, opacity: 1, offset: .45 },
          { transform: `translate(${dx}px,${dy}px) scale(${scale}) rotate(-2deg)`, opacity: .15 },
        ], { duration: 760, easing: 'cubic-bezier(.45,.1,.55,1)' }));
      }
      if (!alive()) return;
      node.style.visibility = 'hidden'; root.classList.remove('is-shown');
      target?.classList.add('is-receiving'); scope.later(() => target?.classList.remove('is-receiving'), 700);
      await wait(220); finish(how);
    };

    life.on(env, 'click', open); life.on(hint, 'click', open);
    life.on(later, 'click', () => away('later')); life.on(file, 'click', () => away('read'));
    life.on(window, 'keydown', event => {
      if (event.key === 'Escape' && ['waiting', 'reading'].includes(state)) { event.preventDefault(); event.stopPropagation(); away(state === 'reading' ? 'read' : 'later'); }
      else if (['Enter', ' '].includes(event.key) && event.target === env && state === 'waiting') { event.preventDefault(); event.stopPropagation(); open(); }
      else if (event.key === 'Tab') {
        const focusable = state === 'waiting' ? [env, hint, later] : state === 'reading' ? [page, file] : [root];
        const index = focusable.indexOf(document.activeElement);
        event.preventDefault(); focusable[(index + (event.shiftKey ? -1 : 1) + focusable.length) % focusable.length].focus({ preventScroll: true });
      }
    }, true);

    const resting = 'translate(0,0) rotateX(3deg) rotate(-2deg)';
    setState('arriving'); requestAnimationFrame(() => root.classList.add('is-shown'));
    sounds?.whoosh();
    animate(shadow, [{ opacity: 0, transform: 'translate(22px,30px) scale(.82)' }, { opacity: .65, transform: 'translate(0,0) scale(1)' }], { duration: 1050, easing: 'ease-out' });
    finished(animate(env, [
      { transform: 'translate(45px,110px) rotateX(22deg) rotate(-7deg)', opacity: 0 },
      { transform: 'translate(0,-3px) rotateX(2deg) rotate(-2deg)', opacity: 1, offset: .78 },
      { transform: resting, opacity: 1 },
    ], { duration: 1050, easing: 'cubic-bezier(.2,.65,.3,1)' })).then(() => {
      if (!alive() || state !== 'arriving') return;
      sounds?.land(); setState('waiting'); root.classList.add('is-waiting');
      env.tabIndex = 0; hint.disabled = later.disabled = false; env.focus({ preventScroll: true });
    });
  });
}

function el(tag, className, text) {
  const node = document.createElement(tag); node.className = className;
  if (text) node.textContent = text;
  return node;
}
function layer(className, width, height, dpr, paint) {
  const canvas = el('canvas', className);
  canvas.width = Math.ceil(width * dpr); canvas.height = Math.ceil(height * dpr);
  Object.assign(canvas.style, { width: `${width}px`, height: `${height}px` });
  canvas.setAttribute('aria-hidden', 'true');
  const g = canvas.getContext('2d'); g.scale(dpr, dpr); paint(g);
  return canvas;
}
