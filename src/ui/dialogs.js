export function createDialogs(scope, { onOpen } = {}) {
  let active = null, opener = null;
  const parents = [];
  const focusable = element => [...element.querySelectorAll('button, input, select, textarea, a[href], [tabindex="0"]')]
    .filter(el => !el.disabled && el.getClientRects().length);
  const api = {
    get isOpen() { return !!active; },
    open(id, trigger = document.activeElement, { nested = false } = {}) {
      onOpen?.();
      if (active && nested) {
        parents.push({ dialog: active, opener });
        active.classList.add('hidden');
      } else api.closeAll();
      active = document.getElementById(id);
      // Opening from a drawer closes it; return to its visible trigger later.
      opener = trigger?.closest('[inert]') ? document.activeElement : trigger;
      active.setAttribute('role', 'dialog'); active.setAttribute('aria-modal', 'true');
      const heading = active.querySelector('h2');
      if (heading) { heading.id ||= id + '-title'; active.setAttribute('aria-labelledby', heading.id); }
      active.classList.remove('hidden'); focusable(active)[0]?.focus();
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
      else document.documentElement.classList.remove('has-open-dialog');
      if (returnFocus?.isConnected) returnFocus.focus();
    },
    closeAll() {
      if (!active) return;
      active.classList.add('hidden');
      const returnFocus = parents.length ? parents[0].opener : opener;
      parents.length = 0;
      active = null; opener = null;
      document.documentElement.classList.remove('has-open-dialog');
      if (returnFocus?.isConnected) returnFocus.focus();
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
  return api;
}
