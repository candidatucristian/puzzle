import { createCompletion } from './completion.js';
import { mountResetConfirmation } from './resetConfirmation.js';
import { Scope } from '../shared/Scope.js';
import { observeViewport } from '../shared/viewport.js';
import { createTransitions } from './transitions.js';
import { createIntro } from './intro.js';
import { createDialogs } from './dialogs.js';
import { mountAudioControls } from './audioControls.js';
import { mountStartParticles } from './particles.js';
import { mountFullscreenControl } from './fullscreen.js';
import { mountComfort } from './comfort.js';
import { mountHints } from './hints.js';
import { mountProgress } from './progress.js';
import { mountInspection } from './inspection.js';
import { mountInteractionFeedback } from './interactions.js';

export function mountUI(game, { levels, audio, storage, preferences, hints }) {
  const scope = new Scope(), byId = id => document.getElementById(id);
  const start = byId('start-screen');
  const input = byId('level-code');
  let inspection;
  const intro = createIntro(preferences);
  const dialogs = createDialogs(scope, { onOpen: () => inspection?.close() });
  let started = false;
  let sessionStart = null;
  const mobile = /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent) ||
    (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1) || matchMedia('(pointer: coarse)').matches;
  if (mobile) byId('mobile-block').classList.remove('hidden');

  function showGame() {
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
  const transitions = createTransitions({ levels, showGame, preferences, onNavigate() { completion.hide(); inspection?.close(); } });
  const navigate = (index, options) => transitions.go(index, options);
  const progressUI = mountProgress(scope, {
    game, levels, storage, navigate,
    canNavigate: () => !intro.active && !dialogs.isOpen,
  });
  mountComfort(scope, preferences);
  const hintUI = mountHints(scope, { levels, hints, dialogs });
  inspection = mountInspection(scope, {
    levels,
    canOpen: () => !intro.active && !transitions.busy && !dialogs.isOpen && start.classList.contains('hidden'),
  });
  mountInteractionFeedback(scope, game);
  function begin(event) {
    if (event?.type === 'keydown' && ['Tab', 'Escape', 'Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) return;
    if (event?.type === 'keydown' && event.target !== document.body && !start.contains(event.target)) return;
    if (mobile || started || dialogs.isOpen || start.classList.contains('hidden')) return;
    started = true; sessionStart = Date.now();
    if (!storage.getItem('hasPlayedBefore')) intro.play(() => navigate(levels.currentIndex));
    else navigate(levels.currentIndex);
  }
  scope.on(window, 'keydown', begin); scope.on(start, 'click', begin);
  mountStartParticles({ scope, startScreen: start, disabled: mobile, preferences });
  mountFullscreenControl(scope, byId('btn-fullscreen'));

  scope.on(byId('btn-submit'), 'click', () => {
    if (transitions.busy || intro.active || dialogs.isOpen) return;
    const result = levels.submit(input.value);
    if (result.correct) {
      input.classList.add('success-flash'); scope.later(() => input.classList.remove('success-flash'), 1200);
      audio.playSuccess();
      if (result.isLast) completion.show();
      else navigate(result.nextIndex, { caption: 'Code Accepted' });
      input.value = '';
    } else if (input.value.trim()) {
      audio.playErrorSound(); input.classList.add('error-flash');
      scope.later(() => input.classList.remove('error-flash'), 1000);
    }
  });
  scope.on(input, 'keydown', e => { if (e.key === 'Enter') { e.preventDefault(); byId('btn-submit').click(); } });
  scope.on(byId('btn-replay'), 'click', () => { if (!intro.active) navigate(levels.currentIndex, { quick: true }); });

  const reset = mountResetConfirmation(scope, byId('btn-new'), {
    isBlocked: () => intro.active,
    onConfirm() {
      completion.hide();
      dialogs.close();
      transitions.dispose();
      inspection.close();
      hintUI.reset();
      progressUI.reset();
      levels.reset();
      started = true;
      sessionStart = Date.now();
      showGame();
      intro.play(() => navigate(0));
    },
  });
  scope.on(byId('btn-howto'), 'click', () => dialogs.open('howto-modal'));
  scope.on(byId('btn-close-howto'), 'click', () => dialogs.close());
  scope.on(byId('btn-options'), 'click', () => { reset.disarm(); dialogs.open('options-modal'); });
  scope.on(byId('btn-close-options'), 'click', () => { reset.disarm(); dialogs.close(); });
  mountAudioControls(audio, scope); observeViewport(game, scope);
  return { navigate, showGame, get busy() { return transitions.busy || intro.active; },
    dispose() { transitions.dispose(); intro.dispose(); dialogs.close(); scope.dispose(); } };
}
