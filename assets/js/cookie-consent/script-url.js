/** Data-only JS locations shared by Manager and public registry; never fetch on validation. */
(() => {
  'use strict';
  const local = path => /^\/(?:[A-Za-z0-9_-][A-Za-z0-9_.-]*\/)*[A-Za-z0-9_-][A-Za-z0-9_.-]*\.js$/.test(path);
  function valid(raw) {
    if (typeof raw !== 'string' || raw.length > 2048 || /[\x00-\x20\x7f<>"'`\\]/.test(raw)) return false;
    if (raw.startsWith('/')) return local(raw);
    if (!raw.startsWith('https://')) return false;
    try {
      const u = new URL(raw), authority = raw.slice(8).split('/')[0], host = authority.replace(/:[0-9]+$/, '').toLowerCase();
      if (host !== u.hostname || u.port === '0') return false;
      if (u.protocol !== 'https:' || u.username || u.password || u.hash || !authority || authority.includes('@') || !local(raw.slice(8 + authority.length).split('?')[0])) return false;
      if (u.hostname.length > 253 || !u.hostname.split('.').every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label))) return false;
      const query = raw.includes('?') ? raw.slice(raw.indexOf('?') + 1) : '';
      return /^[A-Za-z0-9._~!$&()*+,;=:@/?%\[\]-]*$/.test(query) && !/%(?![0-9a-f]{2})/i.test(query);
    } catch (_) { return false; }
  }
  function identity(raw) {
    if (!valid(raw)) return null;
    if (raw.startsWith('/')) return raw;
    return new URL(raw).href;
  }
  window.web86ScriptUrl = Object.freeze({ valid, identity });
})();
