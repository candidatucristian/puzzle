export function createDialogs(scope) {
  let active = null, opener = null;
  const focusable = element => [...element.querySelectorAll('button, input, a[href], [tabindex="0"]')]
    .filter(el => !el.disabled && el.getClientRects().length);
  const api = {
    get isOpen() { return !!active; },
    open(id, trigger = document.activeElement) {
      if (active) api.close();
      active = document.getElementById(id); opener = trigger;
      active.setAttribute('role', 'dialog'); active.setAttribute('aria-modal', 'true');
      const heading = active.querySelector('h2');
      if (heading) { heading.id ||= id + '-title'; active.setAttribute('aria-labelledby', heading.id); }
      active.classList.remove('hidden'); focusable(active)[0]?.focus();
    },
    close() {
      if (!active) return;
      active.classList.add('hidden'); active = null;
      if (opener?.isConnected) opener.focus(); opener = null;
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
