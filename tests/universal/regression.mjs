// Current-model suites are sequential because they share one disposable MODX database.
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
const out='.local/universal-evidence/regression';mkdirSync(out,{recursive:true});
const cases=process.argv.slice(2).length?process.argv.slice(2):['tests/universal/browser.mjs','tests/universal/audit.mjs','tests/http.mjs','tests/browser.mjs','tests/beta32/callbacks.mjs','tests/beta26/frontend.mjs','tests/beta28/localization.mjs','tests/beta33/manager.mjs','tests/beta31/manager.mjs','tests/manager-i18n.mjs','tests/manager-permissions.mjs','tests/viewer/browser.mjs','tests/universal/matrix.mjs','tests/beta32/maps.mjs','tests/provider-parameters.mjs','tests/beta31/pixels.mjs','tests/beta33/clientid.mjs','tests/manager-ux.mjs','tests/live-guard.mjs','tests/beta33/public.mjs'];
const results=[];
for(const path of cases){console.log('RUN '+path);try{const output=execFileSync('node',[path],{encoding:'utf8',maxBuffer:8*1024*1024});writeFileSync(out+'/'+path.replaceAll('/','-')+'.log',output);results.push({path,result:'PASS'});console.log('PASS '+path);}catch(e){const output=(e.stdout||'')+(e.stderr||'');writeFileSync(out+'/'+path.replaceAll('/','-')+'.log',output);results.push({path,result:'FAIL',error:String(e.message).slice(0,200)});console.log('FAIL '+path+'\n'+output.slice(-2600));}}
writeFileSync(out+'/results.json',JSON.stringify({tests:results.length,failed:results.filter(r=>r.result==='FAIL').length,results},null,2)+'\n');if(results.some(r=>r.result==='FAIL'))process.exitCode=1;
