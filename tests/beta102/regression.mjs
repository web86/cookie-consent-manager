// Sequential shared-main acceptance after the actual beta ZIP install. Vendor traffic is intercepted.
import {execFileSync} from 'node:child_process';import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const out='.local/beta102/evidence';mkdirSync(out,{recursive:true});
const cases=[
 ['browser','tests/browser.mjs','.local/evidence/browser-results.json'],
 ['categories','tests/beta33/public.mjs','.local/beta33-evidence/public-results.json'],
 ['managerCategories','tests/beta33/manager.mjs','.local/beta33-evidence/manager-results.json'],
 ['callbacks','tests/beta32/callbacks.mjs','.local/beta32-evidence/callbacks-results.json'],
 ['maps','tests/beta32/maps.mjs','.local/beta32-evidence/maps-results.json'],
 ['clientIdExample','tests/beta33/clientid.mjs','.local/beta33-evidence/clientid-results.json'],
 ['localization','tests/beta28/localization.mjs','.local/beta28-evidence/localization-results.json'],
 ['publicJson','tests/beta29/public-json.mjs','.local/beta29-evidence/public-json-results.json'],
 ['liveGuard','tests/live-guard.mjs','.local/evidence/live-guard-results.json'],
 ['providerParameters','tests/provider-parameters.mjs','.local/evidence/provider-parameters-results.json'],
 ['pixels','tests/beta31/pixels.mjs','.local/beta31-evidence/pixels-results.json'],
 ['frontend','tests/beta26/frontend.mjs','.local/beta26-evidence/frontend-results.json'],
 ['viewer','tests/viewer/browser.mjs','.local/viewer-evidence/results.json'],
 ['managerUI','tests/polish/ui.mjs','.local/polish-evidence/ui-results.json'],
 ['managerPermissions','tests/manager-permissions.mjs','.local/evidence/manager-permissions-results.json'],
 ['http','tests/http.mjs','.local/evidence/http-results.json']
];const results=[];
for(const[name,file,path]of cases){console.log('RUN '+name);try{execFileSync('node',[file],{stdio:'inherit'});const r=JSON.parse(readFileSync(path));if(r.failed||r.results?.some(x=>x.result==='FAIL'))throw Error(name+' assertions failed');writeFileSync(`${out}/${name}.json`,JSON.stringify(r,null,2)+'\n');results.push({name,result:'PASS',tests:r.tests??r.results?.length,assertions:r.assertions});console.log('PASS '+name+' '+r.tests+' / '+r.assertions);}catch(e){console.error((e.stderr?.toString()||e.message).slice(-3000));results.push({name,result:'FAIL',error:e.message.slice(0,1500)});process.exitCode=1;}writeFileSync(out+'/regression.json',JSON.stringify({results,failed:results.filter(r=>r.result==='FAIL').length,notRun:['Real published GTM container / live vendor delivery: intentionally not loaded; local SDK/network permission fixtures cover consent behavior']},null,2)+'\n');}
