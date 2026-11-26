/** Shared data-only Custom JS validation for Manager, registry and script loading. */
(() => {
  'use strict';
  const bytes = value => new TextEncoder().encode(value).length;
  function fromRows(rows) {
    if (rows.length > 20) throw Error('attributes_count');
    const result = {}, names = new Set();
    for (const [name, value] of rows) {
      // Reject noncanonical spelling consistently in PHP, Manager and public JS.
      if (typeof name !== 'string' || bytes(name) > 64 || (!/^data-[a-z0-9][a-z0-9_-]*$/.test(name) || /[\r\n]/.test(name))) throw Error('attributes_name');
      if (names.has(name)) throw Error('attributes_duplicate');
      names.add(name);
      if (typeof value !== 'string' || bytes(value) > 2048 || /[\x00-\x1f\x7f-\x9f]/.test(value) || /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(value)) throw Error('attributes_value');
      result[name] = value;
    }
    return Object.freeze(Object.fromEntries(Object.entries(result).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)));
  }
  function attributes(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('attributes_object');
    return fromRows(Object.entries(value));
  }
  function parseJson(raw) {
    // HTML-safe JSON can encode one payload character as six ASCII bytes.
    // The decoded registry still has the 32768-byte limit in provider validation.
    if (bytes(raw) > 32768 * 6) throw Error('Registry too large');
    const value = JSON.parse(raw), stack = [];
    // JSON.parse checks grammar first; scan only strings and structural tokens.
    for (const [token] of raw.matchAll(/"(?:[^"\\]|\\.)*"|[{}\[\],:]/gs)) {
      if (token === '{' || token === '[') { stack.push({ object: token === '{', key: true, names: new Set() }); continue; }
      if (token === '}' || token === ']') { stack.pop(); continue; }
      const top = stack[stack.length - 1];
      if (!top?.object) continue;
      if (token === ',') { top.key = true; continue; }
      if (token[0] === '"' && top.key) {
        const name = JSON.parse(token);
        if (top.names.has(name)) throw Error('Duplicate JSON member');
        top.names.add(name); top.key = false;
      }
    }
    return value;
  }
  window.web86CustomJs = Object.freeze({ attributes, fromRows, parseJson });
})();
