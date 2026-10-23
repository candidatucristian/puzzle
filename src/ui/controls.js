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
import { HOUSE_GO, HOUSE_BACK, HOUSE_SOLVED, WALK_MS } from '../shared/house.js';
import { mountHouseMap } from './houseMap.js';
import { mountNotebook } from './notebook.js';
import { mountManual } from './manual/manual.js';
import { mountMagnifier } from './magnifier.js';
import { mountAmbience } from './ambience.js';
import { mountTooltips } from './tooltips.js';
import { mountLookAround } from './lookAround.js';
import { mountAhas } from './ahas.js';
import { mountFootsteps } from './footsteps.js';
import { mountCaseFile } from './caseFile.js';
import { playPrologue, preloadPrologueDesk } from './prologue.js';
import { mountCinema } from './cinema.js';
import { mountPaperSounds } from './paperSounds.js';
import { playIntroVideo } from './introVideo.js';
import { playManorStory } from './manorStory.js';
import { taskCard } from './tasks.js';
import { applyI18nToDOM } from '../core/i18n.js';

export function mountUI(game, { levels, audio, storage, preferences, hints, i18n = null }) {
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
  // Phaser hears the mouse on the whole window, not only on its canvas: a
  // press on anything laid over the picture — a letter arriving, the case
  // file, a card — would also reach whatever in the room lies under it, and
  // open it. Such a press is marked handled before Phaser hears it (it skips
  // handled events), and so is its release; form fields keep theirs.
  let overlaid = false;
  const overPicture = (event) => {
    const canvas = game.canvas, t = event.target;
    if (!canvas || t === canvas || !(t instanceof Element) || t.closest('input, textarea, select, [contenteditable]')) return false;
    const box = canvas.getBoundingClientRect();
    return event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom;
  };
  scope.on(window, 'mousedown', (event) => { overlaid = overPicture(event); if (overlaid) event.preventDefault(); }, true);
  scope.on(window, 'mouseup', (event) => { if (overlaid) { overlaid = false; event.preventDefault(); } }, true);
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
  let doorTasks = null; // tonight's tasks, before the house, until he goes in
  let entering = []; // the walk up to the front door, while it runs
  let sessionStart = null;
  const touch = isTouchDevice();
  let stopOpening = () => {};

  // in front of the house the index tells of the game, not of any room
  const outside = on => document.body.classList.toggle('outside', on);
  outside(!start.classList.contains('hidden'));
  function showGame() {
    stopOpening();
    if (!start.classList.contains('hidden')) film.stop();
    start.classList.add('hidden'); storage.setItem('hasPlayedBefore', 'true'); storage.setItem('house:entered', 'true');
    outside(false);
    // the walk up to the door, done: the picture put back for another time outside
    for (const step of entering) step.cancel();
    entering = [];
    // in by the door: the last of tonight's tasks done, and the list put away
    if (doorTasks) {
      doorTasks.tick('door');
      const done = doorTasks.node.parentElement;
      doorTasks = null;
      scope.later(() => done?.remove(), 1200);
    }
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
  const progressUI = mountProgress(scope, { game, levels, storage, i18n });
  mountComfort(scope, preferences, i18n);
  const hintUI = mountHints(scope, { levels, hints, i18n });
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
    if (started || prologueOn || transitions.busy || dialogs.isOpen || start.classList.contains('hidden')) return;
    started = true; sessionStart = Date.now();
    // The fixed door marker must be gone before the manor starts moving.
    start.classList.add('is-entering');
    // a phone's first tap is the one gesture that may take the whole screen
    if (touch && mobile.compact && event?.type === 'click') enterFullscreen();
    // the way in — the door, or any key — leads to the hall; its doors lead
    // to the rooms
    completion.hide(); mobile?.close();
    toTheDoor(() => cinema.enterHouse(() => {
      showGame();
      levels.enterHall();
    }));
  }
  // Up to the front door exactly as a door inside the house is walked up to
  // (shared/house.js aimCameraAt, zoomInto; walk below): one movement, the
  // door travelling to the middle of the picture while everything swells
  // evenly about it, over WALK_MS, eased in and out; the picture holding for
  // the first part of the way, then darkening; the steps heard. The door's
  // pencil line and the house's name go at once. Then in.
  function toTheDoor(then) {
    const film = byId('start-film'), door = byId('start-door');
    if (preferences?.reducedMotion || !film?.animate || !door) { then(); return; }
    const box = start.getBoundingClientRect(), at = door.getBoundingClientRect();
    const W = box.width, H = box.height;
    const x = at.left + at.width / 2 - box.left, y = at.top + at.height / 2 - box.top;
    const reach = Math.min(3.4, Math.max(1.7, 0.62 * Math.min(W / at.width, H / at.height)));
    // the camera's own path, frame by frame: k eased as the house's Sine.easeInOut
    const frames = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24, k = (1 - Math.cos(Math.PI * t)) / 2, zoom = Math.pow(reach, k);
      const sx = x + (W / 2 - x) * k, sy = y + (H / 2 - y) * k;
      frames.push({ offset: t, transform: `translate(${sx - zoom * x}px, ${sy - zoom * y}px) scale(${zoom})`, opacity: t <= 0.3 ? 1 : Math.cos((t - 0.3) / 0.7 * Math.PI / 2) ** 1.4 });
    }
    film.style.transformOrigin = '0 0';
    const close = film.animate(frames, { duration: WALK_MS, easing: 'linear', fill: 'forwards' });
    const gone = [byId('start-legend'), start.querySelector('.manor-story')].filter(Boolean)
      .map(el => el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, easing: 'ease-out', fill: 'forwards' }));
    entering = [close, ...gone];
    footsteps.walk(WALK_MS + 900);
    let went = false;
    const go = () => { if (!went) { went = true; then(); } };
    close.finished.then(go, go);
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
    // a floor not yet been on: its chapter first, the hall behind the black
    if (place && cinema.chapterBefore(place, () => levels.enterPlace(place))) footsteps.walk(WALK_MS + 900);
    else if (place) walk(() => levels.enterPlace(place), WALK_MS, 0, true);
    else if (levels.discover(index)) walk(() => levels.navigate(index), WALK_MS);
  };
  game.events.on(HOUSE_GO, houseGo);
  scope.add(() => game.events.off(HOUSE_GO, houseGo));
  // Out of the hall there is only outside: the title again, the house seen
  // from the drive. The hall waits behind it as it was left.
  function goOutside() {
    completion.hide(); mobile?.close();
    film = raiseFilm();
    start.classList.remove('hidden', 'is-entering');
    outside(true);
    started = false;
    progressUI.render();
  }
  const leave = () => {
    const back = levels.back;
    if (walking || transitions.busy || dialogs.isOpen) return;
    if (!back) { if (levels.place) goOutside(); return; }
    // the place opens on what is being come away from, and draws back from it
    const from = levels.place ? { place: levels.place.key } : { level: levels.definitions[levels.currentIndex].id };
    if (!cinema.chapterBefore(back.key, () => levels.enterPlace(back.key, from))) walk(() => levels.enterPlace(back.key, from), 240, 0, true);
  };
  scope.on(byId('btn-leave'), 'click', leave);
  game.events.on(HOUSE_BACK, leave);
  scope.add(() => game.events.off(HOUSE_BACK, leave));
  scope.on(window, 'keydown', begin); scope.on(start, 'click', begin);

  // Straight to a place on the map: the walk, from wherever the player is.
  function travel(key) {
    if (walking || transitions.busy || levels.place?.key === key) return;
    if (!cinema.chapterBefore(key, () => levels.enterPlace(key))) walk(() => levels.enterPlace(key), 260, 0, true);
  }
  const map = mountHouseMap(scope, { levels, dialogs, travel, i18n });
  const notebook = mountNotebook(scope, { levels, dialogs, storage, i18n });
  const cinema = mountCinema(scope, { storage, reducedMotion: () => Boolean(preferences?.reducedMotion), i18n });
  const paperSounds = mountPaperSounds({ game, audio });
  const caseFile = mountCaseFile(scope, { levels, dialogs, storage, sounds: paperSounds, reducedMotion: () => Boolean(preferences?.reducedMotion), isBusy: () => transitions.busy || walking || cinema.busy, i18n });
  // A new case opens with the supplied film, then dissolves directly onto
  // the Inspector's desk. Each run owns its listeners and media playback.
  let prologueOn = false;
  let openingScope = null;
  stopOpening = () => { openingScope?.dispose(); openingScope = null; prologueOn = false; };
  scope.add(stopOpening);
  function openCase() {
    if (prologueOn || caseFile.has('invitation')) return;
    prologueOn = true;
    const opening = openingScope = new Scope();
    const prologue = async () => {
      await preloadPrologueDesk();
      if (opening.closed) return;
      return playPrologue(opening, {
        deferInteraction: true,
        reducedMotion: preferences?.reducedMotion,
        revealImmediately: true,
        sounds: paperSounds,
        i18n,
        // A plain black covers the desk before the manor appears.
        onDone: async (dismiss) => {
          caseFile.unlock('invitation');
          showDoorTasks();
          // before the manor for the first time, the house's own story — set
          // up behind the black, so that the house is never seen before it
          // (its name and its door wait under the story)
          await cinema.card([], { hold: 300, onDark: () => {
            dismiss();
            playManorStory(scope, { reducedMotion: Boolean(preferences?.reducedMotion), i18n });
          } });
          if (!opening.closed) stopOpening();
        },
      });
    };
    // at once, under the loading screen: its black is what the loading
    // screen fades into, and its titles wait for that (introVideo.js)
    void preloadPrologueDesk();
    playIntroVideo(opening, { game, audio, reducedMotion: Boolean(preferences?.reducedMotion), onUnder: prologue, i18n });
  }
  openCase();
  // In front of the house, until he first goes in: tonight's tasks carried on
  // from the desk, in the index on the right — those done struck through, and
  // the way in the one left to do (tasks.js, styled as the desk's panel).
  // gone in before? (the first chapter is shown on the first time in, cinema.js)
  const hasEntered = () => {
    if (storage.getItem('house:entered')) return true;
    try { return JSON.parse(storage.getItem('story:seen') || '[]').includes('chapter:1'); } catch { return false; }
  };
  function showDoorTasks() {
    if (doorTasks || hasEntered()) return;
    const host = byId('index-outside');
    if (!host) return;
    doorTasks = taskCard([
      ['letter', i18n ? i18n.t('tasks.letter') : 'Read the letter'],
      ['file', i18n ? i18n.t('tasks.file') : 'Open the case file'],
      ['house', i18n ? (i18n.language === 'ro' ? 'Mergi la Conacul Ashcombe' : 'Go to Ashcombe Manor') : 'Go to Ashcombe Manor'],
      ['door', i18n ? (i18n.language === 'ro' ? 'Apasă pe ușă pentru a intra' : 'Click on the door to enter the manor') : 'Click on the door to enter the manor'],
    ]);
    for (const done of ['letter', 'file', 'house']) doorTasks.tick(done);
    const list = document.createElement('div');
    list.className = 'outside-tasks';
    const label = document.createElement('p');
    label.className = 'outside-label';
    label.textContent = i18n ? i18n.t('tasks.tonight') : 'Tonight';
    list.append(label, doorTasks.node);
    host.querySelector('.outside-story')?.after(list);
  }
  if (caseFile.has('invitation')) showDoorTasks();
  const glass = mountMagnifier(scope, game);
  mountAmbience(scope, { game, levels, audio });
  mountTooltips(scope);
  mountLookAround(scope, game);
  mountAhas(scope, { game, audio });
  scope.on(byId('btn-map'), 'click', event => { if (!transitions.busy) map.open(event.currentTarget); });
  scope.on(byId('btn-close-map'), 'click', () => dialogs.close());
  // the notebook's button opens it, and puts it away again
  scope.on(byId('btn-notebook'), 'click', event => {
    if (notebook.isOpen) notebook.close();
    else if (!transitions.busy) notebook.open(event.currentTarget);
  });
  scope.on(byId('btn-casefile'), 'click', event => { if (!transitions.busy) caseFile.open(event.currentTarget); });
  // M the map, N the notebook, C the case file, Z the glass; Esc the way back. Never while
  // something is being typed, nor before the house has been come into.
  scope.on(window, 'keydown', event => {
    // (an Esc that has just closed a dialog is spent)
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
    if (event.target.matches?.('input, textarea, select') || !start.classList.contains('hidden')) return;
    if (dialogs.isOpen || transitions.busy || walking) return;
    const key = event.key.toLowerCase();
    if (key === 'm') { event.preventDefault(); map.open(byId('btn-map')); }
    else if (key === 'n') { event.preventDefault(); notebook.open(byId('btn-notebook')); }
    else if (key === 'c') { event.preventDefault(); caseFile.open(byId('btn-casefile')); }
    else if (key === 'z') { event.preventDefault(); glass.toggle(); }
    else if (key === 'escape') {
      if (glass.on) { glass.off(); return; }
      // a puzzle that uses Esc itself keeps it
      if (levels.activeScene?.usesEscape) return;
      const leave = byId('btn-leave');
      if (!leave.hidden) leave.click();
    }
  });
  mountFullscreenControl(scope, byId('btn-fullscreen'), i18n);

  scope.on(byId('btn-submit'), 'click', () => {
    if (transitions.busy || dialogs.isOpen) return;
    if (!input.value.trim()) {
      answerFeedback(i18n ? i18n.t('feedback.enterAnswer') : 'Enter the answer you found in the room.', 'info');
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
      const acceptedMsg = result.nextIndex === null
        ? (i18n ? i18n.t('feedback.allSolved') : 'Answer accepted. Every room is solved.')
        : home
        ? (i18n ? i18n.t('feedback.accepted') : 'Answer accepted.')
        : (i18n ? i18n.t('feedback.acceptedNext') : 'Answer accepted. Opening the next room.');
      answerFeedback(acceptedMsg, 'success');
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
        else navigate(result.nextIndex, { caption: i18n ? i18n.t('veil.caption') : 'Answer accepted' });
      }
      input.value = '';
    } else {
      answerFeedback(i18n ? i18n.t('feedback.incorrect') : 'Look again. That answer does not unlock this room.', 'error');
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
      stopOpening();
      completion.hide();
      dialogs.closeAll();
      transitions.dispose();
      hintUI.reset();
      progressUI.reset();
      levels.reset();
      caseFile.reset();
      cinema.reset();
      storage.removeItem('house:entered');
      goOutside();
      openCase();
    },
    i18n,
  });
  // how to play: the inspector's manual, opened over the settings
  const manual = mountManual(scope, { dialogs, i18n, sounds: paperSounds });
  scope.on(byId('btn-howto'), 'click', event => { reset.disarm(); manual.open(event.currentTarget); });
  scope.on(byId('btn-close-howto'), 'click', () => dialogs.close());
  scope.on(byId('btn-options'), 'click', event => { reset.disarm(); dialogs.open('options-modal', event.currentTarget); });
  scope.on(byId('btn-close-options'), 'click', () => { reset.disarm(); dialogs.close(); });
  mountAudioControls(audio, scope, i18n);
  // while the code box has the on-screen keyboard up, the room waits to be repainted
  observeViewport(game, scope, { defer: () => touch && document.activeElement === input });

  if (i18n) {
    applyI18nToDOM(i18n);
    scope.add(i18n.subscribe(() => {
      applyI18nToDOM(i18n);
      progressUI.render();
      hintUI.render?.();
    }));
  }

  return { navigate, showGame, get busy() { return transitions.busy || walking; },
    dispose() { transitions.dispose(); dialogs.closeAll(); scope.dispose(); } };
}
