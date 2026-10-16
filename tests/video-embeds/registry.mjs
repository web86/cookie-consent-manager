import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {execFileSync} from 'node:child_process';import {runInNewContext} from 'node:vm';
const baseline=JSON.parse(readFileSync('tests/video-embeds/baseline.json'));const old=execFileSync('git',['show',baseline.commit+':server/src/CookieConsentServiceRegistry.php'],{encoding:'utf8'}).replace('final class CookieConsentServiceRegistry','final class CookieConsentServiceRegistryBeta5').replace(/^<\?php\s*declare\(strict_types=1\);/,'');
const php=`require 'server/src/CookieConsentSettings.php';${old};$old=CookieConsentServiceRegistryBeta5::defaults();$new=CookieConsentServiceRegistry::defaults();foreach(CookieConsentSettings::CATEGORIES as $category)if(CookieConsentSettings::categoryProcessing($old,$category)!==CookieConsentSettings::categoryProcessing($new,$category))throw new RuntimeException('Disabled additions affect category');echo json_encode(['old'=>$old,'new'=>$new]);`;
const data=JSON.parse(execFileSync('php',['-r',php],{encoding:'utf8'}));let n=0;const eq=(a,b,m)=>{n++;assert.deepEqual(a,b,m);};
for(const service of data.old.services)eq(data.new.services.find(s=>s.key===service.key),service,'Historic service unchanged');
function api(source){const window={web86ScriptUrl:{valid:()=>true}};runInNewContext(source,{window,document:{getElementById:()=>null},console,TextEncoder,URL});return window.web86Providers;}
const oldJs=api(execFileSync('git',['show',baseline.commit+':assets/js/cookie-consent/provider-registry.js'],{encoding:'utf8'})),newJs=api(readFileSync('assets/js/cookie-consent/provider-registry.js','utf8'));
for(const service of data.old.services){const row={...service,enabled:true,config:{...service.config}};if(!service.loader.endsWith('_maps')&&!row.config.id)row.config.id=({google_ga4:'G-ABCD1234',google_gtm:'GTM-ABCD1234',google_ads:'AW-12345678'}[service.loader]||'12345678');const old=oldJs.validate({schema:1,services:[row]});const next=newJs.validate({schema:1,services:[row]});eq(JSON.parse(JSON.stringify(next)),JSON.parse(JSON.stringify(old)),'Historical JS fingerprints unchanged');}
for(const loader of ['youtube','rutube','vk_video']){
 const stock=data.new.services.find(s=>s.loader===loader);eq(stock.enabled,false);eq(stock.category,'external_content');
 for(const category of ['analytics','marketing','external_content']){
  const services=[stock,{...stock,key:loader+'_extra'}].map(s=>({...s,category,enabled:true}));const checked=newJs.validate({schema:1,services});eq(checked.length,2);eq(checked[0].category,category);eq(checked[1].key,loader+'_extra');
 }
}
console.log(JSON.stringify({result:'PASS',assertions:n}));
