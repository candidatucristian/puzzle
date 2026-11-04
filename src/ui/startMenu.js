// The menu before the manor (index.html #start-menu): New game, Continue,
// Options and Exit, under the house's name, on the dark down the left of the
// picture. controls.js says what each one does; this only works the buttons.
//
// - Continue is greyed while there is nothing to go back to.
// - New game over a game already begun asks once more ("Sure?") before it
//   forgets it: a second press within four seconds.
// - Exit: a page may only close a tab that a page opened, so the screen goes
//   to black and says the tab may be closed, with a way back.

import { devModeAllowed, isDevMode, setDevMode } from '../shared/devMode.js';

const CONFIRM_MS = 4000;
const HOVER_URL = `${import.meta.env.BASE_URL}assets/sounds/menuhover.mp3`;

// The supplied menuhover.mp3, as the pointer (or the keys) comes onto a word:
// decoded once, its leading silence left out so it sounds at once, at the
// effects' volume under the master volume and mute. Silent until the page has
// been clicked (the browser starts the sound only after a gesture).
function menuHoverSound(scope, { game, audio }) {
  let buffer = null, offset = 0, last = 0;
  const ac = game?.sound?.context;
  if (ac) {
    fetch(HOVER_URL).then(r => (r.ok ? r.arrayBuffer() : Promise.reject(new Error('menuhover.mp3 missing'))))
      .then(bytes => ac.decodeAudioData(bytes)).then((decoded) => {
        if (scope.closed) return;
        const ch = decoded.getChannelData(0);
        let peak = 0;
        for (const s of ch) peak = Math.max(peak, Math.abs(s));
        let first = 0;
        while (first < ch.length && Math.abs(ch[first]) < peak * 0.012) first++;
        offset = first < ch.length ? Math.max(0, (first - 64) / decoded.sampleRate) : 0;
        buffer = decoded;
      }).catch(() => {});
  }
  return () => {
    const state = audio?.state;
    if (!buffer || ac.state !== 'running' || !game.sound.destination) return;
    if (state && (state.muted || !state.sfxVol || !state.masterVol)) return;
    // swept down the menu, one tick a word, not a rattle
    const now = performance.now();
    if (now - last < 45) return;
    last = now;
    const source = ac.createBufferSource(), gain = ac.createGain();
    source.buffer = buffer;
    gain.gain.value = state?.sfxVol ?? 0.8;
    source.connect(gain).connect(game.sound.destination);
    source.onended = () => { source.disconnect(); gain.disconnect(); };
    source.start(ac.currentTime, offset);
  };
}

export function mountStartMenu(scope, { game = null, audio = null, i18n = null, canContinue, hasProgress, isBlocked, onNewGame, onContinue, onOptions, onExit, onReturn, onDevMode }) {
  const menu = document.getElementById('start-menu');
  const start = document.getElementById('start-screen');
  if (!menu || !start) return { refresh() {} };
  const tick = menuHoverSound(scope, { game, audio });
  // the pointer onto a word, or the keys (Tab, the arrows) bringing it there;
  // not a greyed one, and not focus handed back by a closing dialog
  let keyAt = 0;
  scope.on(window, 'keydown', (event) => { if (['Tab', 'ArrowUp', 'ArrowDown'].includes(event.key)) keyAt = performance.now(); }, true);
  for (const button of menu.querySelectorAll('.menu-item')) {
    scope.on(button, 'pointerenter', (event) => { if (event.pointerType !== 'touch' && !button.disabled) tick(); });
    scope.on(button, 'focus', () => { if (!button.disabled && performance.now() - keyAt < 150) tick(); });
  }
  const t = (key, fallback) => (i18n ? i18n.t(key) : fallback);
  const item = (name) => menu.querySelector(`[data-menu="${name}"]`);
  const newGame = item('new'), resume = item('continue'), options = item('options'), exit = item('exit');
  const newWord = newGame.querySelector('.menu-word');

  // New game, asked once more over a game already begun
  let armed = false, timer = null;
  const disarm = () => {
    if (timer) scope.cancel(timer);
    timer = null;
    armed = false;
    newGame.classList.remove('is-armed');
    newWord.textContent = t('menu.newGame', 'New game');
  };
  scope.add(disarm);
  scope.on(newGame, 'click', (event) => {
    event.stopPropagation();
    if (isBlocked()) return;
    if (hasProgress() && !armed) {
      armed = true;
      newGame.classList.add('is-armed');
      newWord.textContent = t('menu.newGameConfirm', 'Sure? Your progress will be lost');
      timer = scope.later(disarm, CONFIRM_MS);
      return;
    }
    disarm();
    onNewGame();
  });
  scope.on(newGame, 'blur', disarm);

  scope.on(resume, 'click', (event) => {
    event.stopPropagation();
    if (resume.disabled || isBlocked()) return;
    disarm();
    onContinue(event);
  });
  scope.on(options, 'click', (event) => {
    event.stopPropagation();
    if (isBlocked()) return;
    disarm();
    onOptions(event.currentTarget);
  });
  scope.on(exit, 'click', (event) => {
    event.stopPropagation();
    if (isBlocked()) return;
    disarm();
    leave();
  });

  // Dev mode, from the dev server only: every door of the house open
  const dev = item('dev');
  const showDev = () => {
    const on = isDevMode();
    dev.classList.toggle('is-on', on);
    dev.setAttribute('aria-pressed', String(on));
    dev.querySelector('.menu-state').textContent = on ? 'ON' : 'OFF';
  };
  if (dev && devModeAllowed()) {
    dev.hidden = false;
    showDev();
    scope.on(dev, 'click', (event) => {
      event.stopPropagation();
      if (isBlocked()) return;
      disarm();
      setDevMode(!isDevMode());
      showDev();
      onDevMode?.(isDevMode());
      refresh();
    });
  }

  // Up and down move along the menu; Enter and Space are the buttons' own.
  scope.on(window, 'keydown', (event) => {
    if (!['ArrowDown', 'ArrowUp'].includes(event.key) || event.altKey || event.ctrlKey || event.metaKey) return;
    if (start.classList.contains('hidden') || start.classList.contains('is-telling') || start.classList.contains('is-arriving')) return;
    const inMenu = menu.contains(document.activeElement);
    if (!inMenu && document.activeElement !== document.body) return;
    const live = [...menu.querySelectorAll('.menu-item')].filter((b) => !b.disabled && !b.hidden);
    if (!live.length) return;
    event.preventDefault();
    const at = live.indexOf(document.activeElement);
    const step = event.key === 'ArrowDown' ? 1 : -1;
    const next = at < 0 ? (step > 0 ? 0 : live.length - 1) : (at + step + live.length) % live.length;
    live[next].focus();
  });

  // Exit: the screen goes to black; the tab is closed if the page may close
  // it, and otherwise says that it can be, with the way back to the manor.
  let night = null;
  function leave() {
    if (night) return;
    night = document.createElement('div');
    night.id = 'start-exit';
    night.setAttribute('role', 'dialog');
    night.setAttribute('aria-modal', 'true');
    const note = document.createElement('p');
    note.textContent = t('menu.exitNote', 'You can close this tab now.');
    const back = document.createElement('button');
    back.type = 'button';
    back.textContent = t('menu.exitBack', 'Back to the manor');
    night.append(note, back);
    document.body.append(night);
    onExit?.();
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    requestAnimationFrame(() => night?.classList.add('is-on'));
    scope.later(() => {
      try { window.close(); } catch { /* not this page's to close */ }
      night?.classList.add('is-told');
      back.focus({ preventScroll: true });
    }, 900);
    back.addEventListener('click', () => {
      const going = night;
      night = null;
      going.classList.remove('is-on', 'is-told');
      onReturn?.();
      scope.later(() => going.remove(), 900);
    });
  }
  scope.add(() => { night?.remove(); night = null; });

  // Continue greyed while there is nothing to go back to
  function refresh() {
    const can = Boolean(canContinue());
    resume.disabled = !can;
    resume.setAttribute('aria-disabled', String(!can));
  }
  refresh();
  if (i18n) scope.add(i18n.subscribe(() => { disarm(); refresh(); }));
  return { refresh, disarm };
}
