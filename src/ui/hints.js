export function mountHints(scope, { levels, hints, dialogs }) {
  const list = document.getElementById('hint-list');
  const next = document.getElementById('btn-next-hint');
  const count = document.getElementById('hint-count');
  let roomId;

  function render() {
    const level = levels.definitions[levels.currentIndex];
    const revealed = hints.count(level.id);
    document.getElementById('current-level-number').textContent = `ROOM ${String(levels.currentIndex + 1).padStart(2, '0')}`;
    document.getElementById('brief-level-name').textContent = level.name;
    document.getElementById('current-level-summary').textContent = level.summary;
    document.getElementById('current-hint-count').textContent = `${revealed} of ${level.hint.steps.length} hints revealed`;
    const existing = roomId === level.id ? list.children.length : 0;
    if (roomId !== level.id) list.replaceChildren();
    roomId = level.id;
    document.getElementById('hint-room').textContent = `Level ${levels.currentIndex + 1} · ${level.name}`;
    for (let i = existing; i < revealed; i++) {
      const item = document.createElement('li');
      const label = document.createElement('span');
      label.className = 'hint-step-label';
      label.textContent = ['A direction', 'A connection', 'A way forward'][i];
      const text = document.createElement('p');
      text.textContent = level.hint.steps[i];
      item.append(label, text);
      list.append(item);
    }
    count.textContent = `${revealed} of ${level.hint.steps.length} hints revealed`;
    next.disabled = revealed === level.hint.steps.length;
    next.textContent = next.disabled ? 'All hints revealed' : `Reveal hint ${revealed + 1}`;
    const requirements = document.getElementById('info-requires');
    requirements.replaceChildren();
    const briefRequirements = document.getElementById('current-requirements');
    briefRequirements.replaceChildren();
    requirements.hidden = !level.hint.sound && !level.hint.tool;
    for (const [needed, text] of [[level.hint.sound, 'Listening'], [level.hint.tool, 'Reference may help']]) {
      if (!needed) continue;
      const badge = document.createElement('span');
      badge.className = 'info-badge'; badge.textContent = text;
      requirements.append(badge);
      briefRequirements.append(badge.cloneNode(true));
    }
  }

  const openHints = () => {
    const id = levels.definitions[levels.currentIndex].id;
    if (!hints.count(id)) hints.reveal(id);
    render();
    dialogs.open('info-modal', document.getElementById('compact-menu'));
  };
  scope.on(document.getElementById('btn-brief-hints'), 'click', openHints);
  scope.on(next, 'click', () => {
    hints.reveal(levels.definitions[levels.currentIndex].id);
    render();
    list.lastElementChild?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    if (next.disabled) document.getElementById('btn-close-info').focus();
  });
  scope.on(document.getElementById('btn-close-info'), 'click', () => dialogs.close());
  scope.add(levels.subscribe(render));
  render();
  return { reset() { roomId = undefined; list.replaceChildren(); hints.reset(); render(); } };
}
