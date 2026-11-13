// "Players online", at the top bar's left. For now only its look: there is no
// server to count the games open (the game is static files), so it shows a
// sample number while the game runs in development, and stays hidden in the
// published game rather than show players a number that is not true. To make
// it real, call show() with the count from a presence service.

const SAMPLE = 1;
const NUMBER_LOCALES = { en: 'en-GB', ro: 'ro-RO', ru: 'ru-RU', 'zh-Hans': 'zh-CN', fr: 'fr-FR', es: 'es-ES' };

export function mountPlayersOnline(scope, { i18n = null } = {}) {
  const box = document.getElementById("players-online");
  const count = document.getElementById("players-online-count");
  if (!box || !count) return { show() {} };
  let shown = null;
  const write = () => {
    if (shown === null) return;
    count.textContent = shown.toLocaleString(NUMBER_LOCALES[i18n?.language] || NUMBER_LOCALES.en);
  };
  const show = (n) => {
    shown = Math.max(0, Math.round(n));
    write();
    box.hidden = false;
  };
  if (i18n) scope.add(i18n.subscribe(write));
  if (import.meta.env?.DEV) show(SAMPLE);
  return { show };
}
