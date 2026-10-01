export function mountInteractionFeedback(scope, game) {
  const stage = document.getElementById('game-container');
  const cue = document.getElementById('interaction-cue');
  const pulse = document.getElementById('interaction-pulse');
  let timer, hoveredDom;
  function feedback({ label, pressed, x, y }) {
    cue.textContent = label;
    cue.hidden = !label;
    if (pressed) {
      pulse.style.left = `${x}px`; pulse.style.top = `${y}px`;
      pulse.classList.remove('visible');
      // Restart the short acknowledgement even on repeated presses.
      void pulse.offsetWidth;
      pulse.classList.add('visible');
      scope.cancel(timer); timer = scope.later(() => pulse.classList.remove('visible'), 220);
    }
  }
  function sceneFeedback(detail) {
    // Phaser's canvas-out event can arrive after the over event of a DOM object.
    if (hoveredDom?.isConnected && !detail.pressed) return;
    feedback(detail);
  }
  game.events.on('puzzle:interaction', sceneFeedback);
  scope.add(() => game.events.off('puzzle:interaction', sceneFeedback));
  const interactive = e => e.target.closest?.('[data-interaction], button, [role="button"]');
  scope.on(stage, 'pointerover', e => {
    const target = interactive(e);
    if (!target || target.disabled) return;
    hoveredDom = target;
    target.classList.add('scene-interactive');
    feedback({ label: target.dataset.interaction || target.getAttribute('aria-label') || 'Click to interact' });
  });
  scope.on(stage, 'pointerout', e => {
    const target = interactive(e);
    if (target && !target.contains(e.relatedTarget)) { hoveredDom = null; feedback({ label: '' }); }
  });
  scope.on(stage, 'pointerdown', e => {
    const target = interactive(e);
    if (!target || target.disabled) return;
    const box = stage.getBoundingClientRect();
    feedback({ label: target.dataset.interaction || target.getAttribute('aria-label') || 'Click to interact', pressed: true, x: e.clientX - box.left, y: e.clientY - box.top });
  });
}
