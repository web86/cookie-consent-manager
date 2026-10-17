// Execute both platforms' pinned shared rendering contracts in isolated PHP processes.
// No CMS database, installed site or persistent file in the MODX 2 checkout is touched.
import {dirname} from 'node:path';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {writeFileSync} from 'node:fs';
const source=process.env.CC_MODX2_SOURCE||dirname(execFileSync('git',['rev-parse','--path-format=absolute','--git-common-dir'],{encoding:'utf8'}).trim()),expected='24fb052c83aefe2966f236ba5a466782458f48ed';
assert.equal(execFileSync('git',['-C',source,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),expected,'MODX 2 checkout remains the pinned reference');
const results=[];let assertions=0;
for(const lang of ['ru','en'])for(const mode of ['strict','legacy'])for(const category of ['analytics','marketing','external_content'])for(const profile of ['default','custom']){
 const args=[lang,mode,category,profile],run=file=>JSON.parse(execFileSync('php',[file,...args],{encoding:'utf8',env:{...process.env,TMPDIR:'/private/tmp'}}));
 const old=run(source+'/tests/placeholder-texts/fixture.php'),current=run('tests/placeholder-texts/fixture.php');assertions++;assert.deepEqual(current,old,'PHP rendering/text/snippet/registry parity '+args.join('-'));results.push({name:args.join('-'),result:'PASS'});
}
const report={source:expected,tests:results.length,assertions,failed:0,results};writeFileSync('.local/modx3/evidence/php-differential.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({tests:results.length,assertions,failed:0}));
