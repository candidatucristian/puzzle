/** The hints for the puzzle in hand. The Hint button slides the drawer out
 *  from the left (mobile.js keeps the drawer); the first hint is revealed as
 *  it opens, and each further one only when asked for. */
export function mountHints(scope, { levels, hints, i18n = null }) {
  const list = document.getElementById('hint-list');
  const next = document.getElementById('btn-next-hint');
  const count = document.getElementById('hint-count');
  let roomId;

  function render() {
    const level = levels.definitions[levels.currentIndex];
    const revealed = hints.count(level.id);
    document.getElementById('brief-level-name').textContent = level.name;
    const existing = roomId === level.id ? list.children.length : 0;
    if (roomId !== level.id) list.replaceChildren();
    roomId = level.id;
    for (let i = existing; i < revealed; i++) {
      const item = document.createElement('li');
      const label = document.createElement('span');
      label.className = 'hint-step-label';
      label.textContent = i18n ? i18n.t('hints.step', { n: i + 1 }) : `Hint ${i + 1}`;
      const text = document.createElement('p');
      text.textContent = (i18n ? i18n.getHint(level.id, i) : null) || level.hint.steps[i];
      item.append(label, text);
      list.append(item);
    }
    count.textContent = i18n
      ? i18n.t('hints.revealedCount', { revealed, total: level.hint.steps.length })
      : `${revealed} of ${level.hint.steps.length} hints revealed`;
    next.disabled = revealed === level.hint.steps.length;
    next.textContent = next.disabled
      ? (i18n ? i18n.t('hints.allRevealed') : 'All hints revealed')
      : (i18n ? i18n.t('hints.revealNext', { n: revealed + 1 }) : `Reveal hint ${revealed + 1}`);
    const requirements = document.getElementById('current-requirements');
    const legacyRequires = document.getElementById('info-requires');
    requirements.replaceChildren();
    requirements.hidden = !level.hint.sound && !level.hint.tool;
    if (legacyRequires) {
      legacyRequires.replaceChildren();
      legacyRequires.hidden = requirements.hidden;
    }
    const soundText = i18n ? i18n.t('hints.listening') : 'Listening';
    const toolText = i18n ? i18n.t('hints.reference') : 'Reference may help';
    for (const [needed, text] of [[level.hint.sound, soundText], [level.hint.tool, toolText]]) {
      if (!needed) continue;
      const badge = document.createElement('span');
      badge.className = 'info-badge'; badge.textContent = text;
      requirements.append(badge);
      if (legacyRequires) legacyRequires.append(badge.cloneNode(true));
    }
  }

  // opening the drawer shows the first hint at once
  scope.on(document.getElementById('btn-hint'), 'click', () => {
    const id = levels.definitions[levels.currentIndex].id;
    if (!hints.count(id)) hints.reveal(id);
    render();
  });
  scope.on(next, 'click', () => {
    hints.reveal(levels.definitions[levels.currentIndex].id);
    render();
    list.lastElementChild?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    if (next.disabled) document.querySelector('#right-sidebar-wrapper [data-close-drawer]').focus();
  });
  scope.add(levels.subscribe(render));
  if (i18n) scope.add(i18n.subscribe(() => { roomId = undefined; list.replaceChildren(); render(); }));
  render();
  return {
    render,
    reset() { roomId = undefined; list.replaceChildren(); hints.reset(); render(); },
  };
}
