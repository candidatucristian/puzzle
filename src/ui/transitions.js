import { Scope } from '../shared/Scope.js';

/** A level's number as the veil writes it: 1 → I, 49 → XLIX, any number. */
export function toRoman(n) {
  let out = '';
  for (const [value, mark] of [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]) {
    while (n >= value) { out += mark; n -= value; }
  }
  return out;
}

export function createTransitions({ levels, showGame, onNavigate, preferences }) {
  const veil = document.getElementById('level-veil');
  const caption = document.getElementById('veil-caption');
  const numeral = document.getElementById('veil-numeral');
  let scope = new Scope(), busy = false;
  return {
    get busy() { return busy; },
    go(index, options = {}) {
      if (!levels.canAccess(index)) return false;
      onNavigate();
      const wasBusy = busy;
      scope.dispose(); scope = new Scope(); busy = true;
      const changeLevel = () => {
        options.onBeforeNavigate?.();
        showGame(); levels.navigate(index);
        if (!options.quick) veil.classList.add('titled');
        scope.later(() => {
          veil.classList.remove('cover', 'titled');
          scope.later(() => { busy = false; }, 650);
        }, options.quick ? 350 : options.caption ? 2100 : 1500);
      };
      if (preferences?.reducedMotion) {
        veil.classList.remove('cover', 'titled');
        if (options.coverDelay) {
          scope.later(() => {
            options.onBeforeNavigate?.();
            showGame(); levels.navigate(index); busy = false;
          }, options.coverDelay);
        } else {
          options.onBeforeNavigate?.();
          showGame(); levels.navigate(index); busy = false;
        }
        return true;
      }
      caption.textContent = options.caption || '';
      caption.style.display = options.caption ? '' : 'none';
      numeral.textContent = toRoman(index + 1);
      veil.classList.remove('titled'); veil.classList.add('cover');
      scope.later(() => {
        if (options.coverDelay) scope.later(changeLevel, options.coverDelay);
        else changeLevel();
      }, wasBusy ? 0 : 600);
      return true;
    },
    dispose() { scope.dispose(); veil.classList.remove('cover', 'titled'); busy = false; },
  };
}
