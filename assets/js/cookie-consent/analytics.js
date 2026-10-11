/** Analytics adapter. Just loading this FIRST-PARTY file does not load trackers. */
(() => {
  'use strict';

  const YANDEX_ID = 23643118;
  const MAIL_ID = '3265404';
  const assetBase = new URL('./', document.currentScript.src);
  let started = false;

  function addScript(url, id) {
    return new Promise((resolve, reject) => {
      if (id && document.getElementById(id)) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      if (id) script.id = id;
      script.src = url;
      script.async = true;
      script.addEventListener('load', resolve, { once: true });
      script.addEventListener('error', () => reject(new Error('Cannot load ' + url)), { once: true });
      document.head.appendChild(script);
    });
  }

  function setClientId(clientID) {
    const el = document.getElementById('clientid');
    if (el && clientID) el.setAttribute('data-clientid', String(clientID));
  }

  function loadRealYandex() {
    const url = 'https://mc.yandex.ru/metrika/tag.js';
    window.ym = window.ym || function () {
      (window.ym.a = window.ym.a || []).push(arguments);
    };
    window.ym.l = window.ym.l || Date.now();

    if (!document.querySelector('script[src="' + url + '"]')) {
      addScript(url, 'web86-yandex-metrika').catch(console.error);
    }

    window.ym(YANDEX_ID, 'init', {
      clickmap: true,
      trackLinks: true,
      accurateTrackBounce: true,
      webvisor: true
    });
    // Асинхронно получает ID после загрузки API Метрики.
    window.ym(YANDEX_ID, 'getClientID', setClientId);
  }

  function loadRealMailRu() {
    window._tmr = window._tmr || [];
    window._tmr.push({ id: MAIL_ID, type: 'pageView', start: Date.now() });
    if (!document.getElementById('tmr-code')) {
      addScript('https://top-fwz1.mail.ru/js/code.js', 'tmr-code').catch(console.error);
    }
  }

  function loadMockAnalytics() {
    // Каждый файл — реальный самостоятельный HTTP-запрос к ТВОЕМУ тестовому сайту.
    addScript(new URL('mock/yandex.js', assetBase).href, 'web86-mock-yandex')
      .then(() => addScript(new URL('mock/bitrix24-clientid.js', assetBase).href, 'web86-mock-bitrix'))
      .catch(console.error);
    addScript(new URL('mock/mailru.js', assetBase).href, 'web86-mock-mailru')
      .catch(console.error);
  }

  window.web86Analytics = Object.freeze({
    start({ mode = 'live' } = {}) {
      if (started) return;
      started = true;
      if (mode === 'mock') loadMockAnalytics();
      else loadRealYandex(), loadRealMailRu();
    }
  });
})();
