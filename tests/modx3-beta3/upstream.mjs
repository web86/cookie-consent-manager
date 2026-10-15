// Reproduce pdoTools compiled-cache failure with no Cookie Consent snippet, JSON or audit code.
import {cli} from '../modx3/helpers.mjs';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const results=[];
for(const service of ['clean','php82']){
 cli(service,['php','/opt/cc-source/tests/modx3-beta3/control.php','parser','fenom','all']);
 const run=()=>{try{return{exit:0,stdout:cli(service,['php','/opt/cc-source/tests/modx3-beta3/control.php','upstream-cache-probe'])};}catch(e){return{exit:e.status,stdout:String(e.stdout),stderr:String(e.stderr)};}};
 const cold=run(),warm=run();assert.equal(cold.exit,0);assert.equal(cold.stdout,'"Hello world"');assert.notEqual(warm.exit,0);assert.match(warm.stderr+/\n/+warm.stdout,/Undefined variable \$fenom|Fenom\\Render::__construct/);
 results.push({service,metadata:JSON.parse(cli(service,['php','/opt/cc-source/tests/modx3-beta3/control.php','metadata'])),cold,warm,result:'CONFIRMED_UPSTREAM_FAILURE'});console.log('CONFIRMED pdoTools cold succeeds / warm fails without Cookie Consent: '+service);
}
writeFileSync('.local/modx3/evidence/beta3-upstream.json',JSON.stringify({probe:'Hello {$name}',dependency:'unmodified official pdotools-3.1.0-pl',results},null,2)+'\n');
