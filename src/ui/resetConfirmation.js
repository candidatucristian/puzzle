/** A second click within four seconds confirms a reset. */
export function mountResetConfirmation(scope, button, { isBlocked, onConfirm }) {
  let armed = false;
  let timer;
  const label = button.querySelector('[data-reset-label]') || button;
  const initialLabel = label.textContent;
  button.setAttribute('aria-live', 'polite');

  function disarm() {
    armed = false;
    scope.cancel(timer);
    button.classList.remove('armed');
    label.textContent = initialLabel;
  }

  scope.on(button, 'click', () => {
    if (isBlocked()) return;
    if (armed) {
      disarm();
      onConfirm();
      return;
    }
    armed = true;
    button.classList.add('armed');
    label.textContent = 'Confirm reset';
    timer = scope.later(disarm, 4000);
  });
  scope.on(button, 'blur', disarm);
  scope.add(disarm);
  return { disarm };
}
