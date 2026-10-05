export function createDialogs(scope, { onOpen, onClose } = {}) {
  let active = null, opener = null;
  const parents = [];
  const visible = element => element?.isConnected && !element.closest('[inert]') &&
    element.getClientRects().length && getComputedStyle(element).visibility === 'visible';
  const focusable = element => [...element.querySelectorAll('button, input, select, textarea, a[href], [tabindex]')]
    .filter(el => el.tabIndex >= 0 && !el.matches(':disabled') && visible(el));
  function focusDialog() {
    if (!active) return;
    const first = focusable(active)[0];
    if (first) first.focus();
    else { active.tabIndex = -1; active.focus(); }
  }
  const api = {
    get isOpen() { return !!active; },
    open(id, trigger = document.activeElement, { nested = false } = {}) {
      const target = document.getElementById(id);
      if (!target || target === active) return;
      if (active && nested) {
        parents.push({ dialog: active, opener });
        active.classList.add('hidden');
      } else api.closeAll();
      onOpen?.();
      active = target;
      // Opening from a drawer closes it; return to its visible trigger later.
      opener = trigger?.closest('[inert]') ? document.activeElement : trigger;
      active.setAttribute('role', 'dialog'); active.setAttribute('aria-modal', 'true');
      const heading = active.querySelector('h2');
      if (heading) { heading.id ||= id + '-title'; active.setAttribute('aria-labelledby', heading.id); }
      active.classList.remove('hidden'); focusDialog();
      document.documentElement.classList.add('has-open-dialog');
    },
    close() {
      if (!active) return;
      active.classList.add('hidden');
      const returnFocus = opener;
      const parent = parents.pop();
      active = parent?.dialog ?? null;
      opener = parent?.opener ?? null;
      if (active) active.classList.remove('hidden');
      else {
        document.documentElement.classList.remove('has-open-dialog');
        onClose?.();
      }
      if (visible(returnFocus)) returnFocus.focus();
      else focusDialog();
    },
    closeAll() {
      if (!active) return;
      active.classList.add('hidden');
      const returnFocus = parents.length ? parents[0].opener : opener;
      parents.length = 0;
      active = null; opener = null;
      document.documentElement.classList.remove('has-open-dialog');
      onClose?.();
      if (visible(returnFocus)) returnFocus.focus();
    },
  };
  scope.on(document, 'keydown', e => {
    if (!active) return;
    if (e.key === 'Escape') { e.preventDefault(); api.close(); }
    if (e.key === 'Tab') {
      const nodes = focusable(active); if (!nodes.length) { e.preventDefault(); return; }
      const i = nodes.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); nodes.at(-1).focus(); }
      else if (!e.shiftKey && (i < 0 || i === nodes.length - 1)) { e.preventDefault(); nodes[0].focus(); }
    }
  });
  scope.add(() => api.closeAll());
  return api;
}
