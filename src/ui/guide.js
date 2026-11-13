import { en } from '../locales/en.js';

// The house's two short introductions (hallGuide.js, studyGuide.js), shown
// by themselves the first time the place is reached: a card over the game
// with, on its left, the thing itself — the hall's own door I, the study's
// own glass case, drawn by the game's painters — and a sketched pointer
// showing what to do with it; on its right the words. Its two steps are one
// unbroken film on one picture: the second takes up the very frame the first
// ends on (the door left open, the puzzle left up), and only the whole comes
// up out of the dark and goes back to it, over and over, the words and the
// two marks under them keeping pace. A mark can be clicked to go to its
// step. "Got it" closes it, and it is not shown again (a reset shows it again).
//
// A definition says where it belongs, when the place is ready, its picture
// (`createArtwork`), how long each step plays (`durations`), and `draw`,
// which paints a frame and says where the pointer comes from (`from`), where
// it goes and when it presses.

const smooth = value => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };
export const guideBetween = (time, start, end) => smooth((time - start) / (end - start));
const mix = (from, to, amount) => from + (to - from) * amount;

/** The eye going in to a thing on a small picture: `k` 0 standing back, 1
 *  right up to it. Everything swells evenly about the thing, which glides
 *  to the middle of the picture as it grows — never looking past the
 *  picture's own edges (`bounds`, in the picture's pixels), where it has any. */
export function lookInto(camera, point, k, reach = 2, bounds = null) {
  const W = camera.width, H = camera.height;
  const zoom = 1 + (reach - 1) * k;
  let sx = (point[0] - W / 2) * k, sy = (point[1] - H / 2) * k;
  if (bounds) {
    const halfW = W / (2 * zoom), halfH = H / (2 * zoom);
    sx = Math.min(bounds.x + bounds.width - halfW - W / 2, Math.max(bounds.x + halfW - W / 2, sx));
    sy = Math.min(bounds.y + bounds.height - halfH - H / 2, Math.max(bounds.y + halfH - H / 2, sy));
  }
  camera.setZoom(zoom);
  camera.setScroll(sx, sy);
}

export function mountGuide(scope, { game, levels, dialogs, storage, preferences, i18n = null, isBusy = () => false }, definition) {
  const door = definition.size;
  const descriptionId = definition.id + '-description';
  const root = document.createElement('div');
  root.id = definition.id;
  root.className = 'hall-guide hidden';
  root.innerHTML = `
    <section class="hall-guide-card">
      <button class="hall-guide-close" type="button"><span aria-hidden="true">×</span></button>
      <div class="hall-guide-visual" role="img">
        <div class="hall-guide-scene">
          <img class="hall-guide-poster" alt="" decoding="async" aria-hidden="true">
          <canvas class="hall-guide-canvas" width="${door.width}" height="${door.height}" aria-hidden="true" hidden></canvas>
          <span class="hall-guide-pointer" aria-hidden="true">
            <span class="hall-guide-click"></span>
            <svg viewBox="0 0 32 40" width="30" height="38"><path d="M3 2v29l7-7 6 13 6-3-6-12h11Z" fill="#eee6d4" stroke="#151613" stroke-width="1.6" stroke-linejoin="round"/></svg>
          </span>
        </div>
      </div>
      <div class="hall-guide-copy">
        <p class="hall-guide-eyebrow"></p>
        <h2 id="${definition.id}-title"></h2>
        <div class="hall-guide-words" aria-live="polite" aria-atomic="true">
          <p class="hall-guide-line" id="${descriptionId}"></p>
        </div>
        <div class="hall-guide-slides">
          <button type="button" data-step="0"><i></i><span><b>01</b><span data-label></span></span></button>
          <button type="button" data-step="1"><i></i><span><b>02</b><span data-label></span></span></button>
        </div>
        <div class="hall-guide-actions">
          <button class="hall-guide-done" type="button"></button>
        </div>
      </div>
    </section>`;
  document.body.append(root);
  root.setAttribute('aria-describedby', descriptionId);
  const find = selector => root.querySelector(selector);
  const canvas = find('canvas');
  const scene = find('.hall-guide-scene');
  const pointer = find('.hall-guide-pointer');
  const click = find('.hall-guide-click'), poster = find('img');
  const line = find('.hall-guide-line'), done = find('.hall-guide-done');
  const slides = [...root.querySelectorAll('[data-step]')];
  poster.src = definition.poster;

  const durations = definition.durations ?? [5, 5];
  // the film's two steps, one after the other: where each starts in it
  const offsets = [0, durations[0]], total = durations[0] + durations[1];
  const stepAt = time => (time < offsets[1] ? 0 : 1);
  let step = 0, shown = false, seen = storage.getItem(definition.storageKey) === 'seen';
  let pending = null, retry = null, frame = 0, clock = 0, last = 0, artwork = null, loading = false;
  const reduced = () => preferences?.reducedMotion ?? document.documentElement.dataset.reducedMotion === 'true';
  const words = key => {
    const params = { submit: i18n?.t('common.submit') ?? en.common.submit,
      enter: i18n?.t('manual.demo.enter') ?? en.manual.demo.enter };
    const said = i18n?.t(definition.locale + '.' + key, params);
    if (said && said !== definition.locale + '.' + key) return said;
    return (en[definition.locale][key] ?? '').replace(/\{(\w+)\}/g, (match, name) => params[name] ?? match);
  };
  const visible = () => shown && !root.classList.contains('hidden');
  const insidePlace = target => levels.place?.key === definition.place && levels.activeScene === target &&
    document.getElementById('start-screen')?.classList.contains('hidden');

  function stop() {
    cancelAnimationFrame(frame);
    frame = 0; last = 0;
  }
  // the step's words: the second of a step with motion reduced where it has one
  function caption() {
    root.dataset.step = String(step);
    const key = step ? 'two' : 'one';
    const said = reduced() && en[definition.locale][key + 'Reduced'] ? words(key + 'Reduced') : words(key);
    slides.forEach((button, index) => {
      if (index === step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    if (line.textContent === said) return;
    line.textContent = said;
    line.classList.remove('is-in');
    void line.offsetWidth;
    line.classList.add('is-in');
  }
  function draw() {
    const still = reduced();
    const t = still ? 2.8 : clock - offsets[step];
    const view = definition.draw(artwork, { step, t, still });
    const pressAt = view.pressAt ?? 1.2;
    // the film comes up out of the dark once, at its start; the second step
    // follows on the same picture, with no cut
    scene.style.opacity = String((view.opacity ?? 1) * (still || step ? 1 : guideBetween(t, 0, 0.35)));
    pointer.style.opacity = String(view.pointerOpacity ?? 1);
    const target = view.target ?? [door.width * 0.5, door.height * 0.53];
    const from = view.from ?? [door.width * 0.87, door.height * 0.88];
    const arrive = still ? 1 : guideBetween(t, 0.15, 1.05);
    // a hand's path: a little bowed, not ruled
    const bow = Math.sin(arrive * Math.PI) * Math.hypot(target[0] - from[0], target[1] - from[1]) * 0.12;
    const x = mix(from[0], target[0], arrive);
    const y = mix(from[1], target[1], arrive) - bow;
    pointer.style.left = `${(view.pointer?.[0] ?? x) / door.width * 100}%`;
    pointer.style.top = `${(view.pointer?.[1] ?? y) / door.height * 100}%`;
    const pulse = (t - pressAt) / 0.55;
    click.style.opacity = !still && pulse >= 0 && pulse < 1 ? String(1 - pulse) : '0';
    click.style.transform = `translate(-50%, -50%) scale(${0.6 + Math.max(0, pulse) * 1.2})`;
    pointer.dataset.pressed = String(!still && t >= pressAt && t < pressAt + 0.15);
    // the marks: the one playing fills as it goes
    slides.forEach((button, index) => {
      const fill = index < step ? 1 : index > step ? 0 : still ? 1 : Math.min(1, t / durations[step]);
      button.style.setProperty('--fill', fill.toFixed(3));
    });
  }
  function tick(now) {
    frame = 0;
    if (!visible() || document.hidden || reduced()) { last = 0; return; }
    clock += last ? Math.min(64, now - last) / 1000 : 0;
    last = now;
    // the film played through: it starts again
    if (clock >= total) clock = 0;
    const playing = stepAt(clock);
    if (playing !== step) { step = playing; caption(); }
    draw();
    frame = requestAnimationFrame(tick);
  }
  function animate() {
    stop();
    draw();
    if (visible() && !document.hidden && !reduced()) frame = requestAnimationFrame(tick);
  }
  function render() {
    artwork?.localize?.(i18n);
    find('.hall-guide-eyebrow').textContent = words('eyebrow');
    find('h2').textContent = words('title');
    find('.hall-guide-close').setAttribute('aria-label', words('close'));
    find('.hall-guide-visual').setAttribute('aria-label', words('illustration'));
    slides.forEach((button, index) => {
      button.querySelector('[data-label]').textContent = words(index ? 'twoLabel' : 'oneLabel');
      button.setAttribute('aria-label', words(index ? 'two' : 'one'));
    });
    done.textContent = words('done');
    root.dataset.reducedMotion = String(reduced());
    caption();
    draw();
  }
  function acknowledge() {
    seen = true;
    storage.setItem(definition.storageKey, 'seen');
  }
  function hidden() {
    if (!shown || !root.classList.contains('hidden')) return;
    shown = false;
    stop();
    acknowledge();
  }
  function load() {
    if (loading || artwork) return;
    loading = true;
    definition.createArtwork(game, canvas, scene).then(result => {
      if (!root.isConnected) { result?.dispose(); return; }
      if (!result) return;
      artwork = result;
      render();
      canvas.hidden = false; poster.hidden = true;
      if (visible()) animate();
    }).catch(() => {
      // Keep the original room image visible if an asset cannot be loaded.
    }).finally(() => { loading = false; });
  }
  function open(trigger, nested = false) {
    scope.cancel(retry); retry = null;
    pending = null;
    step = 0; clock = 0;
    shown = true;
    line.textContent = '';
    render();
    dialogs.open(root.id, trigger, { nested });
    animate(); load();
  }
  function tryOpen() {
    scope.cancel(retry); retry = null;
    if (!pending || seen || shown || dialogs.isOpen || document.hidden || !insidePlace(pending)) return;
    // Arrival transitions and other overlays can outlast the scene's fade.
    if (isBusy() || !pending.input?.enabled) {
      retry = scope.later(tryOpen, 200);
      return;
    }
    open(game.canvas);
  }
  function placeReady(target) {
    if (levels.place?.key !== definition.place) return;
    if (seen) return;
    pending = target;
    tryOpen();
  }
  game.events.on(definition.readyEvent, placeReady);
  scope.add(() => game.events.off(definition.readyEvent, placeReady));
  scope.add(levels.subscribe(() => {
    if (levels.place?.key === definition.place) return;
    scope.cancel(retry); retry = null;
    pending = null;
    if (visible()) dialogs.close();
  }));
  const observer = new MutationObserver(hidden);
  observer.observe(root, { attributes: true, attributeFilter: ['class'] });
  const dialogObserver = new MutationObserver(tryOpen);
  dialogObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  scope.on(find('.hall-guide-close'), 'click', () => dialogs.close());
  scope.on(done, 'click', () => dialogs.close());
  const choose = value => {
    step = value; clock = offsets[value];
    caption(); animate();
  };
  for (const button of slides) scope.on(button, 'click', () => choose(Number(button.dataset.step)));
  scope.on(find('.hall-guide-slides'), 'keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation();
    choose(event.key === 'ArrowLeft' || event.key === 'Home' ? 0 : 1);
    slides[step].focus();
  });
  scope.on(document, 'visibilitychange', () => { if (visible()) animate(); else tryOpen(); });
  if (i18n) scope.add(i18n.subscribe(() => { if (visible()) { line.textContent = ''; render(); } }));
  if (preferences) scope.add(preferences.subscribe(() => { if (visible()) { line.textContent = ''; render(); animate(); } }));
  scope.add(() => {
    observer.disconnect(); dialogObserver.disconnect(); stop();
    artwork?.dispose();
    root.remove();
  });

  return {
    open: trigger => open(trigger, dialogs.isOpen),
    reset() {
      scope.cancel(retry); retry = null;
      pending = null; shown = false; seen = false; stop();
      storage.removeItem(definition.storageKey);
    },
  };
}
