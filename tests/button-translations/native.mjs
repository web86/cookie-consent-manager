import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { chromium } from 'playwright';

const [casePath, candidate] = process.argv.slice(2);
assert.ok(casePath && candidate, 'Usage: node tests/button-translations/native.mjs CASE_DIR CONTAINER_ZIP_PATH');
const directory = resolve(casePath);
const composeArgs = ['compose', '--env-file', resolve(dirname(directory), 'compose.env'), '-f', resolve(directory, 'compose.json')];
const service = basename(directory);
const run = (fixture, ...args) => execFileSync('docker', [...composeArgs, 'exec', '-T', '-u', 'www-data', service,
  'php', '/opt/cc-source/tests/' + fixture + '/fixture.php', ...args], { encoding: 'utf8' }).trim();
const control = (...args) => run('button-translations', ...args);
const snapshot = () => JSON.parse(control('snapshot'));
const translations = {
  reject: 'Alles weigeren',
  configure: 'Instellingen',
  accept_all: 'Alles accepteren',
  accept: 'Accepteren',
  save: 'Voorkeuren opslaan',
  back: 'Terug',
  reopen: 'Cookie-instellingen',
  settings_title: 'Cookie-instellingen',
  settings_intro: 'Kies welke cookies je toestaat.',
  region_label: 'Cookietoestemming',
  necessary_aria: 'Noodzakelijke cookies: altijd actief',
};
const quotes = "Instellingen & 'keuze' \"cookie\" [voorbeeld] {voorbeeld}";
const audit = [];
const poll = async (read, expected) => {
  for (let i = 0; i < 100; i++) {
    if (await read() === expected) return;
    await new Promise(done => setTimeout(done, 50));
  }
  assert.equal(await read(), expected);
};

control('seed');
const original = snapshot();
run('modstore', 'install', candidate);
assert.deepEqual(snapshot(), original, 'Native upgrade preserves translation, button and registry setting bytes');
console.log('PASS native transport upgrade preserves existing settings');
const origin = 'http://127.0.0.1:' + JSON.parse(readFileSync(resolve(directory, 'compose.json'))).services[service].environment.CC_MODSTORE_PORT;
const credentials = JSON.parse(readFileSync(resolve(directory, 'private/manager.json')));
const browser = await chromium.launch();
try {
  const manager = await browser.newContext();
  await manager.route('**/*', route => route.request().url().startsWith(origin + '/') ? route.continue() : route.abort());
  const page = await manager.newPage();
  await page.goto(origin + '/manager/');
  await page.locator('#modx-login-username').fill(credentials.username);
  await page.locator('#modx-login-password').fill(credentials.password);
  await page.locator('#modx-login-btn').click();
  await page.waitForFunction(() => window.MODx?.siteId);
  await page.goto(origin + '/manager/?a=index&namespace=cookie_consent');
  const openTexts = () => page.locator('#ccm-tab-texts').click();
  const select = page.locator('#ccm-edit-language');
  const field = key => page.locator('[data-text-key="' + key + '"]');
  const preview = page.frameLocator('#ccm-preview-frame');
  const choosePreview = state => page.locator('[data-preview-state="' + state + '"]').click();
  const previewText = (selector, text) => poll(() => preview.locator(selector).textContent({ timeout: 5000 }), text);
  await openTexts();
  const managerSaveLabel = await page.locator('#ccm-save').textContent();
  await select.selectOption('nl');
  assert.equal(await field('banner_title').inputValue(), 'Cookies op deze website');
  for (const [key, value] of Object.entries(translations)) {
    assert.equal(await field(key).count(), 1, 'Editable nl field ' + key);
    await field(key).fill(value);
  }
  await previewText('.cookie-warning-buttons button:first-child', translations.reject);
  await previewText('.cookie-warning-buttons button:nth-child(2)', translations.configure);
  await previewText('.cookie-warning-buttons button:nth-child(3)', translations.accept_all);
  await previewText('[data-cookie-settings-open]', translations.reopen);
  await choosePreview('preferences');
  await previewText('.cookie-warning-settings h2', translations.settings_title);
  await previewText('.cookie-warning-settings p', translations.settings_intro);
  await previewText('.cookie-warning-settings__buttons button:first-child', translations.back);
  await previewText('.cookie-warning-settings__buttons button:last-child', translations.save);
  assert.equal(await preview.locator('section.cookie-warning').getAttribute('aria-label'), translations.region_label);
  assert.equal(await preview.locator('input[disabled]').getAttribute('aria-label'), translations.necessary_aria);
  assert.equal(await page.locator('#ccm-save').textContent(), managerSaveLabel);
  assert.equal(await page.locator('#ccm-tab-texts').textContent(), 'Тексты');
  assert.deepEqual(snapshot(), original, 'Live preview leaves persisted settings alone');

  const save = async expected => {
    const response = page.waitForResponse(r => new URLSearchParams(r.request().postData() || '').get('action') === 'save');
    await page.locator('#ccm-save').click();
    assert.equal((await (await response).json()).success, expected);
    await poll(() => page.locator('#ccm-status').getAttribute('data-state'), expected ? 'saved' : 'error');
  };
  await field('save').fill('<b>Plain text only</b>');
  await page.waitForFunction(() => document.querySelector('#ccm-preview-status').textContent !== '');
  await poll(() => preview.locator('.cookie-warning-settings__buttons button:last-child').textContent(), translations.save);
  await save(false);
  assert.deepEqual(snapshot(), original, 'Plain HTML is rejected without writing settings');
  await field('save').fill(translations.save);
  await save(true);
  await page.reload();
  await openTexts();
  await select.selectOption('nl');
  for (const [key, value] of Object.entries(translations)) assert.equal(await field(key).inputValue(), value);
  const stored = snapshot();
  assert.deepEqual(JSON.parse(stored['cookie_consent.texts']).locales.nl, { banner_title: 'Cookies op deze website', ...translations });
  for (const key of ['cookie_consent.options', 'cookie_consent.services']) {
    assert.deepEqual(JSON.parse(stored[key]), JSON.parse(original[key]), 'Text changes preserve ' + key);
  }
  console.log('PASS nl editor, live preview, ARIA, strict plain-text validation and save/reload');

  await page.locator('#ccm-custom-language').fill('nl-NL');
  await page.locator('#ccm-custom-language').press('Enter');
  assert.equal(await select.inputValue(), 'nl-nl');
  await field('reject').fill(quotes);
  await field('accept_all').fill('  ');
  await field('configure').fill('');
  await choosePreview('banner');
  await previewText('.cookie-warning-buttons button:first-child', quotes);
  await previewText('.cookie-warning-buttons button:nth-child(2)', 'Настроить');
  await save(true);
  await page.reload();
  await openTexts();
  await select.selectOption('nl-nl');
  assert.equal(await field('reject').inputValue(), quotes);
  assert.equal(Object.hasOwn(JSON.parse(snapshot()['cookie_consent.texts']).locales, 'nl-nl'), true);
  await manager.close();
  console.log('PASS regional locale, special characters and fallback in live preview');

  async function publicPage(language) {
    control('language', language);
    const context = await browser.newContext();
    const current = await context.newPage();
    await context.route('https://player.example.test/**', route => route.fulfill({ body: 'Controlled video' }));
    current.on('response', response => {
      if (new URL(response.url()).pathname.endsWith('/audit.php')) {
        const event = response.request().postDataJSON();
        audit.push({ ...event, status: response.status() });
      }
    });
    await current.goto(origin + '/');
    await current.locator('#cookie-block').waitFor({ state: 'visible' });
    return { context, current };
  }
  const action = (site, key) => site.locator('[data-cc-action="' + key.replaceAll('_', '-') + '"]');
  {
    const { context, current: site } = await publicPage('nl');
    for (const key of ['reject', 'configure', 'accept_all']) assert.equal(await action(site, key).textContent(), translations[key]);
    assert.equal(await site.locator('#cookie-block').getAttribute('aria-label'), translations.region_label);
    assert.equal(await site.locator('#reopen').textContent(), translations.reopen);
    assert.equal(await site.locator('#reopen-icon').textContent(), '★' + translations.reopen);
    assert.equal(await site.locator('#site-label').textContent(), 'Site-owned label');
    assert.equal(await site.locator('iframe').count(), 0, 'Strict mode blocks embeds before consent');
    await action(site, 'configure').click();
    assert.equal(await site.locator('#cookie-settings-title').textContent(), translations.settings_title);
    assert.equal(await site.locator('[data-cc-panel=settings] p').textContent(), translations.settings_intro);
    assert.equal(await site.locator('[data-cc-aria=necessary_aria]').getAttribute('aria-label'), translations.necessary_aria);
    assert.equal(await action(site, 'back').textContent(), translations.back);
    assert.equal(await action(site, 'save').textContent(), translations.save);
    await action(site, 'back').click();
    await action(site, 'reject').click();
    assert.equal(await site.locator('iframe').count(), 0);
    await site.locator('#reopen').click();
    await site.locator('[data-cc-category=external_content]').check();
    await action(site, 'save').click();
    await site.locator('iframe').waitFor();
    assert.equal(await site.evaluate(() => web86CookieConsent.getConsent().categories.external_content), true);
    await poll(() => audit.some(event => event.event === 'save_settings' && event.status === 200), true);
    assert.ok(audit.some(event => event.event === 'reject' && event.status === 200));
    await context.close();
  }
  {
    const { context, current: site } = await publicPage('nl-NL');
    assert.equal(await action(site, 'reject').textContent(), quotes);
    assert.equal(await action(site, 'configure').textContent(), 'Настроить');
    assert.equal(await action(site, 'accept_all').textContent(), 'Принять все');
    await action(site, 'accept_all').click();
    await site.locator('iframe').waitFor();
    await poll(() => audit.some(event => event.event === 'accept_all' && event.status === 200), true);
    await context.close();
  }
  for (const [language, reject, configure] of [
    ['ru', 'Особый отказ', 'Настроить'], ['en', 'Custom refusal', 'Configure'],
  ]) {
    const { context, current: site } = await publicPage(language);
    assert.equal(await action(site, 'reject').textContent(), reject);
    assert.equal(await action(site, 'configure').textContent(), configure);
    await context.close();
  }
  control('legacy');
  {
    const { context, current: site } = await publicPage('nl');
    assert.equal(await action(site, 'accept').textContent(), translations.accept);
    await action(site, 'accept').click();
    await poll(() => audit.some(event => event.event === 'accept' && event.status === 200), true);
    assert.equal(await site.evaluate(() => web86CookieConsent.getConsent().categories.external_content), true);
    await context.close();
  }
  console.log('PASS public cultureKey, RU/EN, reopen, Strict/Legacy actions, embed gating and audit delivery');
} finally {
  await browser.close();
}
