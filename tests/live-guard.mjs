// Live URL/queue guards with ALL provider traffic fulfilled locally by Playwright.
// This does not test vendors' actual SDKs or contact their servers.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { origin, registry, evidence } from './helpers.mjs';
let assertions = 0; const results = [];
function equal(a, b, message) { assertions++; assert.deepEqual(a, b, message); }
const browser = await chromium.launch();
const html = await (await fetch(origin)).text();
const testRegistry = structuredClone(registry);
testRegistry.services.find(s => s.key === 'yandex').config.id = '12345678';
testRegistry.services.find(s => s.key === 'mailru').config.id = '87654321';
const googleMap = 'https://www.google.com/maps/embed?pb=TEST%3AMOCK';
const yandexMap = 'https://yandex.ru/map-widget/v1/?ll=37.6%2C55.7&z=10';
const liveHtml = html.replace(/(<script type="application\/json" id="cc-service-registry">)[\s\S]*?(<\/script>)/, '$1' + JSON.stringify(testRegistry) + '$2')
  .replaceAll('data-cc-mode="mock"', 'data-cc-mode="live"')
  .replaceAll('/assets/js/cookie-consent/mock/google_maps.html', googleMap)
  .replaceAll('/assets/js/cookie-consent/mock/yandex_maps.html', yandexMap.replaceAll('&', '&amp;'));
async function suite(name, cb, content = liveHtml) {
  const ctx = await browser.newContext({ recordHar: { path: `.local/evidence/live-${name}.har`, content: 'omit' } });
  const external = [], configCalls = [];
  await ctx.route('**/*', route => {
    const url = route.request().url();
    if (new URL(url).origin === origin) {
      if (url === origin + '/') return route.fulfill({ status: 200, contentType: 'text/html', body: content });
      return route.continue();
    }
    external.push(url);
    // The route ends here: NEVER route.continue for a provider.
    return route.fulfill({ status: 200, contentType: route.request().resourceType() === 'document' ? 'text/html' : 'text/javascript', body: route.request().resourceType() === 'document' ? '<html lang="ru"><title>Intercepted map</title><body>Local response</body></html>' : '/* intercepted empty vendor stub */' });
  });
  const p = await ctx.newPage(); const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  try {
    await p.goto(origin, { waitUntil: 'networkidle' });
    equal(external, [], 'Live preconsent must be zero');
    await cb(p, external);
    equal(errors, [], 'No errors');
    results.push({ name, result: 'PASS', interceptedExternal: external.map(url => url.replace(/id=[^&]+/, 'id=<test-id>')) });
    console.log('PASS live-' + name);
  } catch (e) { results.push({ name, result: 'FAIL', error: e.message }); console.error('FAIL live-' + name + ': ' + e.message); }
  finally { await ctx.close(); }
}
for (const [key, url] of [['google_maps', googleMap], ['yandex_maps', yandexMap]]) await suite(key, async (p, external) => {
  await p.locator('[data-cc-action="reject"]').click(); await p.waitForTimeout(500);
  await p.locator(`[data-cc-map-load="${key}"]`).first().click(); await p.waitForTimeout(100);
  equal([...new Set(external)], [url], 'Correct preserved original embed URL');
  equal(await p.evaluate(() => window.web86CookieConsent.getConsent().analytics), false);
});
for (const [key, id] of [['google_ga4', 'G-MOCK1234'], ['google_ads', 'AW-12345678']]) await suite(key, async (p, external) => {
  await p.locator('[data-cc-action="configure"]').click(); await p.locator(`[data-cc-provider="${key}"]`).check(); await p.locator('[data-cc-action="save"]').click(); await p.waitForTimeout(120);
  equal(external, [`https://www.googletagmanager.com/gtag/js?id=${id}`]);
  const queue = await p.evaluate(() => window.dataLayer.map(a => Array.from(a)));
  equal(queue.filter(a => a[0] === 'config').map(a => a[1]), [id], 'Only selected Google configuration');
  const update = queue.filter(a => a[0] === 'consent' && a[1] === 'update').at(-1)[2];
  equal(update.analytics_storage, key === 'google_ga4' ? 'granted' : 'denied');
  equal(update.ad_storage, key === 'google_ads' ? 'granted' : 'denied');
});
await suite('gtm-partial-block', async (p, external) => {
  await p.locator('[data-cc-action="configure"]').click(); await p.locator('[data-cc-provider="google_gtm"]').check(); await p.locator('[data-cc-action="save"]').click(); await p.waitForTimeout(100); equal(external, []);
});
await suite('all-google-shared-library', async (p, external) => {
  await p.locator('[data-cc-action="accept-all"]').click(); await p.waitForTimeout(200);
  equal(external.filter(u => u.includes('/gtag/js')).length, 1, 'Single Google library');
  equal(external.filter(u => u.includes('/gtm.js')).length, 1);
  equal(external.filter(u => u.includes('metrika/tag.js')).length, 1);
  equal(external.filter(u => u.includes('top-fwz1.mail.ru')).length, 1);
  const configs = await p.evaluate(() => window.dataLayer.filter(a => a[0] === 'config').map(a => a[1]).sort());
  equal(configs, ['AW-12345678', 'G-MOCK1234']);
});
await suite('map-url-rejection', async (p, external) => {
  const result = await p.evaluate(() => {
    const s = window.web86Providers.services.find(s => s.key === 'google_maps');
    return ['javascript:alert(1)', 'https://www.google.com.evil.test/maps/embed?pb=x', 'https://evil.test/maps/embed',
      'https://www.google.com/maps/embed?callback=alert', 'https://user:password@www.google.com/maps/embed',
      'https://www.google.com:8443/maps/embed', 'https://www.google.com/maps/embed#x', 'http://www.google.com/maps/embed'].map(url => {
        try { window.web86Providers.safeMapUrl(s, url, 'live'); return false; } catch { return true; }
      });
  }); equal(result, Array(8).fill(true)); equal(external, []);
});
for (const [index, raw] of ['//evil.test/a', '/\\evil.test/a', 'https://evil.test/a', 'javascript:alert(1)'].entries()) await suite('audit-url-' + index, async (p, external) => {
  const auditCalls = []; p.on('request', r => { if (r.url().includes('audit.php')) auditCalls.push(r.url()); });
  await p.locator('[data-cc-action="reject"]').click(); await p.waitForTimeout(100); equal(external, []); equal(auditCalls, []);
}, liveHtml.replace('data-cc-audit-url="/assets/components/cookieconsent/audit.php"', `data-cc-audit-url="${raw}"`));
await browser.close();
evidence('live-guard-results', { suite: 'Live adapters with local network fulfillment only', assertions, tests: results.length, failed: results.filter(r => r.result === 'FAIL').length, results });
console.log(`${results.length} intercepted live scenarios, ${assertions} assertions`);
if (results.some(r => r.result === 'FAIL')) process.exitCode = 1;
