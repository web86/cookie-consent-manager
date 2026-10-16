/** Existing map URL policy and inert iframe lifecycle. No consent storage or startup hook. */
const web86Embeds = (() => {
  'use strict';
  function mapUrl(s, raw) {
    const url = new URL(raw, location.href);
    if (url.username || url.password || url.hash || url.port || /[\x00-\x20\\]/.test(raw)) throw Error('Unsafe map URL');
    if (url.protocol !== 'https:') throw Error('HTTPS map required');
    const google = s.loader === 'google_maps' && url.hostname === 'www.google.com' && /^\/maps\/embed(?:\/v1\/(?:place|view|directions|search|streetview))?$/.test(url.pathname);
    const yandex = s.loader === 'yandex_maps' && url.hostname === 'yandex.ru' && ['/map-widget/v1/', '/map-widget/v1'].includes(url.pathname);
    if (!google && !yandex) throw Error('Map host/path rejected');
    const allowed = google ? ['pb', 'key', 'q', 'center', 'zoom', 'maptype', 'language', 'region', 'origin', 'destination', 'waypoints', 'mode', 'avoid', 'units', 'location', 'heading', 'pitch', 'fov'] : ['um', 'source', 'll', 'z', 'l', 'pt', 'mode', 'oid', 'ol'];
    if (raw.length > 4096 || [...url.searchParams.keys()].some(k => !allowed.includes(k))) throw Error('Map parameters rejected');
    return url.href;
  }
  function safeMapUrl(s, raw, mode) {
    if (mode !== 'mock') return mapUrl(s, raw);
    const u = new URL(raw, location.href);
    if (u.origin !== location.origin || u.username || u.password || u.search || u.hash || u.pathname !== `/assets/js/cookie-consent/mock/${s.loader}.html`) throw Error('Mock map must be first-party fixture');
    return u.href;
  }
  function create({ root, registry, services, mode, categoryVisibility, runtimeAllowed, openSettings }) {
    const t = (...args) => window.web86Runtime?.message(...args) || args[0];
    const maps = [];
    let pendingMapDialog = null;
    function setupMaps() {
      for (const node of document.querySelectorAll('[data-cc-map-provider]')) {
        const service = services.find(s => s.key === node.dataset.ccMapProvider && ['google_maps','yandex_maps'].includes(s.loader));
        const template = Array.from(root.querySelectorAll('template[data-cc-map-template]')).find(t => t.dataset.ccMapTemplate === node.dataset.ccMapProvider);
        const headingSource = template?.content.querySelector('h3');
        const title = node.dataset.ccMapTitle || headingSource?.textContent || t('map_title');
        // All initial markup is inert until the common runtime gate permits this instance.
        node.replaceChildren();
        if (!service || !template) { node.textContent = t('map_disabled', { title }); continue; }
        let url;
        try { url = registry.safeMapUrl(service, node.dataset.ccMapSrc || '', mode); }
        catch (_) { node.textContent = t('map_rejected', { title }); continue; }
        const fragment = template.content.cloneNode(true);
        const placeholder = fragment.querySelector('.cc-map-placeholder');
        const heading = fragment.querySelector('h3');
        if (node.dataset.ccMapTitle) heading.textContent = node.dataset.ccMapTitle;
        const load = fragment.querySelector('[data-cc-map-load]');
        load.hidden = !categoryVisibility[service.category]; load.disabled = !categoryVisibility[service.category];
        // A map button only opens category preferences. It never grants an individual permission.
        load.addEventListener('click', () => {
          // A native modal makes the rest of the page inert; close it while editing consent.
          const dialog = node.closest('dialog');
          if (dialog?.open) { pendingMapDialog = { dialog, category: service.category }; dialog.close(); }
          openSettings(load, service.category);
        });
        node.append(placeholder); maps.push({ node, placeholder, service, title, url, frame: null });
      }
    }
    function apply(value) {
      for (const map of maps) {
        const allowed = runtimeAllowed(map.service.category) && registry?.allowed(map.service, value);
        if (allowed && !map.frame) {
          const frame = document.createElement('iframe'); frame.title = map.title;
          frame.referrerPolicy = 'strict-origin-when-cross-origin';
          frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups');
          frame.setAttribute('allowfullscreen', ''); frame.src = map.url;
          map.node.append(frame); map.frame = frame;
        } else if (!allowed && map.frame) { map.frame.remove(); map.frame = null; }
        map.placeholder.hidden = Boolean(allowed);
      }
    }
    function revoke(categories) {
      for (const map of maps) if (!categories[map.service.category] && map.frame) { map.frame.remove(); map.frame = null; }
    }
    function afterCommit(categories) {
      if (pendingMapDialog) {
        const { dialog, category } = pendingMapDialog; pendingMapDialog = null;
        if (categories[category] && dialog.isConnected && !dialog.open) dialog.showModal();
      }
    }
    return Object.freeze({ setup: setupMaps, apply, revoke, afterCommit });
  }
  return Object.freeze({ safeMapUrl, create });
})();
