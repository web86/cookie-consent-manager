// Compare both minifiers on the exact same current 21 inputs, in addition to the
// historical pre-video differential. Preserve every request/state/DOM assertion.
import {execFileSync} from 'node:child_process';import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),bundle='assets/js/cookie-consent/cookie-consent.min.js',source=execFileSync('git',['show',commit+':'+bundle]);
assert.deepEqual(source,readFileSync(bundle),'Commit must contain the current exact release prebuilt');
const out='.local/modx3/evidence/php-vs-current-esbuild';mkdirSync(out,{recursive:true});const baseline=out+'/baseline.json';writeFileSync(baseline,JSON.stringify({commit,sources:{[bundle]:createHash('sha256').update(source).digest('hex')}},null,2)+'\n');
execFileSync('node',['tests/video-embeds/differential.mjs'],{stdio:'inherit',env:{...process.env,CC_REFACTOR_BASELINE:baseline,CC_REFACTOR_CANDIDATE:'.local/adapter-cache/production.js',CC_REFACTOR_EVIDENCE:out}});
