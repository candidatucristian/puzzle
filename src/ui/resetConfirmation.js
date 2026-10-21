/** A second click within four seconds confirms a reset. */
export function mountResetConfirmation(scope, button, { isBlocked, onConfirm, i18n = null }) {
  let armed = false;
  let timer;
  const label = button.querySelector('[data-reset-label]') || button;
  const getInitialLabel = () => (i18n ? i18n.t('settings.reset') : 'Reset game');
  button.setAttribute('aria-live', 'polite');

  function disarm() {
    armed = false;
    scope.cancel(timer);
    button.classList.remove('armed');
    label.textContent = getInitialLabel();
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
    label.textContent = i18n ? i18n.t('settings.resetConfirm') : 'Confirm reset';
    timer = scope.later(disarm, 4000);
  });
  scope.on(button, 'blur', disarm);
  if (i18n) scope.add(i18n.subscribe(disarm));
  scope.add(disarm);
  return { disarm };
}
