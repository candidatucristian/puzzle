/** Read the instance booted by the page, including Vite's versioned module URL. */
export function evaluateApp(page, callback, arg) {
  return page.evaluate(async ({ source, arg }) => {
    let app = window.__descipher;
    if (!app) {
      const entry = [...document.querySelectorAll('script[type="module"][src]')]
        .find(script => new URL(script.src).pathname.endsWith('/entry.js') || /assets\/index-[^/]+\.js/.test(new URL(script.src).pathname));
      if (entry) {
        app = await (await import(entry.src)).ready;
      }
    }
    if (!app) throw new Error('The application failed to start.');
    return new Function('app', 'arg', `return (${source})(app, arg)`)(app, arg);
  }, { source: callback.toString(), arg });
}

export async function openHints(page, { tap = false } = {}) {
  const btn = page.locator('#btn-hint');
  if (await btn.count() > 0 && await btn.isVisible()) {
    const drawer = page.locator('#right-sidebar-wrapper');
    const isOpen = await drawer.evaluate(el => el.classList.contains('drawer-open')).catch(() => false);
    if (!isOpen) {
      if (tap) await btn.tap();
      else await btn.click();
    }
    return;
  }
  const drawer = page.locator('#right-sidebar-wrapper');
  if (await drawer.count() > 0 && !await drawer.evaluate(element => element.classList.contains('drawer-open'))) {
    const menu = page.locator('#compact-menu');
    if (await menu.count() > 0 && await menu.isVisible()) {
      if (tap) await menu.tap();
      else await menu.click();
    }
  }
  const trigger = page.locator('#btn-brief-hints, #btn-hint');
  if (tap) await trigger.tap();
  else await trigger.click();
}
