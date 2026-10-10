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
  // The veil closes, `arrive` changes what is behind it, the veil opens. A
  // level is announced by its numeral; a place of the house has none, and
  // is simply walked into.
  function pass(arrive, title, options) {
    onNavigate();
    const wasBusy = busy;
    scope.dispose(); scope = new Scope(); busy = true;
    const change = () => {
      options.onBeforeNavigate?.();
      showGame(); arrive();
      if (!options.quick && title) veil.classList.add('titled');
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
          showGame(); arrive(); busy = false;
        }, options.coverDelay);
      } else {
        options.onBeforeNavigate?.();
        showGame(); arrive(); busy = false;
      }
      return true;
    }
    caption.textContent = options.caption || '';
    caption.style.display = options.caption ? '' : 'none';
    numeral.textContent = title;
    veil.classList.remove('titled'); veil.classList.add('cover');
    scope.later(() => {
      if (options.coverDelay) scope.later(change, options.coverDelay);
      else change();
    }, wasBusy ? 0 : 600);
    return true;
  }
  return {
    get busy() { return busy; },
    go(index, options = {}) {
      if (!levels.canAccess(index)) return false;
      return pass(() => levels.navigate(index), toRoman(index + 1), options);
    },
    /** Walk into a place of the house. */
    enter(key, options = {}) {
      return pass(() => levels.enterPlace(key), '', { quick: !options.caption, ...options });
    },
    dispose() { scope.dispose(); veil.classList.remove('cover', 'titled'); busy = false; },
  };
}
