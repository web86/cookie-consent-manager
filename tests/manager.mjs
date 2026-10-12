import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { origin, docker, registry, setting, evidence } from './helpers.mjs';
let assertions = 0; const results = [];
function equal(a, b, message) { assertions++; assert.deepEqual(a, b, message); }
const credentials = JSON.parse(docker(['web', 'php', '-r', 'echo file_get_contents("/opt/cc-private/manager.json");']));
const browser = await chromium.launch();
const ctx = await browser.newContext();
const external = [];
await ctx.route('**/*', route => {
  if (new URL(route.request().url()).origin !== origin) { external.push(route.request().url()); return route.abort(); }
  return route.continue();
});
const p = await ctx.newPage();
async function editRegistry(value) {
  const row = p.locator('.x-grid3-row').filter({ hasText: 'cookie_consent.services' });
  await row.locator('td').nth(3).dblclick();
  const editor = p.locator('textarea:visible');
  await editor.fill(JSON.stringify(value));
  const response = p.waitForResponse(r => r.url().includes('/connectors/') && (r.request().postData() || '').includes('updatefromgrid'));
  await editor.press('Tab');
  const json = await (await response).json(); equal(json.success, true, 'Authenticated native Manager write');
}
try {
  await p.goto(origin + '/manager/', { waitUntil: 'networkidle' });
  await p.locator('#modx-login-username').fill(credentials.username); await p.locator('#modx-login-password').fill(credentials.password);
  await p.getByRole('button', { name: 'Login', exact: true }).click(); await p.waitForTimeout(800);
  await p.goto(origin + '/manager/?a=system/settings&ns=cookie_consent', { waitUntil: 'networkidle' });
  equal(await p.locator('.x-grid3-row').count(), 4, 'Namespaced settings visible');
  await p.screenshot({ path: '.local/evidence/modx-manager-settings.png', fullPage: true });
  const changed = structuredClone(registry); changed.services.push({ key: 'manager_added', name: 'Сервис из MODX Manager', purpose: 'Проверка добавления через интерфейс', category: 'analytics', enabled: true, loader: 'google_ga4', config: { id: 'G-MANAGER1' } });
  await editRegistry(changed);
  const front = await ctx.newPage(); await front.goto(origin, { waitUntil: 'networkidle' });
  await front.locator('[data-cc-action="configure"]').click();
  equal(await front.locator('[data-cc-provider="manager_added"]').count(), 1, 'New service in preferences');
  equal(await front.locator('[data-cc-provider="manager_added"]').isChecked(), false, 'Added service defaults off');
  results.push({ name: 'native-manager-add', result: 'PASS' });
  changed.services.find(s => s.key === 'manager_added').enabled = false;
  await editRegistry(changed); await front.reload({ waitUntil: 'networkidle' });
  equal(await front.locator('[data-cc-provider="manager_added"]').count(), 0, 'Disabled service removed');
  results.push({ name: 'native-manager-disable', result: 'PASS' });
  const unauth = await fetch(origin + '/connectors/index.php', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ action: 'system/settings/update', key: 'cookie_consent.services', value: '{}' }) });
  const body = await unauth.json(); equal(body.success, false, 'Unauthenticated config mutation refused');
  const current = JSON.parse(docker(['web', 'php', '-r', 'define("MODX_API_MODE",true);ob_start();require "/var/www/html/index.php";while(ob_get_level())ob_end_clean();echo $modx->getObject("modSystemSetting",["key"=>"cookie_consent.services"])->get("value");']));
  equal(current, changed, 'Setting unchanged after unauthenticated mutation');
  results.push({ name: 'unauthenticated-admin-mutation', result: 'PASS' });
  // MODX Manager itself requests an admin Gravatar avatar. All such traffic
  // was aborted by the route; public consent pages never request it.
  equal(external.every(url => new URL(url).hostname === 'www.gravatar.com'), true, 'Only known blocked Manager avatar host');
  results.push({ name: 'manager-profile-avatar-blocked-by-test', result: 'PASS' });
} catch (e) { results.push({ name: 'manager-integration', result: 'FAIL', error: e.message }); console.error(e.message); }
finally { setting('cookie_consent.services', JSON.stringify(registry)); await browser.close(); }
evidence('manager-results', { suite: 'Native MODX Manager UI', assertions, tests: results.length, blockedManagerHosts: [...new Set(external.map(url => new URL(url).hostname))], failed: results.filter(r => r.result === 'FAIL').length, results });
console.log(`${results.length} Manager scenarios, ${assertions} assertions`);
if (results.some(r => r.result === 'FAIL')) process.exitCode = 1;
