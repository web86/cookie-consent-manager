/* FAKE clientid for Bitrix24. Mimics dependency on Yandex but never contacts Bitrix24. */
if (typeof window.ym === 'function') {
  window.ym(23643118, 'getClientID', function (clientID) {
    const element = document.getElementById('clientid');
    if (element) element.setAttribute('data-clientid', clientID);
    console.info('[MOCK Bitrix24] data-clientid:', clientID);
    window.dispatchEvent(new CustomEvent('web86:mock-clientid-ready', { detail: { clientID } }));
  });
}
console.info('[MOCK] Bitrix24 clientid адаптер загружен');
window.dispatchEvent(new CustomEvent('web86:mock-script-loaded', { detail: { service: 'Bitrix24 ClientID' } }));
