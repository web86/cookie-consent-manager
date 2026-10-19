/** Internal built-in adapter; receives the shared runtime, never reads consent storage. */
const web86CreateYandexAdapter = (runtime) => {
  const { script } = runtime;
  return {
    async start(s) {
      window.ym = window.ym || function () { (window.ym.a = window.ym.a || []).push(arguments); };
      window.ym.l = Date.now();
      window.ym(Number(s.config.id), 'init', { webvisor: s.config.webvisor, clickmap: s.config.clickmap, trackLinks: s.config.trackLinks, accurateTrackBounce: s.config.accurateTrackBounce });
      await script('https://mc.yandex.ru/metrika/tag.js');

    }
  };
};
