/** Read the instance booted by the page, including Vite's versioned module URL. */
export function evaluateApp(page, callback, arg) {
  return page.evaluate(async ({ source, arg }) => {
    const entry = [...document.querySelectorAll('script[type="module"][src]')]
      .find(script => new URL(script.src).pathname === '/src/entry.js');
    if (!entry) throw new Error('The application entry script is missing.');
    const app = await (await import(entry.src)).ready;
    if (!app) throw new Error('The application failed to start.');
    return new Function('app', 'arg', `return (${source})(app, arg)`)(app, arg);
  }, { source: callback.toString(), arg });
}

export async function openHints(page, { tap = false } = {}) {
  const drawer = page.locator('#right-sidebar-wrapper');
  if (!await drawer.evaluate(element => element.classList.contains('drawer-open'))) {
    const menu = page.locator('#compact-menu');
    if (tap) await menu.tap();
    else await menu.click();
  }
  const trigger = page.locator('#btn-brief-hints');
  if (tap) await trigger.tap();
  else await trigger.click();
}
