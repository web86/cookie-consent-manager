// Copy into your site's assets tree; do not add an active <script> for this file.
// Manager: loader=custom_js, path=<this local file>; key/purpose_id are generated.
(() => {
  'use strict';
  const cmp = window.web86CookieConsent;
  const path = new URL(document.currentScript.src, location.href).pathname;
  const service = window.web86Providers?.services.find(s => s.loader === 'custom_js' && s.config.path === path);
  if (!cmp || !service) return;
  cmp.onAllowed(service.category, async stillAllowed => {
    if (!stillAllowed()) return;
    // A developer creates this FIRST-PARTY JSON endpoint with the reviewed HTTPS SDK URL.
    // Use the address issued by your own Bitrix24 account, with no server secrets in it.
    const response = await fetch('/integrations/bitrix24-config.json', { credentials: 'same-origin' });
    if (!stillAllowed() || !response.ok) return;
    const config = await response.json();
    if (!stillAllowed()) return;
    const url = new URL(config.sdk_url);
    // Replace this example hostname with the EXACT reviewed host issued for your account.
    if (url.protocol !== 'https:' || url.hostname !== 'example.invalid' || url.username || url.password || url.port || url.hash) return;
    if (document.getElementById('site-bitrix24-sdk') || !stillAllowed()) return;
    const script = document.createElement('script');
    script.id = 'site-bitrix24-sdk'; script.async = true; script.src = url.href;
    script.onerror = () => console.warn('Bitrix24 SDK could not be loaded');
    if (stillAllowed()) document.head.append(script);
  }, { service: service.key });
})();
