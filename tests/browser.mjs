import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { origin, registry, setting, evidence } from './helpers.mjs';
let assertions = 0;
const results = [];
function equal(a, b, message) { assertions++; assert.deepEqual(a, b, message); }
function ok(value, message) { assertions++; assert.ok(value, message); }
const browser = await chromium.launch({ headless: true });
const scriptsA = ['bitrix24-clientid.js', 'google_ga4.js', 'mailru.js', 'yandex.js'];
const scriptsM = ['google_ads.js', 'marketing.js'];
function loads(requests) { return [...new Set(requests.filter(r => r.url.includes('/mock/')).map(r => new URL(r.url).pathname.split('/').at(-1)))].sort(); }
async function suite(name, callback, options = {}) {
  const context = await browser.newContext({ ...options, recordHar: { path: `.local/evidence/${name}.har`, content: 'omit' } });
  const requests = [], responses = [], errors = [], events = [], deliveries = [];
  await context.route('**/*', route => {
    const url = route.request().url(); requests.push({ url, method: route.request().method() });
    if (new URL(url).origin !== origin) return route.abort('blockedbyclient');
    return route.continue();
  });
  await context.addInitScript(() => {
    window.__audits = []; window.__deliveries = [];
    window.addEventListener('web86:consent-audit', e => window.__audits.push(e.detail));
    window.addEventListener('web86:consent-audit-delivery', e => window.__deliveries.push(e.detail));
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.url().endsWith('/audit.php')) responses.push(response.status()); });
  try {
    await page.goto(origin, { waitUntil: 'networkidle' });
    await callback({ page, context, requests, responses });
    await page.waitForTimeout(150);
    events.push(...await page.evaluate(() => window.__audits));
    deliveries.push(...await page.evaluate(() => window.__deliveries));
    equal(requests.filter(r => new URL(r.url).origin !== origin), [], `${name}: external network`);
    equal(errors, [], `${name}: page errors`);
    results.push({ name, result: 'PASS', mockLoads: loads(requests), auditHTTP: responses, events: events.map(e => ({ event: e.event, stage: e.stage })), networkRequests: requests.length });
    console.log(`PASS ${name}`);
  } catch (error) {
    results.push({ name, result: 'FAIL', error: error.message }); console.error(`FAIL ${name}: ${error.message}`);
  } finally { await context.close(); }
}
async function choose(page, selected) {
  await page.locator('[data-cc-action="configure"]').click();
  for (const cat of selected) await page.locator(`[data-cc-category="${cat}"]`).check();
  await page.locator('[data-cc-action="save"]').click();
  await page.waitForTimeout(250);
}
await suite('first-visit', async ({ page, requests }) => {
  equal(loads(requests), [], 'No services before consent');
  equal(await page.locator('[data-cc-map-provider] iframe').count(), 0, 'No frames');
  ok(await page.locator('[data-cc-action="reject"]').isVisible(), 'Banner');
  await page.locator('[data-cc-action="configure"]').click();
  equal(await page.locator('[data-cc-provider]').count(), 0, 'No provider controls');
  equal(await page.locator('input:disabled').isChecked(), true, 'Necessary locked');
  await page.keyboard.press('Escape');
  equal(await page.locator('[data-cc-panel="settings"]').isVisible(), false, 'Escape');
});
await suite('reject', async ({ page, requests }) => {
  await page.locator('[data-cc-action="reject"]').click();
  await page.waitForFunction(() => window.__deliveries.some(e => e.ok));
  equal(loads(requests), [], 'Reject loads nothing');
  equal((await page.evaluate(() => window.__audits.at(-1))).stage, 'committed');
  await page.locator('#optional-client-form button').click();
  equal(await page.locator('#form-result').textContent(), 'Отправлено', 'Form works without ClientID');
});
// Every combination of category consent (including save with zero selection).
for (let mask = 0; mask < 8; mask++) await suite(`category-${mask}`, async ({ page, requests }) => {
  const selected = ['analytics', 'marketing', 'external_content'].filter((c, i) => mask & (1 << i));
  await choose(page, selected);
  await page.waitForFunction(() => window.__deliveries.some(e => e.ok));
  const expected = [...(mask & 1 ? scriptsA : []), ...(mask & 2 ? scriptsM : []), ...(mask & 4 ? ['google_maps.html', 'yandex_maps.html'] : []), ...(mask === 7 ? ['google_gtm.js'] : [])].sort();
  equal(loads(requests), expected, 'Exact mock network set');
  if (mask & 1) await page.waitForFunction(() => document.getElementById('clientid').dataset.clientid === 'MOCK-CLIENT-23643118');
  else equal(await page.locator('#clientid').getAttribute('data-clientid'), '', 'ClientID not set');
  const before = requests.length;
  await page.evaluate(() => { const c = window.web86CookieConsent.getConsent(); window.web86Providers.apply(c, 'mock'); window.web86Providers.apply(c, 'mock'); });
  await page.waitForTimeout(80); equal(requests.length, before, 'No duplicate initialization');
  const id = await page.evaluate(() => window.web86CookieConsent.getConsent().consentId);
  requests.length = 0; await page.reload({ waitUntil: 'networkidle' });
  equal(loads(requests), expected, 'Return visit network');
  equal(await page.evaluate(() => window.web86CookieConsent.getConsent().consentId), id, 'Stable consent ID');
});
for (const key of ['google_maps', 'yandex_maps']) await suite(`map-${key}`, async ({ page, requests }) => {
  await page.locator('[data-cc-action="reject"]').click(); await page.waitForTimeout(500);
  await page.locator(`[data-cc-map-load="${key}"]`).first().click();
  await page.waitForFunction(k => window.__audits.some(e => e.event === 'map_allow' && e.provider === k), key);
  await page.waitForTimeout(200);
  equal(loads(requests), [`${key}.html`], 'Only selected provider map');
  const c = await page.evaluate(() => window.web86CookieConsent.getConsent()); equal(c.analytics, false); equal(c.marketing, false);
  requests.length = 0; await page.reload({ waitUntil: 'networkidle' }); equal(loads(requests), [`${key}.html`], 'Map permission persisted');
  requests.length = 0; await page.locator(`[data-cc-map-revoke="${key}"]`).first().click();
  await page.waitForFunction(() => !window.web86CookieConsent.getConsent()?.external_content);
  await page.waitForTimeout(600); equal(loads(requests), [], 'Revoked maps absent after reload');
  equal(await page.locator('[data-cc-map-provider] iframe').count(), 0, 'Frames removed');
});
await suite('accept-all-revoke', async ({ page, requests }) => {
  await page.locator('[data-cc-action="accept-all"]').click(); await page.waitForTimeout(300);
  equal(loads(requests), [...scriptsA, ...scriptsM, 'google_gtm.js', 'google_maps.html', 'yandex_maps.html'].sort());
  await page.locator('[data-cookie-settings-open]').click();
  for (const c of ['analytics', 'marketing', 'external_content']) await page.locator(`[data-cc-category="${c}"]`).uncheck();
  requests.length = 0; await page.locator('[data-cc-action="save"]').click();
  await page.waitForTimeout(900); equal(loads(requests), [], 'No services on revoked reload');
});
await suite('legacy-accept', async ({ page, requests }) => {
  await page.evaluate(() => { document.getElementById('cookie-block').dataset.ccShowAccept = '1'; document.querySelector('[data-cc-action="accept"]').hidden = false; });
  await page.locator('[data-cc-action="accept"]').click(); await page.waitForTimeout(300);
  equal(loads(requests), [...scriptsA, ...scriptsM, 'google_gtm.js', 'google_maps.html', 'yandex_maps.html'].sort());
});
await suite('provider-only', async ({ page, requests }) => {
  await page.evaluate(()=>{const s=web86Providers.services.find(s=>s.key==='google_ga4');localStorage.setItem('web86_cookie_consent',JSON.stringify({version:'1',necessary:true,analytics:true,marketing:false,external_content:false,providers:{[s.key]:s.fingerprint},savedAt:Date.now(),consentId:crypto.randomUUID()}));});requests.length=0;await page.reload({waitUntil:'networkidle'});
  equal(loads(requests),['google_ga4.js'],'Legacy partial remains exact');
});
for (const cause of ['ttl', 'policy', 'old-m2', 'popup-yurist']) await suite(`expiry-${cause}`, async ({ page, requests }) => {
  await page.locator('[data-cc-action="accept-all"]').click(); await page.waitForTimeout(200);
  await page.evaluate(cause => {
    const key = 'web86_cookie_consent', c = JSON.parse(localStorage.getItem(key));
    if (cause === 'ttl') c.savedAt = Date.now() - 91 * 86400000;
    if (cause === 'policy') c.version = 'old-policy';
    if (cause === 'old-m2') { delete c.providers; delete c.external_content; }
    if (cause === 'popup-yurist') { localStorage.removeItem(key); localStorage.setItem('popup_yurist', 'true'); }
    else localStorage.setItem(key, JSON.stringify(c));
  }, cause);
  requests.length = 0; await page.reload({ waitUntil: 'networkidle' }); equal(loads(requests), [], 'Stale/legacy consent does not authorize providers');
  if (cause !== 'old-m2') ok(await page.locator('[data-cc-action="reject"]').isVisible(), 'New consent requested');
});
await suite('draft-not-committed', async ({ page, requests }) => {
  await page.locator('[data-cc-action="configure"]').click(); await page.locator('[data-cc-category="analytics"]').check();
  await page.waitForFunction(() => window.__deliveries.some(e => e.ok)); equal(loads(requests), [], 'Draft no loads');
  equal(await page.evaluate(() => window.web86CookieConsent.getConsent()), null);
  equal((await page.evaluate(() => window.__audits.at(-1))).stage, 'draft');
  const id = await page.evaluate(() => window.__audits.at(-1).consent_id);
  await page.reload({ waitUntil: 'networkidle' }); await page.locator('[data-cc-action="reject"]').click();
  equal(await page.evaluate(() => window.__audits.at(-1).consent_id), id, 'Draft identity survives reload');
});
await suite('failed-audit', async ({ page, context, requests }) => {
  await context.route('**/audit.php', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"ok":false}' }));
  await page.locator('[data-cc-action="accept-all"]').click();
  await page.waitForFunction(() => window.__deliveries.some(e => !e.ok));
  equal((await page.evaluate(() => window.__deliveries)).every(e => !e.ok), true, 'Failure accurately reported');
  ok(loads(requests).length > 0, 'Audit failure does not invent refusal');
});
await suite('invalid-200-acknowledgement', async ({ page, context }) => {
  await context.route('**/audit.php', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":false}' }));
  await page.locator('[data-cc-action="reject"]').click();
  await page.waitForFunction(() => window.__deliveries.some(e => !e.ok));
  equal((await page.evaluate(() => window.__deliveries)).every(e => !e.ok), true, 'HTTP 200 without valid acknowledgement is failure');
});
await suite('mobile-keyboard-modal', async ({ page, requests }) => {
  await page.locator('[data-cc-action="configure"]').focus(); await page.keyboard.press('Enter');
  equal(await page.evaluate(() => document.activeElement.id), 'cookie-settings-title');
  await page.screenshot({ path: '.local/evidence/preferences-mobile.png', fullPage: true });
  equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'No horizontal overflow');
  await page.locator('[data-cc-action="save"]').click(); await page.waitForTimeout(500);
  await page.locator('#open-map-modal').click(); equal(loads(requests), [], 'Dialog map blocked');
  await page.locator('#map-modal [data-cc-map-load="google_maps"]').click(); await page.waitForTimeout(200);
  equal(loads(requests), ['google_maps.html'], 'Dialog permission');
  await page.locator('#map-modal [data-cc-map-revoke="google_maps"]').click(); await page.waitForTimeout(600);
  equal(await page.locator('[data-cc-map-provider] iframe').count(), 0);
}, { viewport: { width: 390, height: 844 } });
// Configuration mutations use real MODX system settings. Never a public mutation URL.
try {
  await suite('dynamic-add-disable', async ({ page, requests }) => {
    await choose(page, ['analytics']);
    const changed = structuredClone(registry);
    changed.services.push({ key: 'extra_ga', loader: 'google_ga4', category: 'analytics', name: 'Дополнительная аналитика', purpose: 'Новая явно раскрытая цель', enabled: true, config: { id: 'G-EXTRA123' } });
    setting('cookie_consent.services', JSON.stringify(changed));
    requests.length = 0; await page.reload({ waitUntil: 'networkidle' });
    equal(await page.locator('[data-cc-provider]').count(),0);equal(await page.evaluate(()=>Boolean(web86CookieConsent.getConsent().providers.extra_ga)),false,'New provider not inherited');ok(await page.locator('[data-cc-action=reject]').isVisible(),'Re-consent requested');await page.locator('[data-cookie-settings-open]').click();await page.locator('[data-cc-category=analytics]').uncheck();await page.locator('[data-cc-category=analytics]').check(); await page.locator('[data-cc-action="save"]').click();
    equal(await page.evaluate(() => Boolean(window.web86CookieConsent.getConsent().providers.extra_ga)), true, 'Explicit new permission');
    changed.services.find(s => s.key === 'yandex').enabled = false; setting('cookie_consent.services', JSON.stringify(changed));
    requests.length = 0; await page.reload({ waitUntil: 'networkidle' }); ok(!loads(requests).includes('yandex.js'), 'Disabled provider not loaded');
    await page.locator('[data-cookie-settings-open]').click(); equal(await page.locator('[data-cc-provider="yandex"]').count(), 0, 'Disabled UI');
  });
  setting('cookie_consent.services', JSON.stringify({ schema: 1, services: [{ ...registry.services[0], name: '<img src=x onerror=alert(1)>' }] }));
  await suite('unsafe-admin-config', async ({ page, requests }) => {
    equal(await page.locator('#cookie-block').count(),0,'Invalid server registry fails closed before rendering'); equal(loads(requests), [], 'Invalid config fails closed');
    equal(await page.locator('[data-cc-provider]').count(), 0);
  });
} finally { setting('cookie_consent.services', JSON.stringify(registry)); }
// Exhaustive allow/deny powerset of all eight enabled service permissions.
// Independent browser contexts/permissions/events: bounded concurrency, no setting mutations.
for(let start=0;start<256;start+=4)await Promise.all(Array.from({length:Math.min(4,256-start)},(_,offset)=>{
  const mask=start+offset;
  return suite(`providers-${mask.toString().padStart(3, '0')}`, async ({ page, requests }) => {
  await page.locator('[data-cc-action="configure"]').click();
  const selected = registry.services.filter((service, i) => mask & (1 << i));
  await page.evaluate(keys=>{const ss=web86Providers.services;const selected=ss.filter(s=>keys.includes(s.key));localStorage.setItem('web86_cookie_consent',JSON.stringify({version:'1',necessary:true,analytics:selected.some(s=>s.category==='analytics'),marketing:selected.some(s=>s.category==='marketing'),external_content:selected.some(s=>s.category==='external_content'),providers:Object.fromEntries(selected.map(s=>[s.key,s.fingerprint])),savedAt:Date.now(),consentId:crypto.randomUUID()}));},selected.map(s=>s.key));requests.length=0;await page.reload({waitUntil:'networkidle'});await page.locator('[data-cc-action=configure]').click();equal(await page.locator('[data-cc-provider]').count(),0);
  await page.locator('[data-cc-action="save"]').click();
  await page.waitForFunction(() => window.__deliveries.some(e => e.ok));
  await page.waitForTimeout(100);
  const expected = [];
  for (const service of selected) {
    if (service.loader === 'google_gtm') { if (mask === 255) expected.push('google_gtm.js'); }
    else if (service.loader === 'yandex') expected.push('yandex.js', 'bitrix24-clientid.js');
    else if (service.loader === 'mock_marketing') expected.push('marketing.js');
    else expected.push(service.loader + (service.category === 'external_content' ? '.html' : '.js'));
  }
  equal(loads(requests), expected.sort(), 'Exact provider powerset network');
  equal(Object.keys(await page.evaluate(() => window.web86CookieConsent.getConsent().providers)).sort(), selected.map(s => s.key).sort(), 'Only selected permission keys');
});
}));
await browser.close();
const failed = results.filter(r => r.result === 'FAIL');
evidence('browser-results', { suite: 'Playwright Chromium / real MODX 2.8.8', assertions, tests: results.length, failed: failed.length, results });
console.log(`${results.length} browser scenarios, ${assertions} assertions, ${failed.length} failures`);
if (failed.length) process.exitCode = 1;
