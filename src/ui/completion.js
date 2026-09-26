/** Owns the delayed completion screen and cancels it on navigation. */
export function createCompletion(scope, { levels, getSessionStart, onReplay, onFirst }) {
  const byId = id => document.getElementById(id);
  const screen = byId('completion-screen');
  let timer;

  function hide() {
    scope.cancel(timer);
    screen.classList.add('hidden');
  }

  function show() {
    scope.cancel(timer);
    timer = scope.later(() => {
      const count = levels.definitions.length;
      byId('completion-chambers').textContent = `${count} / ${count}`;
      const start = getSessionStart();
      const seconds = Math.max(0, Math.floor((start ? Date.now() - start : 0) / 1000));
      byId('completion-time').textContent = `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`;
      screen.classList.remove('hidden');
      byId('btn-completion-first').focus();
    }, 650);
  }

  scope.on(byId('btn-completion-replay'), 'click', onReplay);
  scope.on(byId('btn-completion-first'), 'click', onFirst);
  scope.on(byId('btn-completion-close'), 'click', hide);
  scope.add(hide);
  return { show, hide };
}
