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
import { mountStartManor } from './startManor.js';
import { HOUSE_GO, HOUSE_SOLVED, WALK_MS } from '../shared/house.js';
import { mountHouseMap } from './houseMap.js';
import { mountNotebook } from './notebook.js';
import { mountMagnifier } from './magnifier.js';
import { mountAmbience } from './ambience.js';
import { mountTooltips } from './tooltips.js';
import { mountLookAround } from './lookAround.js';
import { mountAhas } from './ahas.js';
import { mountFootsteps } from './footsteps.js';

export function mountUI(game, { levels, audio, storage, preferences, hints }) {
  const scope = new Scope(), byId = id => document.getElementById(id);
  const start = byId('start-screen');
  const moon = byId('start-moon');
  const moonArt = createMoonCanvas();
  moon.width = moonArt.width;
  moon.height = moonArt.height;
  moon.getContext('2d').drawImage(moonArt, 0, 0);
  // Behind the title: the manor painted, as the rooms are — or, asked for
  // with ?start=video in the address, the film of it.
  const filmed = new URLSearchParams(location.search).get('start') === 'video';
  const raiseFilm = () => (filmed ? mountStartFilm(scope, preferences) : mountStartManor(scope, preferences));
  let film = raiseFilm();
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
  // — unless the place is itself a puzzle's stage, still unsolved.
  scope.add(levels.subscribe(() => {
    document.body.classList.toggle('in-place', Boolean(levels.place));
    document.body.classList.toggle('in-house', Boolean(levels.place) && !levels.answering);
  }));
  let started = false;
  let sessionStart = null;
  const touch = isTouchDevice();

  // in front of the house the index tells of the game, not of any room
  const outside = on => document.body.classList.toggle('outside', on);
  outside(!start.classList.contains('hidden'));
  function showGame() {
    if (!start.classList.contains('hidden')) film.stop();
    start.classList.add('hidden'); storage.setItem('hasPlayedBefore', 'true');
    outside(false);
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
    // the button takes someone coming back on to their room; the door, or
    // any key, leads into the hall
    const returning = storage.getItem('hasPlayedBefore') === 'true';
    const room = returning && event?.target?.closest?.('#btn-continue') ? levels.resumeRoom : null;
    showGame();
    if (!room?.open || !levels.enterPlace(room.key)) levels.enterHall();
  }
  // Walking through the house: the picture dissolves to black, what is
  // behind it changes, and it comes softly back. No veil, no title — one
  // place is simply walked into from another. Walking up to something takes
  // the whole of `out`: the picture holds while the eye sets off toward it,
  // then darkens steadily for the rest of the way.
  // From one place of the house to another the steps are heard, dying away
  // as the new place comes up (`steps`); walking up to a puzzle, they are not.
  const footsteps = mountFootsteps(scope, { game, audio });
  let walking = false;
  function walk(arrive, out = 240, hold = 0, steps = false) {
    if (walking) return;
    if (hold) { walking = true; scope.later(() => { walking = false; walk(arrive, out, 0, steps); }, hold); return; }
    const canvas = game.canvas;
    const land = () => { completion.hide(); mobile?.close(); arrive(); walking = false; };
    if (preferences?.reducedMotion || !canvas.animate) { if (steps) footsteps.walk(900); land(); return; }
    if (steps) footsteps.walk(out + 520 + 450);
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
    if (place) walk(() => levels.enterPlace(place), WALK_MS, 0, true);
    else if (levels.discover(index)) walk(() => levels.navigate(index), WALK_MS);
  };
  game.events.on(HOUSE_GO, houseGo);
  scope.add(() => game.events.off(HOUSE_GO, houseGo));
  // Out of the hall there is only outside: the title again, the house seen
  // from the drive. The hall waits behind it as it was left.
  function goOutside() {
    completion.hide(); mobile?.close();
    film = raiseFilm();
    start.classList.remove('hidden');
    outside(true);
    started = false;
    progressUI.render();
  }
  scope.on(byId('btn-leave'), 'click', () => {
    const back = levels.back;
    if (walking || transitions.busy || dialogs.isOpen) return;
    if (!back) { if (levels.place) goOutside(); return; }
    // the place opens on what is being come away from, and draws back from it
    const from = levels.place ? { place: levels.place.key } : { level: levels.definitions[levels.currentIndex].id };
    walk(() => levels.enterPlace(back.key, from), 240, 0, true);
  });
  scope.on(window, 'keydown', begin); scope.on(start, 'click', begin);

  // Straight to a place on the map: the walk, from wherever the player is.
  function travel(key) {
    if (walking || transitions.busy || levels.place?.key === key) return;
    walk(() => levels.enterPlace(key), 260, 0, true);
  }
  const map = mountHouseMap(scope, { levels, dialogs, travel });
  const notebook = mountNotebook(scope, { levels, dialogs, storage });
  const glass = mountMagnifier(scope, game);
  mountAmbience(scope, { game, levels, audio });
  mountTooltips(scope);
  mountLookAround(scope, game);
  mountAhas(scope, { game, audio });
  scope.on(byId('btn-map'), 'click', event => { if (!transitions.busy) map.open(event.currentTarget); });
  scope.on(byId('btn-close-map'), 'click', () => dialogs.close());
  scope.on(byId('btn-notebook'), 'click', event => { if (!transitions.busy) notebook.open(event.currentTarget); });
  // M the map, N the notebook, Z the glass; Esc the way back. Never while
  // something is being typed, nor before the house has been come into.
  scope.on(window, 'keydown', event => {
    // (an Esc that has just closed a dialog is spent)
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
    if (event.target.matches?.('input, textarea, select') || !start.classList.contains('hidden')) return;
    if (dialogs.isOpen || transitions.busy || walking) return;
    const key = event.key.toLowerCase();
    if (key === 'm') { event.preventDefault(); map.open(byId('btn-map')); }
    else if (key === 'n') { event.preventDefault(); notebook.open(byId('btn-notebook')); }
    else if (key === 'z') { event.preventDefault(); glass.toggle(); }
    else if (key === 'escape') {
      if (glass.on) { glass.off(); return; }
      // a puzzle that uses Esc itself keeps it
      if (levels.activeScene?.usesEscape) return;
      const leave = byId('btn-leave');
      if (!leave.hidden) leave.click();
    }
  });
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
    const solvedId = levels.definitions[levels.currentIndex].id;
    const onStage = Boolean(levels.place); // answered standing in the place it is played in
    const result = levels.submit(input.value);
    if (result.correct) {
      answerFeedback(result.nextIndex === null ? 'Answer accepted. Every room is solved.' : home ? 'Answer accepted.' : 'Answer accepted. Opening the next room.', 'success');
      input.classList.add('success-flash', 'ink-sets'); scope.later(() => input.classList.remove('success-flash', 'ink-sets'), 1200);
      if (result.nextIndex === null) {
        completion.show();
        audio.playSuccess();
      } else {
        audio.playSuccess();
        // a moment for the answer to be seen accepted, then back out to the
        // room, which opens on the thing just solved and draws back from it
        if (onStage) game.events.emit(HOUSE_SOLVED, solvedId); // nowhere to go back to: the place itself takes note
        else if (home) walk(() => levels.enterPlace(home.key, { level: solvedId }), 300, 700, true);
        else navigate(result.nextIndex, { caption: 'Answer accepted' });
      }
      input.value = '';
    } else {
      answerFeedback('Look again. That answer does not unlock this room.', 'error');
      audio.playErrorSound();
      input.classList.remove('error-flash', 'ink-runs'); void input.offsetWidth;
      input.classList.add('error-flash', 'ink-runs');
      scope.later(() => input.classList.remove('error-flash', 'ink-runs'), 1000);
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
  scope.on(byId('btn-replay'), 'click', () => {
    if (transitions.busy) return;
    // a puzzle played in a place starts again there, not in a scene of its own
    if (levels.place) levels.enterPlace(levels.place.key);
    else navigate(levels.currentIndex, { quick: true });
  });

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
