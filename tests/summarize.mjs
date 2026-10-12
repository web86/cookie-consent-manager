// Export only sanitized summaries, never raw HAR, credentials or JSONL IP/UA.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const suites = ['php', 'http', 'browser', 'manager', 'live-guard'];
const results = Object.fromEntries(suites.map(name => [name, JSON.parse(readFileSync(`.local/evidence/${name}-results.json`, 'utf8'))]));
for (const [name, result] of Object.entries(results)) {
  if (result.failed || result.result === 'FAIL') throw Error(`Cannot publish successful evidence: ${name} failed`);
}
let harEntries = 0;
for (const scenario of results.browser.results) {
  const har = JSON.parse(readFileSync(`.local/evidence/${scenario.name}.har`, 'utf8'));
  const entries = har.log.entries;
  if (entries.some(entry => new URL(entry.request.url).origin !== 'http://127.0.0.1:8888')) throw Error('External mock HAR entry: ' + scenario.name);
  scenario.observedRequestWindowCount = scenario.networkRequests;
  delete scenario.networkRequests;
  scenario.harEntryCount = entries.length;
  harEntries += entries.length;
}
const logSummary = JSON.parse(readFileSync('.local/evidence/log-summary.json', 'utf8'));
const record = JSON.parse(readFileSync('.local/evidence/sanitized-record.json', 'utf8'));
const data = { date: '2026-10-12', baseMain: '7ef77d35b7b24f607bd73e433d46dd982c982ace', environment: { modx: '2.8.8-pl', php: '8.2.34', mariadb: '10.6', playwright: '1.62.1', browser: 'Chromium', fixture: 'loopback, mock, private core/logs' }, assertions: Object.values(results).reduce((n, r) => n + r.assertions, 0), suites: results, sanitizedSchema1Record: record, logSummary, network: { thirdPartyContact: 'none; mock routes block outside origin, live routes fulfill every external URL locally', publicMockExternalAttempts: 0, managerBlockedHosts: results.manager.blockedManagerHosts, publicMockHarEntryCount: harEntries } };
mkdirSync('docs/evidence', { recursive: true });
writeFileSync('docs/evidence/modx2-results.json', JSON.stringify(data, null, 2) + '\n');
console.log(JSON.stringify({ assertions: data.assertions, publicMockHarEntryCount: data.network.publicMockHarEntryCount, suites: Object.fromEntries(Object.entries(results).map(([k, r]) => [k, { tests: r.tests, assertions: r.assertions, failed: r.failed || 0 }])) }));
