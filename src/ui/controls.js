import { createCompletion } from './completion.js';
import { mountResetConfirmation } from './resetConfirmation.js';
import { Scope } from '../shared/Scope.js';
import { observeViewport } from '../shared/viewport.js';
import { createTransitions } from './transitions.js';
import { createDialogs } from './dialogs.js';
import { mountAudioControls } from './audioControls.js';
import { mountFullscreenControl } from './fullscreen.js';
import { mountComfort } from './comfort.js';
import { mountHints } from './hints.js';
import { mountProgress } from './progress.js';
import { mountInteractionFeedback } from './interactions.js';
import { mountMobile, isTouchDevice, enterFullscreen } from './mobile.js';
import { createMoonCanvas } from '../shared/moon.js';
import { mountStartFilm } from './startFilm.js';
import { HOUSE_GO, WALK_MS } from '../shared/house.js';

export function mountUI(game, { levels, audio, storage, preferences, hints }) {
  const scope = new Scope(), byId = id => document.getElementById(id);
  const start = byId('start-screen');
  const moon = byId('start-moon');
  const moonArt = createMoonCanvas();
  moon.width = moonArt.width;
  moon.height = moonArt.height;
  moon.getContext('2d').drawImage(moonArt, 0, 0);
  const film = mountStartFilm(scope, preferences);
  const input = byId('level-code');
  const feedback = byId('answer-feedback');
  let mobile, suspendedInput;
  function answerFeedback(message = '', state = '') {
    if (feedback) { feedback.textContent = message; feedback.dataset.state = state; }
    input.setAttribute('aria-invalid', String(state === 'error'));
  }
  function restorePuzzleInput() {
    if (!suspendedInput) return;
    const { scene, pointer, keyboard, manager, managerEnabled } = suspendedInput;
    if (scene?.input) scene.input.enabled = pointer;
    if (scene?.input?.keyboard) scene.input.keyboard.enabled = keyboard;
    if (manager) manager.enabled = managerEnabled;
    suspendedInput = null;
  }
  function suspendPuzzleInput() {
    if (suspendedInput) return;
    const scene = levels.activeScene;
    const manager = game.input?.keyboard;
    suspendedInput = { scene, pointer: scene?.input?.enabled, keyboard: scene?.input?.keyboard?.enabled,
      manager, managerEnabled: manager?.enabled };
    if (scene?.input) scene.input.enabled = false;
    if (scene?.input?.keyboard) {
      scene.input.keyboard.resetKeys();
      scene.input.keyboard.enabled = false;
    }
    // Phaser's global key captures would otherwise consume the arrows used
    // by native settings sliders, even with the scene keyboard disabled.
    if (manager) manager.enabled = false;
  }
  scope.add(restorePuzzleInput);
  const dialogs = createDialogs(scope, {
    onOpen() {
      mobile?.close();
      suspendPuzzleInput();
    },
    onClose: restorePuzzleInput,
  });
  scope.add(levels.subscribe(() => answerFeedback()));
  // Standing in the house there is no puzzle, so nothing to answer: the
  // console waits until the player has opened one.
  scope.add(levels.subscribe(() => document.body.classList.toggle('in-house', Boolean(levels.place))));
  let started = false;
  let sessionStart = null;
  const touch = isTouchDevice();

  function showGame() {
    if (!start.classList.contains('hidden')) film.stop();
    start.classList.add('hidden'); storage.setItem('hasPlayedBefore', 'true');
    progressUI.render();
    if (game.sound.context?.state === 'suspended') {
      game.sound.context.resume().catch(error => console.warn('Audio will resume after the next interaction.', error));
    }
  }
  const completion = createCompletion(scope, {
    levels,
    getSessionStart: () => sessionStart,
    onReplay: () => navigate(levels.currentIndex, { quick: true }),
    onFirst: () => { sessionStart = Date.now(); navigate(0); },
  });
  const transitions = createTransitions({ levels, showGame, preferences, onNavigate() { completion.hide(); mobile?.close(); } });
  const navigate = (index, options) => transitions.go(index, options);
  const progressUI = mountProgress(scope, {
    game, levels, storage, navigate,
    canNavigate: () => !transitions.busy && !dialogs.isOpen,
  });
  mountComfort(scope, preferences);
  const hintUI = mountHints(scope, { levels, hints, dialogs });
  mountInteractionFeedback(scope, game);
  mobile = mountMobile(scope, {
    canOpenDrawer: () => !transitions.busy && !dialogs.isOpen,
    onDrawer: name => {
      if (name) suspendPuzzleInput();
      else if (!dialogs.isOpen) restorePuzzleInput();
    },
  });
  function begin(event) {
    if (event?.type === 'keydown' && ['Tab', 'Escape', 'Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) return;
    if (event?.type === 'keydown' && event.target !== document.body && !start.contains(event.target)) return;
    if (started || transitions.busy || dialogs.isOpen || start.classList.contains('hidden')) return;
    started = true; sessionStart = Date.now();
    // a phone's first tap is the one gesture that may take the whole screen
    if (touch && mobile.compact && event?.type === 'click') enterFullscreen();
    // the way in leads to the hall; its doors lead to the rooms
    completion.hide(); mobile?.close();
    showGame(); levels.enterHall();
  }
  // Walking through the house: the picture dissolves to black, what is
  // behind it changes, and it comes softly back. No veil, no title — one
  // place is simply walked into from another. Walking up to something takes
  // the whole of `out`: the picture holds while the eye sets off toward it,
  // then darkens steadily for the rest of the way.
  let walking = false;
  function walk(arrive, out = 240) {
    if (walking) return;
    const canvas = game.canvas;
    const land = () => { completion.hide(); mobile?.close(); arrive(); walking = false; };
    if (preferences?.reducedMotion || !canvas.animate) { land(); return; }
    walking = true;
    const leaving = canvas.animate([{ opacity: 1 }, { opacity: 1, offset: 0.3 }, { opacity: 0 }],
      { duration: out, fill: 'forwards', easing: 'ease-in-out' });
    leaving.onfinish = () => {
      land();
      leaving.cancel();
      canvas.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 520, easing: 'ease-out' });
    };
  }
  // A door leads to a place, a thing found in one opens its puzzle; the
  // scene is already going toward whichever was clicked.
  const houseGo = ({ place, level } = {}) => {
    if (!levels.place || walking || transitions.busy || dialogs.isOpen) return;
    const index = levels.indexOf(level);
    if (place) walk(() => levels.enterPlace(place), WALK_MS);
    else if (levels.discover(index)) walk(() => levels.navigate(index), WALK_MS);
  };
  game.events.on(HOUSE_GO, houseGo);
  scope.add(() => game.events.off(HOUSE_GO, houseGo));
  scope.on(byId('btn-leave'), 'click', () => {
    const back = levels.back;
    if (walking || transitions.busy || dialogs.isOpen || !back) return;
    walk(() => levels.enterPlace(back.key));
  });
  scope.on(window, 'keydown', begin); scope.on(start, 'click', begin);
  mountFullscreenControl(scope, byId('btn-fullscreen'));

  scope.on(byId('btn-submit'), 'click', () => {
    if (transitions.busy || dialogs.isOpen) return;
    if (!input.value.trim()) {
      answerFeedback('Enter the answer you found in the room.', 'info');
      input.focus();
      return;
    }
    // a puzzle found in the house is come back from to where it was found;
    // one not put anywhere yet still leads straight on to the next
    const home = levels.homeOf(levels.currentIndex);
    const result = levels.submit(input.value);
    if (result.correct) {
      answerFeedback(result.nextIndex === null ? 'Answer accepted. Every room is solved.' : home ? 'Answer accepted.' : 'Answer accepted. Opening the next room.', 'success');
      input.classList.add('success-flash'); scope.later(() => input.classList.remove('success-flash'), 1200);
      if (result.nextIndex === null) {
        completion.show();
        audio.playSuccess();
      } else {
        audio.playSuccess();
        if (home) transitions.enter(home.key, { caption: 'Answer accepted' });
        else navigate(result.nextIndex, { caption: 'Answer accepted' });
      }
      input.value = '';
    } else {
      answerFeedback('Look again. That answer does not unlock this room.', 'error');
      audio.playErrorSound(); input.classList.add('error-flash');
      scope.later(() => input.classList.remove('error-flash'), 1000);
    }
  });
  scope.on(input, 'input', () => {
    answerFeedback();
    input.classList.remove('success-flash', 'error-flash');
  });
  scope.on(input, 'keydown', e => { if (e.key === 'Enter') { e.preventDefault(); byId('btn-submit').click(); } });
  // Editing a code or adjusting the header volume must not also operate the
  // room through Phaser's window-level keyboard listener.
  for (const type of ['keydown', 'keyup']) scope.on(document, type, event => {
    if (event.target.matches?.('input, select, textarea') && !event.target.closest('#game-container')) event.stopPropagation();
  });
  scope.on(byId('btn-replay'), 'click', () => { if (!transitions.busy) navigate(levels.currentIndex, { quick: true }); });

  const reset = mountResetConfirmation(scope, byId('btn-new'), {
    isBlocked: () => transitions.busy,
    onConfirm() {
      completion.hide();
      dialogs.closeAll();
      transitions.dispose();
      hintUI.reset();
      progressUI.reset();
      levels.reset();
      started = true;
      sessionStart = Date.now();
      showGame();
      transitions.enter('Hall');
    },
  });
  scope.on(byId('btn-howto'), 'click', event => { reset.disarm(); dialogs.open('howto-modal', event.currentTarget, { nested: true }); });
  scope.on(byId('btn-close-howto'), 'click', () => dialogs.close());
  scope.on(byId('btn-options'), 'click', event => { reset.disarm(); dialogs.open('options-modal', event.currentTarget); });
  scope.on(byId('btn-close-options'), 'click', () => { reset.disarm(); dialogs.close(); });
  mountAudioControls(audio, scope);
  // while the code box has the on-screen keyboard up, the room waits to be repainted
  observeViewport(game, scope, { defer: () => touch && document.activeElement === input });
  return { navigate, showGame, get busy() { return transitions.busy; },
    dispose() { transitions.dispose(); dialogs.closeAll(); scope.dispose(); } };
}
