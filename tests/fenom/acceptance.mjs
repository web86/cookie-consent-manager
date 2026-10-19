import {expectedFrontendVersion} from '../frontend-asset.mjs';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const origin = 'http://127.0.0.1:18988';
const out = '.local/fenom/evidence';
mkdirSync(out, { recursive: true });
const control = (...args) => execFileSync('docker', ['exec', 'cookie-consent-acceptance-fenom-1', 'php', '/opt/cc-source/tests/fenom/control.php', ...args], { encoding: 'utf8' }).trim();
const ids = JSON.parse(control('setup'));
const metadata = JSON.parse(control('metadata'));
const hash = value => createHash('sha256').update(value).digest('hex');
const url = (lang, mode) => `${origin}/fenom.php?ctx=fenom-${lang}&id=${ids[lang][mode]}`;
let assertions = 0;
const results = [], baseline = {}, returning = {};
const eq = (actual, expected, message) => { assertions++; assert.deepEqual(actual, expected, message); };
const test = async (name, run) => {
  const start = assertions;
  try { const evidence = await run(); results.push({ name, result: 'PASS', assertions: assertions - start, ...evidence }); console.log('PASS ' + name); }
  catch (error) { results.push({ name, result: 'FAIL', assertions: assertions - start, error: error.message }); throw error; }
};
const browser = await chromium.launch({ headless: true });
async function session(options = {}, corrupt = false) {
  const context = await browser.newContext(options), external = [], unexpected = [], errors = [];
  await context.route('**/*', async route => {
    const request = route.request(), address = new URL(request.url());
    if (address.origin !== origin) {
      external.push(request.url());
      if (request.url() === 'https://mc.yandex.ru/metrika/tag.js') return route.fulfill({ contentType: 'application/javascript', body: 'window.__syntheticMetrikaLoaded=true;' });
      if (address.origin === 'https://yandex.ru' && address.pathname === '/map-widget/v1/') return route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Synthetic map</title><p>Local intercepted map fixture</p>' });
      unexpected.push(request.url()); return route.abort();
    }
    if (address.pathname.endsWith('/audit.php')) {
      const event = request.postDataJSON();
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, event_id: event.event_id, server_time: new Date().toISOString() }) });
    }
    if (corrupt && request.isNavigationRequest()) {
      const response = await route.fetch();
      const body = (await response.text()).replace(/(<script type="application\/json" id="cc-service-registry">).*?(<\/script>)/s, '$1{broken$2');
      return route.fulfill({ response, body });
    }
    return route.continue();
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  return { context, page, external, unexpected, errors };
}
async function structure(s, language, mode) {
  const { page } = s;
  eq(await page.locator('#fixture-ready').count(), 1, 'Full resource rendered');
  eq(await page.locator('#cookie-block').count(), 1, 'Exactly one banner');
  eq(await page.locator('#cc-service-registry').count(), 1, 'Exactly one registry');
  eq(await page.locator('head #cc-service-registry').count(), 1, 'Registry inserted inside head');
  eq(await page.locator('script[src*="cookie-consent.min.js"]').count(), 1, 'Exactly one JS inclusion');
  eq(await page.locator('link[href*="cookie-consent.min.css"]').count(), 1, 'Exactly one CSS inclusion');
  eq(await page.locator('head script[src*="cookie-consent.min.js"][defer]').count(), 1, 'Deferred JS remains in head');
  eq(await page.locator('head link[href*="cookie-consent.min.css"]').count(), 1, 'CSS remains in head');
  if (mode !== 'fenom-legacy') eq(await page.locator('#fixture-footer #cookie-block').count(), 1, 'Split banner stays at call site');
  eq(await page.locator('[data-cc-action=reject]').textContent(), language === 'ru' ? 'Отклонить' : 'Reject', 'Actual context language');
  eq((await page.locator('[data-cc-html=notice_html]').textContent()).includes('[[!NeverExecute]] {$neverExecute}'), true, 'User template delimiters remain inert text');
  const raw = await page.locator('#cc-service-registry').textContent();
  const registry = JSON.parse(raw);
  eq(registry.schema, 1, 'JSON schema unchanged');
  eq(registry.services.filter(s => s.enabled).map(s => s.key).sort(), ['yandex', 'yandex_maps'], 'Enabled provider data retained');
  for (const path of ['assets/components/cookieconsentmanager/css/cookie-consent.min.css', 'assets/components/cookieconsentmanager/js/cookie-consent/cookie-consent.min.js']) {
    const css = path.endsWith('.css');
    const value = await page.locator(css ? 'link[href*="cookie-consent.min.css"]' : 'script[src*="cookie-consent.min.js"]').getAttribute(css ? 'href' : 'src');
    eq(new URL(value, origin).searchParams.get('v'), css ? hash(readFileSync(path)).slice(0, 20) : expectedFrontendVersion(), 'Content hash cache busting unchanged');
  }
  eq(s.errors, [], 'No browser errors'); eq(s.unexpected, [], 'No unexpected external requests');
  return raw;
}
const stored = page => page.evaluate(() => localStorage.getItem('web86_cookie_consent'));
const fingerprints = page => page.evaluate(() => Object.fromEntries(web86Providers.services.map(s => [s.key, s.fingerprint])));
async function navigate(s, language, mode) {
  const response = await s.page.goto(url(language, mode), { waitUntil: 'networkidle' });
  eq(response.status(), 200, 'HTTP 200 with rendered content');
}
try {
  eq(metadata.modx, '2.8.8-pl'); eq(metadata.parser, 'pdoParser'); eq(metadata.fenom_cache, '1'); eq(metadata.fenom_parser, '1');
  control('assets', 'baseline'); control('syntax', 'all');
  for (const language of ['ru', 'en']) {
    await test('reproduced-original-Fenom-blank-page-' + language, async () => {
      const offset = control('log-size'); control('clear');
      const responses = [];
      for (let warm = 0; warm < 2; warm++) {
        const response = await fetch(url(language, 'fenom-split'));
        const body = await response.text();
        eq(response.status, 200, 'Reported blank page can misleadingly return 200');
        eq(body, '', 'Original split integration is blank under full brace detection');
        responses.push({ request: warm ? 'warm' : 'cold', status: response.status, bodyBytes: body.length });
      }
      const log = control('log', offset);
      eq(log.includes("Unexpected token ':'"), true); eq(log.includes("near '{\"schema\":'"), true); eq(log.includes('pdotools.class.php : 999'), true);
      return { responses, log };
    });
    await test('original-legacy-persisted-consent-' + language, async () => {
      const s = await session();
      try {
        await navigate(s, language, 'fenom-legacy');
        baseline[language] = { registry: await structure(s, language, 'fenom-legacy'), fingerprints: await fingerprints(s.page) };
        eq(s.external, [], 'No provider request before consent');
        await s.page.locator('[data-cc-action=accept-all]').click();
        await s.page.waitForFunction(() => window.__syntheticMetrikaLoaded === true);
        await s.page.locator('[data-cc-map-provider] iframe').waitFor();
        returning[language] = { raw: await stored(s.page), state: `${out}/returning-${language}.json` };
        await s.context.storageState({ path: returning[language].state });
        return { registrySHA256: hash(baseline[language].registry), consentSHA256: hash(returning[language].raw) };
      } finally { await s.context.close(); }
    });
  }
  // The upstream heuristic skips bare JSON; do not claim every Fenom setup fails.
  control('syntax', 'default');
  await test('original-simple-split-upstream-default-detector', async () => {
    const s = await session({ javaScriptEnabled: false });
    try { await navigate(s, 'en', 'fenom-split'); await structure(s, 'en', 'fenom-split'); } finally { await s.context.close(); }
  });
  control('assets', 'fixed');
  for (const syntax of ['default', 'all']) {
    control('syntax', syntax);
    for (const language of ['ru', 'en']) for (const mode of ['standard-split', 'fenom-split', 'fenom-legacy']) {
      // Standard templates also execute under the real built-in modParser.
      control('parser', mode === 'standard-split' ? 'standard' : 'fenom');
      await test(`fixed-${syntax}-${language}-${mode}-cold-warm`, async () => {
        control('clear'); const offset = control('log-size');
        const s = await session(), cache = [];
        try {
          for (let warm = 0; warm < 2; warm++) {
            await navigate(s, language, mode);
            eq(await structure(s, language, mode), baseline[language].registry, 'Registry bytes unchanged');
            eq(await fingerprints(s.page), baseline[language].fingerprints, 'Consent fingerprints unchanged');
            eq(await s.page.locator('[data-cc-action=reject]').isVisible(), true, 'Fresh browser sees banner');
            eq(s.external, [], 'No external request before consent');
            eq(await s.page.locator('[data-cc-map-provider] iframe').count(), 0, 'Yandex Maps blocked before consent');
            const source = await s.page.locator('#cache-source').textContent(); cache.push(source);
            eq(source, warm ? 'cache' : 'database', 'Actual MODX resource cache source');
          }
          eq(control('log', offset), '', 'No new MODX/Fenom errors on valid requests');
          return { cache, registrySHA256: hash(baseline[language].registry) };
        } finally { await s.context.close(); }
      });
    }
  }
  control('parser', 'fenom'); control('syntax', 'all');
  for (const language of ['ru', 'en']) {
    await test('returning-visitor-original-to-fixed-' + language, async () => {
      const s = await session({ storageState: returning[language].state });
      try {
        await navigate(s, language, 'fenom-split');
        eq(await stored(s.page), returning[language].raw, 'Byte-identical previously stored consent');
        eq(await fingerprints(s.page), baseline[language].fingerprints);
        eq(await s.page.locator('[data-cc-action=reject]').isVisible(), false, 'No unnecessary renewed consent');
        await s.page.waitForFunction(() => window.__syntheticMetrikaLoaded === true);
        eq(await s.page.locator('[data-cc-map-provider] iframe').count(), 1, 'Restored permission loads map');
        s.external.length = 0; await s.page.reload({ waitUntil: 'networkidle' });
        eq(await stored(s.page), returning[language].raw, 'Reload preserves storage and consent ID');
        eq(s.external.some(u => u.includes('/metrika/')), true); eq(s.external.some(u => u.includes('/map-widget/')), true);
        eq(s.unexpected, []); eq(s.errors, []);
      } finally { await s.context.close(); }
    });
    for (const mode of ['fenom-split', 'fenom-legacy']) await test(`reject-reopen-analytics-then-maps-${language}-${mode}`, async () => {
      const s = await session();
      try {
        await navigate(s, language, mode); eq(s.external, []);
        await s.page.locator('[data-cc-action=reject]').click();
        const rejected = await stored(s.page); eq(JSON.parse(rejected).model, 'categories_v2');
        eq(JSON.parse(rejected).categories.analytics, false); eq(JSON.parse(rejected).categories.external_content, false);
        await s.page.reload({ waitUntil: 'networkidle' }); eq(await stored(s.page), rejected); eq(s.external, [], 'Rejection survives reload');
        await s.page.locator('[data-cookie-settings-open]').click();
        await s.page.locator('[data-cc-category=analytics]').check();
        await s.page.locator('[data-cc-action=save]').click();
        await s.page.waitForFunction(() => window.__syntheticMetrikaLoaded === true);
        eq(s.external.filter(u => u.includes('/metrika/')).length, 1, 'Analytics loads once after grant');
        eq(await s.page.locator('[data-cc-map-provider] iframe').count(), 0, 'Analytics permission does not grant Maps');
        await s.page.locator('[data-cookie-settings-open]').click();
        await s.page.locator('[data-cc-category=external_content]').check();
        await s.page.locator('[data-cc-action=save]').click();
        await s.page.locator('[data-cc-map-provider] iframe').waitFor();
        eq(s.external.filter(u => u.includes('/map-widget/')).length, 1, 'Map loads once after external-content grant');
        await s.page.reload({ waitUntil: 'networkidle' });
        eq(await s.page.locator('[data-cc-map-provider] iframe').count(), 1); eq(s.unexpected, []); eq(s.errors, []);
      } finally { await s.context.close(); }
    });
  }
  for (const language of ['ru', 'en']) for (const mode of ['fenom-split', 'fenom-legacy']) {
    await test(`invalid-server-registry-${language}-${mode}`, async () => {
      control('registry', 'invalid'); const offset = control('log-size'); const s = await session();
      try {
        await navigate(s, language, mode);
        eq(JSON.parse(await s.page.locator('#cc-service-registry').textContent()), { schema: 1, services: [] });
        eq(await s.page.locator('head #cc-service-registry').count(), 1); eq(await s.page.locator('#cookie-block').count(), 0);
        eq(s.external, []); eq(s.errors, []); eq(control('log', offset).includes('Unexpected token'), false);
      } finally { await s.context.close(); control('registry', 'valid'); }
    });
    await test(`invalid-client-registry-${language}-${mode}`, async () => {
      const s = await session({}, true);
      try {
        await navigate(s, language, mode); eq(await s.page.evaluate(() => web86Providers.services.length), 0);
        await s.page.locator('[data-cc-action=accept-all]').click();
        eq(s.external, [], 'Malformed client JSON cannot load providers'); eq(s.errors, []);
      } finally { await s.context.close(); }
    });
  }
} catch (error) { console.error(error); process.exitCode = 1; }
finally {
  control('parser', 'fenom'); control('syntax', 'all'); control('assets', 'fixed'); control('registry', 'valid');
  await browser.close();
  const report = { suite: 'Genuine MODX 2 / pdoTools / Fenom acceptance', metadata, production: 'NOT RUN — no affected-site URL, configuration or authenticated access provided', network: 'All third-party requests fulfilled locally or aborted; no vendor analytics events sent; audit POSTs intercepted', tests: results.length, assertions, failed: results.filter(r => r.result === 'FAIL').length, results };
  writeFileSync(`${out}/results.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ tests: report.tests, assertions, failed: report.failed }));
}
