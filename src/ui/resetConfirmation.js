/** A second click within four seconds confirms a reset. */
export function mountResetConfirmation(scope, button, { isBlocked, onConfirm }) {
  let armed = false;
  let timer;

  function disarm() {
    armed = false;
    scope.cancel(timer);
    button.classList.remove('armed');
    button.innerText = 'RESET GAME';
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
    button.innerText = 'CLICK AGAIN TO CONFIRM';
    timer = scope.later(disarm, 4000);
  });
  scope.add(disarm);
  return { disarm };
}
