import { Scope } from '../shared/Scope.js';

export function createTransitions({ levels, showGame, onNavigate, preferences }) {
  const veil = document.getElementById('level-veil');
  const caption = document.getElementById('veil-caption');
  const numeral = document.getElementById('veil-numeral');
  const roman = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI'];
  let scope = new Scope(), busy = false;
  return {
    get busy() { return busy; },
    go(index, options = {}) {
      if (!levels.canAccess(index)) return false;
      onNavigate();
      const wasBusy = busy;
      scope.dispose(); scope = new Scope(); busy = true;
      if (preferences?.reducedMotion) {
        veil.classList.remove('cover', 'titled');
        showGame(); levels.navigate(index); busy = false;
        return true;
      }
      caption.textContent = options.caption || '';
      caption.style.display = options.caption ? '' : 'none';
      numeral.textContent = roman[index] || String(index + 1);
      veil.classList.remove('titled'); veil.classList.add('cover');
      scope.later(() => {
        showGame(); levels.navigate(index);
        if (!options.quick) veil.classList.add('titled');
        scope.later(() => {
          veil.classList.remove('cover', 'titled');
          scope.later(() => { busy = false; }, 650);
        }, options.quick ? 350 : options.caption ? 2100 : 1500);
      }, wasBusy ? 0 : 600);
      return true;
    },
    dispose() { scope.dispose(); veil.classList.remove('cover', 'titled'); busy = false; },
  };
}
