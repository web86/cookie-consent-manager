/** One Top.Mail.Ru SDK for Mail.Ru and VK Ads; preserve pending VK cleanup. */
const web86CreateMailruCommon = runtime => {
  const vkIds = new Set();
  let loaded = false;
  return {
    async pageView(id, vk = false) {
      if (vk) vkIds.add(id);
      window._tmr = window._tmr || []; window._tmr.push({ id, type: 'pageView', start: Date.now() });
      await runtime.script('https://top-fwz1.mail.ru/js/code.js'); loaded = true;
    },
    revoke() {
      if (!loaded && Array.isArray(window._tmr)) for (let i = window._tmr.length - 1; i >= 0; i--) if (window._tmr[i]?.type === 'pageView' && vkIds.has(window._tmr[i].id)) window._tmr.splice(i, 1);
    }
  };
};
