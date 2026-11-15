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
import { mountStartMenu } from './startMenu.js';
import { isDevMode } from '../shared/devMode.js';
import { HOUSE_GO, HOUSE_BACK, HOUSE_SOLVED, WALK_MS } from '../shared/house.js';
import { mountHouseMap } from './houseMap.js';
import { mountPlayersOnline } from './playersOnline.js';
import { mountMagnifier } from './magnifier.js';
import { mountAmbience } from './ambience.js';
import { mountTooltips } from './tooltips.js';
import { mountLookAround } from './lookAround.js';
import { mountFootsteps } from './footsteps.js';
import { mountCaseFile } from './caseFile.js';
import { mountDemoEnd } from './demoEnd.js';
import { playPrologue, preloadPrologueDesk } from './prologue.js';
import { playSolveStrike } from './solveStrike.js';
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
  let updateTitle = () => {}; // the menu's Continue and the door, brought up to date (set below)
  let doorTasks = null; // tonight's tasks, before the house, until he goes in
  let entering = []; // the walk up to the front door, while it runs
  let travelLife = new Scope();
  scope.add(() => travelLife.dispose());
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
    start.classList.remove('is-arriving');
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
    i18n,
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
    // the way in — the menu's Continue, or the door — leads to the hall; its
    // doors lead to the rooms
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
    const life = travelLife;
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
    const gone = [byId('start-legend'), byId('start-veil'), start.querySelector('.manor-story')].filter(Boolean)
      .map(el => el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, easing: 'ease-out', fill: 'forwards' }));
    entering = [close, ...gone];
    life.add(() => { for (const animation of [close, ...gone]) animation.cancel(); });
    footsteps.walk(WALK_MS + 900);
    let went = false;
    const go = () => { if (!life.closed && !went) { went = true; then(); } };
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
    const life = travelLife;
    if (hold) { walking = true; life.later(() => { walking = false; walk(arrive, out, 0, steps); }, hold); return; }
    const canvas = game.canvas;
    const land = () => { if (life.closed) return; completion.hide(); mobile?.close(); arrive(); walking = false; };
    if (preferences?.reducedMotion || !canvas.animate) { if (steps) footsteps.walk(900); land(); return; }
    if (steps) footsteps.walk(out + 520 + 450);
    walking = true;
    const leaving = canvas.animate([{ opacity: 1 }, { opacity: 1, offset: 0.3 }, { opacity: 0 }],
      { duration: out, fill: 'forwards', easing: 'ease-in-out' });
    const cancel = () => { leaving.onfinish = null; leaving.cancel(); };
    life.add(cancel);
    leaving.finished.then(() => life.cleanups.delete(cancel), () => life.cleanups.delete(cancel));
    leaving.onfinish = () => {
      if (life.closed) return;
      land();
      leaving.cancel();
      const coming = canvas.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 520, easing: 'ease-out' });
      const cancelComing = () => coming.cancel();
      life.add(cancelComing);
      coming.finished.then(() => life.cleanups.delete(cancelComing), () => life.cleanups.delete(cancelComing));
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
    // (already outside, after a reset there: the manor is up and stays)
    if (start.classList.contains('hidden')) film = raiseFilm();
    start.classList.remove('hidden', 'is-entering', 'is-arriving');
    outside(true);
    started = false;
    progressUI.render();
    updateTitle();
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
  // The way in is the menu's Continue (below), or the front door itself, once
  // a game has been begun; a click elsewhere on the picture does nothing.
  scope.on(byId('start-door'), 'click', event => { if (canContinue()) begin(event); });

  // Straight to a place on the map: the walk, from wherever the player is.
  function travel(key) {
    if (walking || transitions.busy || levels.place?.key === key) return;
    if (!cinema.chapterBefore(key, () => levels.enterPlace(key))) walk(() => levels.enterPlace(key), 260, 0, true);
  }
  const map = mountHouseMap(scope, { levels, dialogs, travel, i18n });
  mountPlayersOnline(scope, { i18n });
  const cinema = mountCinema(scope, { storage, reducedMotion: () => Boolean(preferences?.reducedMotion), i18n });
  const paperSounds = mountPaperSounds({ game, audio });
  scope.add(() => paperSounds.dispose());
  const caseFile = mountCaseFile(scope, { levels, dialogs, storage, sounds: paperSounds, reducedMotion: () => Boolean(preferences?.reducedMotion), isBusy: () => transitions.busy || walking || levels.loading || cinema.busy, i18n });
  // the end of the Steam demo, once its rooms are all solved
  const demoEnd = mountDemoEnd(scope, { levels, storage, i18n, isOpen: () => dialogs.isOpen, isBusy: () => transitions.busy || walking || levels.loading || cinema.busy || caseFile.busy, reducedMotion: () => Boolean(preferences?.reducedMotion) });
  // A new case opens with the supplied film, then dissolves directly onto
  // the Inspector's desk. Each run owns its listeners and media playback.
  let prologueOn = false;
  let openingScope = null;
  stopOpening = () => { openingScope?.dispose(); openingScope = null; prologueOn = false; };
  scope.add(stopOpening);
  // `replay`: the film asked for again from the desk; the desk it is played
  // over stays until the film has covered it, then goes
  function openCase({ replay = false } = {}) {
    if (!replay && (prologueOn || caseFile.has('invitation'))) return;
    prologueOn = true;
    const previous = replay ? openingScope : null;
    const opening = openingScope = new Scope();
    if (previous) opening.add(() => previous.dispose());
    const prologue = async () => {
      await preloadPrologueDesk();
      if (opening.closed) return;
      return playPrologue(opening, {
        deferInteraction: true,
        reducedMotion: preferences?.reducedMotion,
        revealImmediately: true,
        sounds: paperSounds,
        i18n,
        onReplay: () => { if (openingScope === opening) openCase({ replay: true }); },
        // A plain black covers the desk before the manor appears.
        onDone: async (dismiss) => {
          caseFile.unlock('invitation');
          showDoorTasks();
          // come to the manor from the desk: the game is under way, so no
          // menu over it, only the door, until he has gone in
          start.classList.add('is-arriving');
          updateTitle();
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
    playIntroVideo(opening, { game, audio, reducedMotion: Boolean(preferences?.reducedMotion), onUnder: prologue, i18n,
      replay, onCovered: () => previous?.dispose() });
  }
  // The game opens on the manor and its menu (startMenu.js); the case is
  // opened — the film, then the desk — by New game.
  // In front of the house, until he first goes in: tonight's tasks carried on
  // from the desk, in the index on the right — those done struck through, and
  // the way in the one left to do (tasks.js, styled as the desk's panel).
  // gone in before? (the first chapter is shown on the first time in, cinema.js)
  const hasEntered = () => {
    if (storage.getItem('house:entered')) return true;
    try { return JSON.parse(storage.getItem('story:seen') || '[]').includes('chapter:1'); } catch { return false; }
  };
  // a game to go back to: the letter read at the desk, or the house gone into
  const hasBegun = () => caseFile.has('invitation') || hasEntered();
  // (in dev mode the house can always be gone into)
  const canContinue = () => hasBegun() || isDevMode();
  function showDoorTasks() {
    if (doorTasks || hasEntered()) return;
    const host = byId('index-outside');
    if (!host) return;
    doorTasks = taskCard([
      ['letter', i18n ? i18n.t('tasks.letter') : 'Read the letter'],
      ['file', i18n ? i18n.t('tasks.file') : 'Open the case file'],
      ['house', i18n ? i18n.t('tasks.house') : 'Go to Ashcombe Manor'],
      ['door', i18n ? i18n.t('tasks.enterDoor') : 'Click on the door to enter the manor'],
    ], { i18n });
    for (const done of ['letter', 'file', 'house']) doorTasks.tick(done);
    const list = document.createElement('div');
    list.className = 'outside-tasks';
    const label = document.createElement('p');
    label.className = 'outside-label';
    label.dataset.i18n = 'tasks.tonight';
    label.textContent = i18n ? i18n.t('tasks.tonight') : 'Tonight';
    list.append(label, doorTasks.node);
    host.querySelector('.outside-story')?.after(list);
  }
  if (caseFile.has('invitation')) showDoorTasks();
  const glass = mountMagnifier(scope, game);
  mountAmbience(scope, { game, levels, audio });
  mountTooltips(scope, i18n);
  mountLookAround(scope, game);
  scope.on(byId('btn-map'), 'click', event => { if (!transitions.busy) map.open(event.currentTarget); });
  scope.on(byId('btn-close-map'), 'click', () => dialogs.close());
  scope.on(byId('btn-casefile'), 'click', event => { if (!transitions.busy) caseFile.open(event.currentTarget); });
  // M the map, C the case file, Z the glass; Esc the way back. Never while
  // something is being typed, nor before the house has been come into.
  scope.on(window, 'keydown', event => {
    // (an Esc that has just closed a dialog is spent)
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
    if (event.target.matches?.('input, textarea, select') || !start.classList.contains('hidden')) return;
    if (dialogs.isOpen || transitions.busy || walking) return;
    const key = event.key.toLowerCase();
    if (key === 'm') { event.preventDefault(); map.open(byId('btn-map')); }
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

  let composingAnswer = false;
  scope.on(input, 'compositionstart', () => { composingAnswer = true; });
  scope.on(input, 'compositionend', () => { composingAnswer = false; });
  scope.on(byId('btn-submit'), 'click', () => {
    if (transitions.busy || levels.loading || dialogs.isOpen || composingAnswer) return;
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
      // the answer struck home: sparks off the puzzle's things, a winding ribbon
      // of them into the code box, the screen shaken once (solveStrike.js)
      const glowMs = playSolveStrike(levels.activeScene, { reducedMotion: Boolean(preferences?.reducedMotion) });
      // (the strike lights the box itself; without it, the ink sets as before)
      if (!glowMs) { input.classList.add('success-flash', 'ink-sets'); scope.later(() => input.classList.remove('success-flash', 'ink-sets'), 1200); }
      if (result.nextIndex === null) {
        completion.show();
        audio.playSuccess();
      } else {
        audio.playSuccess();
        // a moment for the answer to be seen accepted, then back out to the
        // room, which opens on the thing just solved and draws back from it
        if (onStage) game.events.emit(HOUSE_SOLVED, solvedId); // nowhere to go back to: the place itself takes note
        else if (home) walk(() => levels.enterPlace(home.key, { level: solvedId }), 300, Math.max(700, glowMs - 200), true);
        else navigate(result.nextIndex, { caption: i18n ? i18n.t('veil.caption') : 'Answer accepted' });
      }
      // (the answer stays in the box until the strike has lit it)
      if (glowMs) scope.later(() => { input.value = ''; }, Math.max(0, glowMs - 250));
      else input.value = '';
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
  scope.on(input, 'keydown', e => {
    if (e.isComposing || composingAnswer || e.keyCode === 229) return;
    if (e.key === 'Enter') { e.preventDefault(); byId('btn-submit').click(); }
  });
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

  // everything forgotten: the house as it was before the letter came
  function resetProgress() {
    travelLife.dispose(); travelLife = new Scope(); walking = false; entering = [];
    stopOpening();
    completion.hide();
    dialogs.closeAll();
    transitions.dispose();
    hintUI.reset();
    progressUI.reset();
    levels.reset();
    caseFile.reset();
    demoEnd.reset();
    cinema.reset();
    storage.removeItem('house:entered');
    // tonight's tasks, left from the game being forgotten
    if (doorTasks) { doorTasks.node.parentElement?.remove(); doorTasks = null; }
  }
  // the settings' reset: back out to the manor and its menu, to begin again
  const reset = mountResetConfirmation(scope, byId('btn-new'), {
    isBlocked: () => transitions.busy,
    onConfirm() {
      resetProgress();
      goOutside();
    },
    i18n,
  });
  // the credits: over the settings
  scope.on(byId('btn-credits'), 'click', event => { reset.disarm(); dialogs.open('credits-modal', event.currentTarget, { nested: true }); });
  scope.on(byId('btn-close-credits'), 'click', () => dialogs.close());
  scope.on(byId('btn-options'), 'click', event => { reset.disarm(); dialogs.open('options-modal', event.currentTarget); });
  scope.on(byId('btn-close-options'), 'click', () => { reset.disarm(); dialogs.close(); });

  // ── The menu before the manor ──
  // New game: the manor goes to black and the case opens — the film, the
  // desk, then the manor again with its story — over a game forgotten, if
  // there was one. Continue: up to the door and in. Options: the settings.
  let darkening = false;
  function newGame() {
    if (darkening || started || prologueOn || transitions.busy || walking || dialogs.isOpen) return;
    darkening = true;
    const begun = hasBegun();
    const black = document.createElement('div');
    black.className = 'start-black';
    document.body.append(black);
    document.body.classList.add('start-darkening');
    const open = () => {
      if (begun) resetProgress();
      // the film's own black is laid over this one, and then it goes
      openCase();
      requestAnimationFrame(() => requestAnimationFrame(() => {
        black.remove();
        document.body.classList.remove('start-darkening');
        darkening = false;
      }));
    };
    if (preferences?.reducedMotion || !black.animate) { open(); return; }
    black.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 750, easing: 'cubic-bezier(.4, 0, .6, 1)', fill: 'forwards' })
      .finished.then(open, open);
  }
  const menu = mountStartMenu(scope, {
    game,
    audio,
    i18n,
    canContinue,
    hasProgress: hasBegun,
    isBlocked: () => darkening || started || prologueOn || transitions.busy || walking || cinema.busy || start.classList.contains('hidden'),
    onNewGame: newGame,
    onContinue: event => begin(event),
    onOptions: button => { reset.disarm(); dialogs.open('options-modal', button); },
    // the house's sounds die away behind the black, and come back with it
    onExit: () => { if (game.sound) game.sound.volume = 0; },
    onReturn: () => audio.refreshMasterVolume(),
    onDevMode: () => updateTitle(),
  });
  updateTitle = () => {
    menu.refresh();
    // the front door waits until a game has been begun
    start.classList.toggle('is-fresh', !canContinue());
  };
  updateTitle();
  // a first evening: the desk got ready while the menu is read
  if (!canContinue()) void preloadPrologueDesk();
  mountAudioControls(audio, scope, i18n);
  // while the code box has the on-screen keyboard up, the room waits to be repainted
  observeViewport(game, scope, { defer: () => touch && document.activeElement === input });

  if (i18n) {
    applyI18nToDOM(i18n);
    scope.add(i18n.subscribe(() => {
      applyI18nToDOM(i18n);
      document.title = i18n.t('start.title');
      answerFeedback();
      progressUI.render();
      hintUI.render?.();
      doorTasks?.refresh();
    }));
  }

  return { navigate, showGame, get busy() { return transitions.busy || walking || levels.loading; },
    dispose() { transitions.dispose(); dialogs.closeAll(); scope.dispose(); } };
}
