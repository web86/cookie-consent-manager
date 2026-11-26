// Local fixture: capture the exact script element at execution time; no network/SDK calls.
(() => {
  const script = document.currentScript;
  (window.__customScriptRuns ||= []).push({
    path: new URL(script.src).pathname,
    attributes: Object.fromEntries(script.getAttributeNames().filter(name => name.startsWith('data-')).map(name => [name, script.getAttribute(name)])),
    async: script.async
  });
})();
