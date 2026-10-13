import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { origin, docker, setting, evidence, registry } from './helpers.mjs';
const endpoint = origin + '/assets/components/cookieconsent/audit.php';
let assertions = 0;
const results = [];
function check(a, b, message) { assertions++; assert.deepEqual(a, b, message); }
function event(extra = {}) { return { event_id: randomUUID(), consent_id: randomUUID(), event: 'reject', stage: 'committed', analytics: false, marketing: false, policy_version: '1', page: '/', timestamp: new Date().toISOString(), ...extra }; }
async function request(data = event(), options = {}) {
  const response = await fetch(endpoint, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'Sec-Fetch-Site': 'same-origin', 'User-Agent': 'CC-acceptance-test-UA', ...options.headers }, body: JSON.stringify(data), ...Object.fromEntries(Object.entries(options).filter(([k]) => k !== 'headers')) });
  const body = await response.json(); check(response.headers.get('content-type').startsWith('application/json'), true, 'Only JSON, no MODX output');
  return { status: response.status, body, headers: response.headers };
}
async function test(name, callback) {
  try { await callback(); results.push({ name, result: 'PASS' }); console.log(`PASS ${name}`); }
  catch (e) { results.push({ name, result: 'FAIL', error: e.message }); console.error(`FAIL ${name}: ${e.message}`); }
}
function php(code, ...args) { return docker(['web', 'php', '-r', 'require_once "/opt/cc-source/server/src/CookieConsentAuditFormat.php";'+code, ...args]); }
function privateDir(name, mode = 0o700) {
  const path = '/opt/cc-private/' + name;
  php('if (!is_dir($argv[1])) mkdir($argv[1],0700);chown($argv[1],"www-data");chmod($argv[1],(int)$argv[2]);', path, String(mode)); return path;
}
const normal = '/opt/cc-private/logs';
setting('cookie_consent.services', JSON.stringify(registry));
setting('cookie_consent.log_dir', normal);
try {
  await test('positive-server-jsonl', async () => {
    const e = event(); const response = await request(e, { headers: { 'X-Forwarded-For': '203.0.113.99' } }); check(response.status, 200); check(response.body.ok, true);
    const line = JSON.parse(php('$files=glob("/opt/cc-private/logs/".gmdate("Y-m")."-cookie-consent.log");foreach($files as $f)foreach(CookieConsentAuditFormat::records($f) as $r){if(($r["event_id"]??null)===$argv[1])echo json_encode($r);}', e.event_id));
    check(line.user_agent, 'CC-acceptance-test-UA'); check(line.ip !== '203.0.113.99', true, 'Forwarded IP ignored'); check(line.consent_id, e.consent_id); check(line.server_time.endsWith('Z'), true, 'Server UTC'); check(line.client_time, e.timestamp);
    check(php('$file="/opt/cc-private/logs/".gmdate("Y-m")."-cookie-consent.log";echo decoct(fileperms($file)&0777);'), '600', 'Private file permissions');
    evidence('sanitized-record', { ...line, event_id: '<event UUID>', consent_id: '<consent UUID>', ip: '<local REMOTE_ADDR>', user_agent: '<test UA>' });
  });
  await test('schema2-map', async () => {
    const response = await request(event({ schema: 2, event: 'map_allow', external_content: true, providers: { google_maps: true, yandex_maps: false }, provider: 'google_maps' })); check(response.status, 200);
  });
  for (const [name, options, status] of [
    ['wrong-origin', { headers: { Origin: 'https://evil.test' } }, 403],
    ['missing-origin', { headers: { Origin: '' } }, 403],
    ['null-origin', { headers: { Origin: 'null' } }, 403],
    ['cross-site', { headers: { 'Sec-Fetch-Site': 'cross-site' } }, 403],
    ['same-site', { headers: { 'Sec-Fetch-Site': 'same-site' } }, 403],
    ['wrong-method', { method: 'GET', body: undefined }, 405],
    ['wrong-content-type', { headers: { 'Content-Type': 'text/plain' } }, 415],
    ['malformed-json', { body: '{' }, 400],
    ['list-json', { body: '[]' }, 400],
    ['excess-payload', { body: 'x'.repeat(8193) }, 413],
  ]) await test(name, async () => check((await request(event(), options)).status, status));
  await test('no-fetch-metadata-same-origin', async () => check((await request(event(), { headers: { 'Sec-Fetch-Site': '' } })).status, 200));
  for (const [name, data] of [
    ['extra-ip', event({ ip: '203.0.113.99' })], ['extra-config', event({ log_dir: normal })],
    ['invalid-uuid', event({ event_id: 'x' })], ['wrong-stage', event({ stage: 'draft' })],
    ['wrong-type', event({ analytics: 'true' })], ['invalid-calendar', event({ timestamp: '2026-99-99T00:00:00.000Z' })],
    ['query-pii', event({ page: '/?email=x' })],
    ['map-wrong-category', event({ schema: 2, event: 'map_allow', external_content: true, providers: { yandex: true }, provider: 'yandex' })],
    ['unknown-provider', event({ schema: 2, event: 'map_allow', external_content: true, providers: { arbitrary_js: true }, provider: 'arbitrary_js' })],
  ]) await test(name, async () => check((await request(data)).status, 400));
  await test('replay', async () => { const e = event(); check((await request(e)).status, 200); check((await request(e)).status, 409); });
  await test('concurrent-append-and-replay', async () => {
    const events = Array.from({ length: 20 }, () => event()); const responses = await Promise.all(events.map(e => request(e))); check(responses.map(r => r.status), Array(20).fill(200));
    const ids = events.map(e => e.event_id); const written = JSON.parse(php('$ids=json_decode($argv[1],true);$found=[];foreach(glob("/opt/cc-private/logs/".gmdate("Y-m")."-cookie-consent.log") as $f)foreach(CookieConsentAuditFormat::records($f) as $r){if(in_array($r["event_id"],$ids,true))$found[]=$r["event_id"];}echo json_encode($found);', JSON.stringify(ids)));
    check(written.length, 20); check(new Set(written).size, 20);
    const replay = event(); const duplicates = await Promise.all(Array.from({ length: 8 }, () => request(replay))); check(duplicates.map(r => r.status).sort(), [200, 409, 409, 409, 409, 409, 409, 409]);
  });
  const safe = privateDir('logs-new');
  await test('setting-change-preserves-archives', async () => {
    php('file_put_contents("/opt/cc-private/logs/2020-01-cookie-consent.log","archive-sentinel\n");touch("/opt/cc-private/logs/2020-01-cookie-consent.log",time()-86400*365);');
    setting('cookie_consent.log_dir', safe); const e = event(); check((await request(e)).status, 200);
    check(php('echo file_get_contents("/opt/cc-private/logs/2020-01-cookie-consent.log");'), 'archive-sentinel\n');
    check(php('echo is_file("/opt/cc-private/logs-new/".gmdate("Y-m")."-cookie-consent.log")?"yes":"no";'), 'yes');
  });
  await test('webroot-path-without-HTTP-protection',async()=>{
    const path='/var/www/html/logs/http-acceptance';php('if(!is_dir($argv[1]))mkdir($argv[1],0755,true);chown($argv[1],"www-data");',path);setting('cookie_consent.log_dir',path);check((await request()).status,200);check(php('echo is_file($argv[1]."/".gmdate("Y-m")."-cookie-consent.log")&&!file_exists($argv[1]."/.htaccess")?"yes":"no";',path),'yes');
  });
  for (const [name, path] of [
    ['relative-path', 'relative/logs'], ['document-root', '/var/www/html'], ['missing-path', '/opt/cc-private/does-not-exist'],
    ['traversal-path', '/opt/cc-private/logs/../logs'], ['empty-path', ''],
  ]) await test(name, async () => { setting('cookie_consent.log_dir', path); check((await request()).status, 503); });
  await test('symlink-directory', async () => {
    php('if(!is_link("/opt/cc-private/unsafe-link"))symlink("/var/www/html/assets","/opt/cc-private/unsafe-link");');
    setting('cookie_consent.log_dir', '/opt/cc-private/unsafe-link'); check((await request()).status, 503);
  });
  await test('permission-denied-directory', async () => { setting('cookie_consent.log_dir', privateDir('read-only', 0o500)); check((await request()).status, 503); });
  await test('symlink-monthly-file', async () => {
    const path = privateDir('symlink-file'); php('file_put_contents("/opt/cc-private/sentinel","untouched");$f=$argv[1]."/".gmdate("Y-m")."-cookie-consent.log";if(!is_link($f))symlink("/opt/cc-private/sentinel",$f);', path);
    setting('cookie_consent.log_dir', path); check((await request()).status, 503); check(php('echo file_get_contents("/opt/cc-private/sentinel");'), 'untouched');
  });
  await test('unwritable-monthly-file', async () => {
    const path = privateDir('file-failure'); php('$f=$argv[1]."/".gmdate("Y-m")."-cookie-consent.log";if(is_file($f))chmod($f,0600);file_put_contents($f,"old-record\n");chmod($f,0400);', path);
    setting('cookie_consent.log_dir', path); check((await request()).status, 503); check(php('echo file_get_contents($argv[1]."/".gmdate("Y-m")."-cookie-consent.log");', path), 'old-record\n');
  });
  await test('rate-limit', async () => {
    const path = privateDir('limiter-' + randomUUID()); setting('cookie_consent.log_dir', path);
    php('$c=require "/opt/cc-private/config.php";$c["rate_limit_per_minute"]=1;file_put_contents("/opt/cc-private/config.php","<?php return ".var_export($c,true).";");');
    // Apache OPcache revalidates changed private PHP config every two seconds.
    await delay(2200);
    check((await request()).status, 200); const r = await request(); check(r.status, 429); check(r.headers.get('retry-after'), '60');
  });
  await test('upgrade-preserves-settings', async () => {
    setting('cookie_consent.log_dir', safe);
    const output = docker(['web', 'php', '/opt/cc-source/server/bin/install-modx2.php', '/var/www/html', normal]);
    check(output.includes('Preserved cookie_consent.log_dir'), true);
    check(php('define("MODX_API_MODE",true);ob_start();require "/var/www/html/index.php";while(ob_get_level())ob_end_clean();echo $modx->getObject("modSystemSetting",["key"=>"cookie_consent.log_dir"])->get("value");'), safe);
  });
} finally {
  setting('cookie_consent.log_dir', normal);
  php('$c=require "/opt/cc-private/config.php";$c["rate_limit_per_minute"]=10000;file_put_contents("/opt/cc-private/config.php","<?php return ".var_export($c,true).";");');
  await delay(2200);
}
evidence('http-results', { suite: 'HTTP through real MODX wrapper', assertions, tests: results.length, failed: results.filter(r => r.result === 'FAIL').length, results });
console.log(`${results.length} HTTP scenarios, ${assertions} assertions`);
if (results.some(r => r.result === 'FAIL')) process.exitCode = 1;
