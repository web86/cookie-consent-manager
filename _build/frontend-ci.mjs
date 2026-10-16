// Frontend-only CI gate. Does not build/install native transport or contact MODX.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync} from 'node:fs';
import {Script} from 'node:vm';

const root = '.local/github-frontend-build';
const artifact = root + '/artifact';
const manifestPath = '_build/frontend-manifest.json';
const bundle = 'assets/js/cookie-consent/cookie-consent.min.js';
const css = 'assets/css/cookie-consent.min.css';
const baselinePath = 'tests/frontend-refactor/service-adapters-baseline.json';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const git = (...args) => execFileSync('git', args, {encoding:'utf8'}).trim();
const readJSON = path => JSON.parse(readFileSync(path, 'utf8'));
const checks = [];
const started = new Date().toISOString();
const commit = git('rev-parse', 'HEAD');
const branch = process.env.GITHUB_REF_NAME || git('branch', '--show-current');
const dirty = git('status', '--porcelain') !== '';
mkdirSync(root, {recursive:true});
rmSync(artifact, {recursive:true, force:true});
// Never accept evidence left by an earlier run.
rmSync(root + '/tests', {recursive:true, force:true});
let manifest;
let passed = false;

function run(command, args, env = {}) {
  console.log('+', command, ...args);
  execFileSync(command, args, {stdio:'inherit', env:{...process.env, ...env}, timeout:300_000});
}
function check(name, fn) {
  try { fn(); checks.push('PASS ' + name); console.log('PASS ' + name); }
  catch (error) { checks.push('FAIL ' + name + ': ' + error.message); throw error; }
}
function verifyManifest() {
  const value = readJSON(manifestPath);
  assert.equal(value.tool, 'esbuild');
  assert.equal(value.version, '0.28.2');
  // Every production source must be present. Mocks are fixtures, not bundle inputs.
  const jsDir = 'assets/js/cookie-consent/';
  const sources = readdirSync(jsDir).filter(p => p.endsWith('.js') && !p.endsWith('.min.js')).map(p => jsDir + p)
    .concat(readdirSync(jsDir + 'services').filter(p => p.endsWith('.js')).map(p => jsDir + 'services/' + p))
    .concat(readdirSync(jsDir + 'embeds').filter(p => p.endsWith('.js')).map(p => jsDir + 'embeds/' + p));
  assert.deepEqual(Object.keys(value.inputs).sort(), [...sources, 'assets/css/cookie-consent.css', 'package-lock.json', '_build/frontend.mjs'].sort());
  assert.deepEqual(Object.keys(value.outputs).sort(), [bundle, css].sort());
  for (const [path, hash] of Object.entries(value.inputs)) assert.equal(sha(readFileSync(path)), hash, path + ' source SHA256');
  for (const [path, info] of Object.entries(value.outputs)) {
    const bytes = readFileSync(path);
    assert.equal(sha(bytes), info.sha256, path + ' output SHA256');
    assert.equal(bytes.length, info.bytes, path + ' output bytes');
  }
  return value;
}

try {
  check('checkout and pinned toolchain', () => {
    assert.match(branch, /^codex\/modx2-/);
    if (process.env.GITHUB_SHA) assert.equal(commit, process.env.GITHUB_SHA);
    if (process.env.GITHUB_ACTIONS === 'true') assert.equal(dirty, false, 'CI must start from a clean checkout');
    assert.equal(process.versions.node, '22.23.2');
    const pkg = readJSON('package.json');
    assert.equal(pkg.scripts['build:frontend'], 'node _build/frontend.mjs');
    assert.equal(pkg.devDependencies.esbuild, '0.28.2');
    assert.equal(pkg.devDependencies.playwright, '1.62.1');
    assert.equal(readJSON('node_modules/esbuild/package.json').version, '0.28.2');
    assert.equal(readJSON('node_modules/playwright/package.json').version, '1.62.1');
  });
  const committedManifest = readFileSync(manifestPath);
  check('npm run build:frontend', () => run('npm', ['run', 'build:frontend']));
  check('manifest coverage, source SHA256, bundle SHA256 and sizes', () => { manifest = verifyManifest(); });
  checks.push('INFO committed manifest ' + (committedManifest.equals(readFileSync(manifestPath)) ? 'already current' : 'regenerated from selected sources; stale committed output is allowed'));
  check('JavaScript syntax; single classic bundle without imports or chunks', () => {
    for (const path of [...Object.keys(manifest.inputs).filter(p => p.endsWith('.js')), bundle]) {
      const source = readFileSync(path, 'utf8');
      new Script(source, {filename:path});
      assert.doesNotMatch(source, /\bimport\s*\(/, path + ' dynamic import');
    }
    for (const path of ['_build/frontend.mjs', '_build/frontend-ci.mjs', 'tests/frontend-refactor/equivalence.mjs']) run(process.execPath, ['--check', path]);
  });
  check('bundle corresponds to sources; second build is byte-for-byte reproducible', () => {
    const first = new Map([manifestPath, ...Object.keys(manifest.outputs)].map(path => [path, readFileSync(path)]));
    run('npm', ['run', 'build:frontend']);
    verifyManifest();
    for (const [path, bytes] of first) assert.ok(bytes.equals(readFileSync(path)), path + ' differs on second build');
  });
  check('existing isolated adapter / Strict / Legacy differential tests (--focused)', () => {
    run(process.execPath, ['tests/video-embeds/differential.mjs', '--focused'], {CC_REFACTOR_EVIDENCE:root + '/tests'});
    const evidence = readJSON(root + '/tests/equivalence.json');
    assert.equal(evidence.failed, 0);
    assert.equal(evidence.tests, 19, 'All focused scenarios must run');
    assert.equal(evidence.candidateSHA256, manifest.outputs[bundle].sha256);
    checks.push(`INFO differential: ${evidence.tests} scenarios, ${evidence.assertions} assertions; SDK/HTTP requests fulfilled locally`);
  });
  check('public API surface and callback contract (video differential, preserved beta4 API)', () => {
    // The video harness also explicitly asserts mountEmbeds; it compares all old APIs
    // and callback results at every checkpoint in all
    // scenarios. Also assert explicit names against the recorded public contract.
    const baseline = readJSON(baselinePath);
    assert.equal(baseline.commit, 'de41eaa0f976c54c0d2836b605c7474ad874c472');
    const points = readJSON(root + '/tests/comparison-last.json').candidate.checkpoints;
    assert.ok(points.length > 0);
    for (const point of points) {
      assert.deepEqual(point.state.api, baseline.public.web86CookieConsent);
      assert.deepEqual(point.state.providers, baseline.public.web86Providers);
      assert.deepEqual(point.state.frozen, [true, true]);
    }
  });
  check('final output hashes after tests', () => { manifest = verifyManifest(); });
  mkdirSync(artifact, {recursive:true});
  copyFileSync(bundle, artifact + '/cookie-consent.min.js');
  copyFileSync(manifestPath, artifact + '/frontend-manifest.json');
  writeFileSync(artifact + '/cookie-consent.min.js.sha256', manifest.outputs[bundle].sha256 + '  cookie-consent.min.js\n');
  passed = true;
} catch (error) {
  console.error(error.stack);
  process.exitCode = 1;
} finally {
  checks.push(
    'SKIP tests/frontend-refactor/build.mjs: requires native ZIP/inventory; frontend hash/rebuild checks performed above',
    'SKIP tests/legacy-autoload/{browser,matrix}.mjs and tests/universal/regression.mjs: require MODX/PHP/DB fixtures',
    'SKIP native/PHP/Fenom/Manager/upgrade acceptance and real vendor delivery: outside frontend-only scope'
  );
  const report = [
    'CMP — Frontend Build',
    'Result: ' + (passed ? 'PASS (frontend-only; not full regression)' : 'FAIL'),
    'Branch: ' + branch, 'Commit: ' + commit,
    'Working tree at start: ' + (dirty ? 'DIRTY (local preview, not a committed build)' : 'clean'),
    'Started UTC: ' + started, 'Finished UTC: ' + new Date().toISOString(),
    'Node: ' + process.version,
    'npm: ' + execFileSync('npm', ['--version'], {encoding:'utf8'}).trim(),
    'Platform: ' + process.platform + '/' + process.arch,
    'Run: ' + (process.env.GITHUB_RUN_ID || 'local') + ' / attempt ' + (process.env.GITHUB_RUN_ATTEMPT || '1'),
    '', ...checks, '',
    ...Object.entries(manifest?.outputs || {}).map(([path, info]) => `${path}: ${info.bytes} bytes; SHA256 ${info.sha256}`),
    'CSS is rebuilt/verified by the existing builder but intentionally excluded from the JS artifact.',
    'Manifest bytes: ' + (manifest ? readFileSync(manifestPath).length : 'unavailable'), ''
  ].join('\n');
  writeFileSync(root + '/build-report.txt', report);
  if (passed) writeFileSync(artifact + '/build-report.txt', report);
  console.log(report);
}
