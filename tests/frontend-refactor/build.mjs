import {readFileSync,writeFileSync,readdirSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';

const out='.local/frontend-refactor';mkdirSync(out,{recursive:true});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const baseline=JSON.parse(readFileSync('tests/frontend-refactor/baseline.json'));
const frontend='_build/frontend-manifest.json';
let assertions=0;
const eq=(a,b,message)=>{assertions++;assert.deepEqual(a,b,message);};
const before=readFileSync(frontend,'utf8');
execFileSync(process.execPath,['_build/frontend.mjs']);
eq(readFileSync(frontend,'utf8'),before,'Rebuild must reproduce committed manifest/output hashes');
const manifest=JSON.parse(before);
eq(Object.keys(manifest.inputs),['runtime.js','script-url.js','provider-registry.js','service-loaders.js','embeds.js','consent-manager.js'].map(x=>'assets/js/cookie-consent/'+x).concat(['assets/css/cookie-consent.css','package-lock.json','_build/frontend.mjs']));
for(const [path,hash] of Object.entries(manifest.inputs)) eq(sha(readFileSync(path)),hash,path+' input SHA256');
for(const [path,info] of Object.entries(manifest.outputs)) {
  const bytes=readFileSync(path);eq(sha(bytes),info.sha256,path+' output SHA256');eq(bytes.length,info.bytes,path+' bytes');
}
for(const path of ['runtime.js','script-url.js','analytics.js','marketing.js','i18n.js','lexicons.json',...readdirSync('assets/js/cookie-consent/mock').map(x=>'mock/'+x)]) {
  const full='assets/js/cookie-consent/'+path;
  eq(sha(readFileSync(full)),sha(execFileSync('git',['show',baseline.commit+':'+full])),full+' preserved');
}
execFileSync(process.execPath,['_build/version.mjs','--check']);
const guide=JSON.parse(readFileSync('_build/user-guide-manifest.json'));
eq(sha(readFileSync('_build/user-guide.json')),guide.source,'Guide source SHA256');
for(const [path,hash] of Object.entries(guide.outputs)) eq(sha(readFileSync(path)),hash,path+' guide output');
const meta=JSON.parse(readFileSync('_build/package.json'));
const signature=meta.name+'-'+meta.version+'-'+meta.release+meta.release_index;
const artifact=(process.env.CC_REFACTOR_ARTIFACTS||'.local/artifacts')+'/'+signature;
const inventory=JSON.parse(readFileSync(artifact+'.inventory.json'));
const oldInventory=JSON.parse(execFileSync('git',['show',baseline.commit+':_build/package.json']));
eq(meta.release_index,oldInventory.release_index+1,'Independent next beta');
eq(sha(readFileSync('.local/artifacts/cookieconsent-1.0.4-beta3.transport.zip')),baseline.native.sha256,'Beta3 ZIP immutable');
const oldSpec=JSON.parse(readFileSync('.local/artifacts/cookieconsent-1.0.4-beta3.inventory.json'));
eq(inventory.files.map(f=>f.target),oldSpec.files.map(f=>f.target),'Native public paths unchanged');
eq(inventory.objects,oldSpec.objects,'Native objects/default settings/texts unchanged');
eq(inventory.files.filter(file=>oldSpec.files.find(old=>old.target===file.target).sha256!==file.sha256).map(file=>file.target),[
  'assets/components/cookieconsent/manager.js',
  'assets/js/cookie-consent/cookie-consent.min.js',
  'core/components/cookieconsent/src/CookieConsentGuide.php',
  'core/components/cookieconsent/src/CookieConsentVersion.php'
],'Only bundle, technical Manager/guide links and generated version change in runtime payload');
const bundle=inventory.files.find(f=>f.target==='assets/js/cookie-consent/cookie-consent.min.js');
eq(bundle.sha256,manifest.outputs[bundle.target].sha256,'Transport includes current bundle');
eq(inventory.files.find(f=>f.target==='assets/components/cookieconsent/script-url.js').sha256,sha(readFileSync('assets/js/cookie-consent/script-url.js')),'One URL validator in both delivery paths');
for(const file of inventory.files) if(file.target.includes('/mock/')) eq(file.sha256,sha(readFileSync(file.target)),file.target+' actual mock path');
const a=readFileSync(out+'/final-a/'+signature+'.transport.zip'),b=readFileSync(out+'/final-b/'+signature+'.transport.zip');
eq(sha(a),sha(b),'Independent normalized native builds reproduce');
eq(sha(readFileSync(artifact+'.transport.zip')),sha(a),'Delivered artifact matches verified native build');
const report={result:'PASS',tests:1,assertions,failed:0,inputs:Object.keys(manifest.inputs).length,outputs:Object.keys(manifest.outputs).length,signature,sha256:sha(a),runtimeFiles:inventory.files.length,frontend:manifest,baselineZipUnchanged:true,nativeReproducible:true};
writeFileSync(out+'/build.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({result:report.result,assertions,signature,sha256:report.sha256}));
