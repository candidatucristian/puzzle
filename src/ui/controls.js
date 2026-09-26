import { createCompletion } from './completion.js';
import { mountResetConfirmation } from './resetConfirmation.js';
import { Scope } from '../shared/Scope.js';
import { observeViewport } from '../shared/viewport.js';
import { createTransitions } from './transitions.js';
import { createIntro } from './intro.js';
import { createDialogs } from './dialogs.js';
import { mountAudioControls } from './audioControls.js';
import { mountStartParticles } from './particles.js';

export function mountUI(game, { levels, audio, storage }) {
  const scope = new Scope(), byId = id => document.getElementById(id);
  const start = byId('start-screen');
  const input = byId('level-code');
  const intro = createIntro(), dialogs = createDialogs(scope);
  let started = false;
  let sessionStart = null;
  const mobile = /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent) ||
    (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1) || matchMedia('(pointer: coarse)').matches;
  if (mobile) byId('mobile-block').classList.remove('hidden');

  function showGame() {
    start.classList.add('hidden'); storage.setItem('hasPlayedBefore', 'true');
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
  const transitions = createTransitions({ levels, showGame, onNavigate: completion.hide });
  const navigate = (index, options) => transitions.go(index, options);
  function renderLevels() {
    const grid = byId('levels-grid'); grid.replaceChildren();
    levels.definitions.forEach((level, i) => {
      const tile = document.createElement('div'), allowed = levels.canAccess(i);
      tile.innerText = i + 1;
      tile.className = 'level-btn ' + (allowed ? i === levels.currentIndex ? 'current' : 'unlocked' : 'locked');
      tile.setAttribute('role', 'button'); tile.tabIndex = allowed ? 0 : -1;
      tile.setAttribute('aria-label', `Level ${i + 1}: ${level.name}`);
      tile.setAttribute('aria-disabled', String(!allowed));
      if (i === levels.currentIndex) tile.setAttribute('aria-current', 'step');
      if (allowed) {
        tile.onclick = () => { if (!intro.active) navigate(i); };
        tile.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tile.click(); } };
      }
      grid.append(tile);
    });
  }
  scope.add(levels.subscribe(renderLevels)); renderLevels();
  function begin() {
    if (mobile || started || dialogs.isOpen || start.classList.contains('hidden')) return;
    started = true; sessionStart = Date.now();
    if (!storage.getItem('hasPlayedBefore')) intro.play(() => navigate(levels.currentIndex));
    else navigate(levels.currentIndex);
  }
  scope.on(window, 'keydown', begin); scope.on(start, 'click', begin);
  mountStartParticles({ scope, startScreen: start, disabled: mobile });

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
  scope.on(byId('btn-info'), 'click', () => {
    const hint = levels.definitions[levels.currentIndex].hint;
    byId('info-text').innerText = hint.text;
    const requirements = byId('info-requires'); requirements.replaceChildren(); requirements.hidden = !hint.sound && !hint.tool;
    function badge(icon, text, title) {
      const element = document.createElement('span'); element.className = 'info-badge'; element.title = title;
      const symbol = document.createElement('span'); symbol.setAttribute('aria-hidden', 'true'); symbol.textContent = icon;
      const label = document.createElement('span'); label.textContent = text; element.append(symbol, label); requirements.append(element);
    }
    if (hint.sound) badge('🔊', 'SOUND', 'This level requires listening to sound');
    if (hint.tool) badge('🔧', 'TOOL', 'This level requires a measuring tool');
    dialogs.open('info-modal');
  });
  scope.on(byId('btn-close-info'), 'click', () => dialogs.close());
  mountAudioControls(audio, scope); observeViewport(game, scope);
  return { navigate, showGame, get busy() { return transitions.busy || intro.active; },
    dispose() { transitions.dispose(); intro.dispose(); dialogs.close(); scope.dispose(); } };
}
