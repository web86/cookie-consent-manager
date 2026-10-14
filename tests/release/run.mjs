// Sequential execution prevents shared MODX setting races. No vendor delivery is claimed.
import {execFileSync} from 'node:child_process';import {readFileSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
const out='.local/release100-evidence';mkdirSync(out,{recursive:true});writeFileSync(out+'/main-running','sequential main fixture suites');const cases=[
['categories','node',['tests/beta33/public.mjs'],'.local/beta33-evidence/public-results.json'],
['managerCategories','node',['tests/beta33/manager.mjs'],'.local/beta33-evidence/manager-results.json'],
['clientIdExample','node',['tests/beta33/clientid.mjs'],'.local/beta33-evidence/clientid-results.json'],
['browser','node',['tests/browser.mjs'],'.local/evidence/browser-results.json'],
['http','node',['tests/http.mjs'],'.local/evidence/http-results.json'],
['liveGuard','node',['tests/live-guard.mjs'],'.local/evidence/live-guard-results.json'],
['providerParameters','node',['tests/provider-parameters.mjs'],'.local/evidence/provider-parameters-results.json'],
['pixels','node',['tests/beta31/pixels.mjs'],'.local/beta31-evidence/pixels-results.json'],
['gtm','node',['tests/beta31/gtm.mjs'],'.local/beta31-evidence/gtm-results.json'],
['callbacks','node',['tests/beta32/callbacks.mjs'],'.local/beta32-evidence/callbacks-results.json'],
['jsMaps','node',['tests/beta32/maps.mjs'],'.local/beta32-evidence/maps-results.json'],
['frontend','node',['tests/beta26/frontend.mjs'],'.local/beta26-evidence/frontend-results.json'],
['localization','node',['tests/beta28/localization.mjs'],'.local/beta28-evidence/localization-results.json'],
['viewer','node',['tests/viewer/browser.mjs'],'.local/viewer-evidence/results.json'],
];const results=[];
try{for(const[name,cmd,args,path]of cases){console.log('RUN '+name);const output=execFileSync(cmd,args,{encoding:'utf8',maxBuffer:4*1024*1024});const r=JSON.parse(readFileSync(path));if(r.failed||r.result==='FAIL'||r.results?.some(x=>x.result==='FAIL'))throw Error(name+' reported FAIL');r.execution_date=new Date().toISOString();r.signature='cookieconsent-1.0.0';delete r.snapshots;writeFileSync(out+'/'+name+'.json',JSON.stringify(r,null,2));results.push({name,result:'PASS',tests:r.tests??r.results?.length??1,assertions:r.assertions??0});console.log('PASS '+name+' '+(r.tests??r.results?.length)+' / '+r.assertions);}}
catch(e){console.error(e.stderr?.toString()||e.message);results.push({result:'FAIL',error:e.message});process.exitCode=1}finally{rmSync(out+'/main-running',{force:true});writeFileSync(out+'/run.json',JSON.stringify({results,failed:results.filter(x=>x.result==='FAIL').length},null,2))}
