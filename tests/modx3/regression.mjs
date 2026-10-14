// Existing assertions run sequentially against the named MODX 3 fixture.
import {execFileSync} from 'node:child_process';import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {cli} from './helpers.mjs';
cli('web',['php','/opt/cc-source/tests/modx3/guard.php']);
const dir='.local/modx3/evidence';mkdirSync(dir,{recursive:true});
for(const d of ['beta31-evidence','beta32-evidence','beta33-evidence','beta26-evidence','beta28-evidence','viewer-evidence','polish-evidence','locale-guide-evidence'])mkdirSync('.local/modx3/'+d,{recursive:true});
const cases=[
 ['http','tests/http.mjs','evidence/http-results.json'],
 ['categories','tests/beta33/public.mjs','beta33-evidence/public-results.json'],
 ['callbacks','tests/beta32/callbacks.mjs','beta32-evidence/callbacks-results.json'],
 ['maps','tests/beta32/maps.mjs','beta32-evidence/maps-results.json'],
 ['frontend','tests/beta26/frontend.mjs','beta26-evidence/frontend-results.json'],
 ['localization','tests/beta28/localization.mjs','beta28-evidence/localization-results.json'],
 ['liveGuard','tests/live-guard.mjs','evidence/live-guard-results.json'],
 ['providerParameters','tests/provider-parameters.mjs','evidence/provider-parameters-results.json'],
 ['pixels','tests/beta31/pixels.mjs','beta31-evidence/pixels-results.json'],
 ['clientIdExample','tests/beta33/clientid.mjs','beta33-evidence/clientid-results.json'],
 ['viewer','tests/viewer/browser.mjs','viewer-evidence/results.json'],
 ['permissions','tests/manager-permissions.mjs','evidence/manager-permissions-results.json'],
 ['guideUI','tests/polish/ui.mjs','polish-evidence/ui-results.json'],
 ['guideExamples','tests/locale-guide/examples.mjs','locale-guide-evidence/examples.json'],
 ['managerI18n','tests/manager-i18n.mjs','manager-i18n-evidence/results.json'],
];
const results=[];let failed=false;
for(const[name,file,path]of cases){
 console.log('RUN '+name);let output='';
 try{output=execFileSync('node',[file],{encoding:'utf8',maxBuffer:8*1024*1024});const r=JSON.parse(readFileSync('.local/modx3/'+path));if(r.failed||r.result==='FAIL'||r.results?.some(x=>x.result==='FAIL'))throw Error('Suite reported FAIL');results.push({name,result:'PASS',tests:r.tests??r.results?.length??1,assertions:r.assertions??0,evidence:path});console.log('PASS '+name+' '+results.at(-1).tests+' / '+results.at(-1).assertions);}
 catch(e){output+=(e.stdout||'')+(e.stderr||'');results.push({name,result:'FAIL',error:e.message});console.error('FAIL '+name);failed=true;}
 writeFileSync(dir+'/'+name+'-run.log',output);writeFileSync(dir+'/regression.json',JSON.stringify({tests:results.length,failed:results.filter(x=>x.result==='FAIL').length,results},null,2));
 // Subsequent suites retain their own setup/restore and may provide independent evidence.
}
if(failed)process.exitCode=1;
