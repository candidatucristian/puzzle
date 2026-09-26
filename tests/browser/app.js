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
