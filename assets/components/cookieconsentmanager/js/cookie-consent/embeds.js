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
    if (u.origin !== location.origin || u.username || u.password || u.search || u.hash || u.pathname !== `/assets/components/cookieconsentmanager/js/cookie-consent/mock/${s.loader}.html`) throw Error('Mock map must be first-party fixture');
    return u.href;
  }
  function videoUrl(provider, raw) {
    const adapter = { youtube: web86YouTubeEmbed, rutube: web86RutubeEmbed, vk_video: web86VkVideoEmbed }[provider];
    if (!adapter || typeof raw !== 'string' || raw.length > 4096 || /[\x00-\x20\x7f\\]/.test(raw) || !/^https:\/\/[^/:?#@]+\//.test(raw)) throw Error('Unsafe video URL');
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash || url.href !== raw || new Set(url.searchParams.keys()).size !== [...url.searchParams.keys()].length || !adapter.valid(url)) throw Error('Video URL rejected');
    return url.href;
  }
  function create({ root, registry, services, mode, categoryVisibility, runtimeAllowed, openSettings }) {
    const t = (...args) => window.web86Runtime?.message(...args) || args[0];
    // No iterable strong collection of DOM nodes. Removed AJAX/modal subtrees can be collected.
    const states = new WeakMap();
    const selector = '[data-cc-map-provider], [data-cc-embed]';
    let pendingMapDialog = null, value = null;
    const children = (node, match) => Array.from(node.children).find(n => n.matches(match));
    function settings(state, button) {
      const dialog = state.node.closest('dialog');
      if (dialog?.open) { pendingMapDialog = { dialog, category: state.service.category }; dialog.close(); }
      openSettings(button, state.service.category);
    }
    // One handler for all initial and future wrappers; removed nodes retain no listeners here.
    document.addEventListener('click', event => {
      const button = event.target.closest?.('[data-cc-settings], [data-cc-map-load]');
      const node = button?.closest(selector), state = node && states.get(node);
      if (!state?.service || !state.placeholder?.contains(button) || !categoryVisibility[state.service.category]) return;
      event.preventDefault(); settings(state, button);
    });
    function displayOptions(state) {
      const { node } = state;
      const ratio = node.dataset.ccAspectRatio;
      if (ratio && /^[1-9]\d{0,3}:[1-9]\d{0,3}$/.test(ratio)) {
        node.style.aspectRatio = ratio.replace(':',' / '); node.classList.add('cc-embed-responsive');
      }
      if (/^[1-9]\d{0,4}$/.test(node.dataset.ccWidth || '')) node.style.maxWidth = node.dataset.ccWidth + 'px';
      const poster = node.dataset.ccPoster;
      if (poster) try {
        const url = new URL(poster, location.href);
        // Absolute same-origin URLs and local paths; never load a cross-origin placeholder.
        if (!url.username && !url.password && !url.hash && ['https:','http:'].includes(url.protocol) && url.origin === location.origin && !/[\x00-\x20\\]/.test(poster)) {
          const img = document.createElement('img'); img.src = url.href; img.alt = ''; img.className = 'cc-embed-poster';
          state.placeholder?.prepend(img);
        }
      } catch (_) { /* Neutral placeholder. External posters remain inert. */ }
    }
    function iframeOptions(frame, node) {
      if (/^[1-9]\d{0,4}$/.test(node.dataset.ccHeight || '') && !node.dataset.ccAspectRatio) frame.style.height = node.dataset.ccHeight + 'px';
      if (node.dataset.ccTitle) frame.title = node.dataset.ccTitle;
      for (const key of ['width','height']) if (/^[1-9]\d{0,4}$/.test(node.dataset['cc' + key[0].toUpperCase() + key.slice(1)] || '')) frame.setAttribute(key, node.dataset['cc' + key[0].toUpperCase() + key.slice(1)]);
      if (['lazy','eager'].includes(node.dataset.ccLoading)) frame.loading = node.dataset.ccLoading;
      if (['no-referrer','same-origin','strict-origin','strict-origin-when-cross-origin'].includes(node.dataset.ccReferrerPolicy)) frame.referrerPolicy = node.dataset.ccReferrerPolicy;
      if (node.dataset.ccAllowFullscreen === '0') frame.removeAttribute('allowfullscreen');
      else if (node.dataset.ccAllowFullscreen === '1') frame.setAttribute('allowfullscreen','');
    }
    function prepare(node) {
      if (states.has(node)) return states.get(node);
      const generic = node.hasAttribute('data-cc-embed');
      const key = generic ? node.dataset.ccEmbed : node.dataset.ccMapProvider;
      const service = services.find(s => s.key === key && (generic || ['google_maps','yandex_maps'].includes(s.loader)));
      const state = { node, service, generic, active: false, mounted: [] }; states.set(node,state);
      if (generic) {
        state.template = children(node,'template');
        state.placeholder = children(node,'[data-cc-placeholder]');
        if (!state.placeholder) {
          const placeholder = document.createElement('div'); placeholder.setAttribute('data-cc-placeholder',''); placeholder.className = 'cc-embed-placeholder';
          const notice = document.createElement('p'); notice.textContent = t('service.' + service?.key + '.embed_notice');
          const button = document.createElement('button'); button.type = 'button'; button.setAttribute('data-cc-settings',''); button.textContent = t('map_load', { provider: t('service.' + service?.key + '.name') });
          placeholder.append(notice,button); node.append(placeholder); state.placeholder = placeholder;
        }
        if (!service || !state.template) {
          state.placeholder.textContent = t('embed_disabled'); state.service = null; return state;
        }
        // Only snippet-generated URLs have a reviewed automatic contract. Developer templates are opaque.
        if (node.hasAttribute('data-cc-video')) try {
          if (node.dataset.ccVideo !== service.loader) throw Error('Video instance mismatch');
          videoUrl(service.loader, state.template.content.querySelector('iframe')?.getAttribute('src'));
        } catch (_) { state.placeholder.textContent = t('embed_rejected'); state.service = null; return state; }
        for (const button of state.placeholder.querySelectorAll('[data-cc-settings]')) { button.hidden = !categoryVisibility[service.category]; button.disabled = !categoryVisibility[service.category]; }
      } else {
        const template = Array.from(root.querySelectorAll('template[data-cc-map-template]')).find(t => t.dataset.ccMapTemplate === key);
        const title = node.dataset.ccMapTitle || node.dataset.ccTitle || template?.content.querySelector('h3')?.textContent || t('map_title'); state.title = title;
        node.replaceChildren();
        if (!service || !template) { node.textContent = t('map_disabled', { title }); state.service = null; return state; }
        try { state.url = registry.safeMapUrl(service, node.dataset.ccMapSrc || '', mode); }
        catch (_) { node.textContent = t('map_rejected', { title }); state.service = null; return state; }
        const fragment = template.content.cloneNode(true); state.placeholder = fragment.querySelector('.cc-map-placeholder');
        if (node.dataset.ccMapTitle || node.dataset.ccTitle) fragment.querySelector('h3').textContent = title;
        const load = fragment.querySelector('[data-cc-map-load]'); load.hidden = !categoryVisibility[service.category]; load.disabled = !categoryVisibility[service.category];
        node.append(state.placeholder);
      }
      displayOptions(state); return state;
    }
    function clear(state) {
      for (const child of state.mounted) if (state.node.contains(child)) child.remove();
      state.mounted = []; state.active = false; if (state.placeholder) state.placeholder.hidden = false;
    }
    function update(state) {
      if (!state.service || !state.node.isConnected) return;
      const allowed = runtimeAllowed(state.service.category) && registry?.allowed(state.service, value);
      if (allowed && !state.active) {
        state.active = true;
        const focused = state.placeholder?.contains(document.activeElement);
        if (state.generic) {
          // Trust boundary: import untouched developer HTML, including nested content and attributes.
          const fragment = document.importNode(state.template.content, true);
          state.mounted = Array.from(fragment.childNodes); state.node.append(fragment);
          // Display parameters belong to generated snippets only, never to generic templates.
          if (state.node.hasAttribute('data-cc-video')) for (const frame of state.node.querySelectorAll('iframe')) iframeOptions(frame,state.node);
        } else {
          const frame = document.createElement('iframe'); frame.title = state.title;
          frame.referrerPolicy = 'strict-origin-when-cross-origin'; frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-popups'); frame.setAttribute('allowfullscreen',''); frame.src = state.url;
          iframeOptions(frame,state.node); state.node.append(frame); state.mounted = [frame];
        }
        if (focused && state.generic) { const target = state.mounted.filter(n => n.nodeType === 1).map(n => n.matches('iframe, button, a[href], [tabindex]') ? n : n.querySelector('iframe, button, a[href], [tabindex]')).find(Boolean); target?.focus({preventScroll:true}); }
      } else if (!allowed && state.active) clear(state);
      state.placeholder.hidden = Boolean(allowed);
    }
    function nodes(scope) {
      if (!scope || typeof scope.querySelectorAll !== 'function') throw new TypeError('mountEmbeds requires a DOM root');
      return [...(scope.matches?.(selector) ? [scope] : []), ...scope.querySelectorAll(selector)];
    }
    function mount(scope = document) {
      for (const node of nodes(scope)) update(prepare(node));
      if (pendingMapDialog && !pendingMapDialog.dialog.isConnected) pendingMapDialog = null;
    }
    function apply(next) { value = next; mount(); }
    function revoke(categories) {
      for (const node of nodes(document)) { const state = states.get(node); if (state?.service && !categories[state.service.category]) clear(state); }
    }
    function afterCommit(categories) {
      if (pendingMapDialog) {
        const { dialog, category } = pendingMapDialog; pendingMapDialog = null;
        if (categories[category] && dialog.isConnected && !dialog.open) dialog.showModal();
      }
    }
    return Object.freeze({ setup: mount, mount, apply, revoke, afterCommit });
  }
  return Object.freeze({ safeMapUrl, create });
})();
