// Genuine previous-release consent -> native upgrade; all destinations are loopback/mock.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {origin,docker} from '../helpers.mjs';
const ctl=(a,input)=>docker(['web','php','/opt/cc-source/tests/local/manager-i18n-control.php',...a],input).trim();
const meta=JSON.parse(readFileSync('_build/package.json')),target=meta.name+'-'+meta.version+(meta.release?'-'+meta.release+meta.release_index:''),previous=process.env.CC_PREVIOUS_SIGNATURE||'cookieconsent-1.0.0';
const saved=ctl(['setting','cookie_consent.services','get']),culture=JSON.parse(ctl(['context','get']));
const snapshot=()=>JSON.parse(docker(['web','php','/opt/cc-source/tests/transport/control.php','snapshot','/opt/cc-private']));
// Rebuilt development signatures reuse resolver paths; restart disposable PHP to discard OPcache.
const install=signature=>{execFileSync('docker',['compose','--env-file','.local/modx3/private/compose.env','-f','tests/modx3/compose.yaml','restart','web'],{stdio:'pipe'});execFileSync('node',['tests/transport/install-current.mjs'],{stdio:'pipe',env:{...process.env,CC_INSTALL_SERVICES:'web',CC_INSTALL_SIGNATURE:signature}});};
const base={schema:1,services:JSON.parse(readFileSync('.local/modx3/private/base-registry.json')).services.filter(s=>s.loader!=='mock_marketing')};
for(const s of base.services)if(s.loader==='yandex'){delete s.config.clientId;s.purpose_id='owner.analytics';}
for(const[loader,id]of[['vk_ads','777111'],['meta_pixel','888222']])base.services.push({key:loader,loader,category:'marketing',enabled:true,name:loader,purpose:'Marketing disclosure',config:{id}});
const ids=JSON.parse(docker(['web','php','/opt/cc-source/tests/beta31/fixture.php']));
const b=await chromium.launch(),out=process.env.CC_REGISTRY_EVIDENCE||'.local/modx3/public-registry-evidence';mkdirSync(out,{recursive:true});
let n=0;const results=[],eq=(a,c,m)=>{n++;assert.deepEqual(a,c,m)};
const test=async(name,fn)=>{const start=n;try{await fn();results.push({name,result:'PASS',assertions:n-start});console.log('PASS '+name)}catch(e){results.push({name,result:'FAIL',assertions:n-start,error:e.message});throw e}};
let ctx,p,requests=[],external=[],errors=[];
async function session(js=true){const c=await b.newContext({javaScriptEnabled:js});await c.route('**/*',r=>{requests.push(new URL(r.request().url()).pathname);if(new URL(r.request().url()).origin!==origin){external.push(r.request().url());return r.abort()}return r.continue()});const page=await c.newPage();page.on('pageerror',e=>errors.push(e.message));return{ctx:c,p:page};}
const loads=()=>[...new Set(requests.filter(u=>u.includes('/mock/')).map(u=>u.split('/').at(-1)))].sort();
const state=()=>p.evaluate(()=>({raw:localStorage.getItem('web86_cookie_consent'),consent:web86CookieConsent.getConsent(),fingerprints:web86Providers.services.map(s=>[s.key,s.fingerprint])}));
try{
 await test('real-'+previous+'-to-'+target+'-no-reconsent-exact-fingerprints-and-data',async()=>{
  install(previous);ctl(['setting','cookie_consent.services'],JSON.stringify(base));ctl(['context'],'ru');
  // The disposable PHP worker revalidates regenerated MODX context caches every two seconds.
  await new Promise(resolve=>setTimeout(resolve,2300));
  ({ctx,p}=await session());await p.goto(origin+'/?id='+ids.mock,{waitUntil:'networkidle'});
  eq(await p.locator('[data-cc-action=reject]').textContent(),'Отклонить','Previous fixture context is RU before comparison');const oldRaw=await p.locator('#cc-service-registry').textContent(),oldRegistry=JSON.parse(oldRaw);eq(oldRegistry.services.every(s=>typeof s.name==='string'&&typeof s.purpose==='string'),previous==='cookieconsent-1.0.0','Actual previous public contract');eq(await p.locator('#cc-public-config').count(),1,'Previous candidate emits locale JSON');const oldBanner=await p.locator('#cookie-block').innerHTML();
  eq(loads(),[]);await p.locator('[data-cc-action=accept-all]').click();await p.waitForTimeout(500);
  const old=await state(),loaded=loads();eq(loaded,['google_ads.js','google_ga4.js','google_gtm.js','google_maps.html','mailru.js','meta_pixel.js','vk_ads.js','yandex.js','yandex_maps.html']);
  eq(old.consent.providers.yandex,JSON.stringify([2,'yandex','analytics','owner.analytics',{accurateTrackBounce:true,clickmap:true,id:base.services[0].config.id,trackLinks:true,webvisor:true}]));
  const before=snapshot();install(target);const after=snapshot();
  for(const key of ['settings','auditRegistry','data'])eq(after[key],before[key],key+' unchanged by native upgrade');
  requests=[];await p.reload({waitUntil:'networkidle'});const now=await state();eq(now,old,'Raw stored consent, ID, permissions and fingerprints byte-for-byte');
  eq(await p.locator('[data-cc-action=accept-all]').isVisible(),false,'No repeat banner');eq(loads(),loaded,'Every previously permitted SDK/map continues');
  const current=JSON.parse(await p.locator('#cc-service-registry').textContent());
  eq(current.services,oldRegistry.services.map(({name,purpose,...technical})=>technical),'Technical data retained');if(previous!=='cookieconsent-1.0.0')eq(await p.locator('#cc-service-registry').textContent(),oldRaw,'Registry bytes unchanged');eq(await p.locator('#cc-public-config').count(),0);eq(await p.locator('#cookie-block').innerHTML(),oldBanner,'PHP localized markup unchanged');eq(await p.evaluate(()=>Object.hasOwn(web86Runtime,'config')),false);eq(external,[]);eq(errors,[]);
 });
 await test('minimal-and-cached-full-contract-same-v2-fingerprint-strict-rejection',async()=>{
  const answer=await p.evaluate(full=>{const minimal={schema:1,services:full.services.map(({name,purpose,...s})=>s)},fingerprints=r=>web86Providers.validate(r).map(s=>[s.key,s.fingerprint]);
   const mutations=[s=>s.unreviewed='x',s=>s.config.sdk_url='https://evil.invalid/sdk',s=>s.config=[],s=>s.config.id=123,s=>s.enabled='true',s=>s.category='marketing',s=>s.loader='evil',s=>s.purpose_id='',s=>s.config.webvisor='true',s=>delete s.config.id];
   return{same:JSON.stringify(fingerprints(full))===JSON.stringify(fingerprints(minimal)),displayAbsent:web86Providers.validate(full).every(s=>!Object.hasOwn(s,'name')&&!Object.hasOwn(s,'purpose')),rejected:mutations.map(m=>{const r=structuredClone(minimal);m(r.services[0]);try{web86Providers.validate(r);return false}catch{return true}}),legacyBad:[{...full.services[0],name:'<script>'},{...full.services[0],purpose:''}].map(s=>{try{web86Providers.validate({schema:1,services:[s]});return false}catch{return true}})};
  },base);eq(answer,{same:true,displayAbsent:true,rejected:Array(10).fill(true),legacyBad:[true,true]});
 });
 await test('scoped-onAllowed-and-user-owned-ClientID-example-with-minimal-data',async()=>{
  await p.evaluate(()=>{window.__scoped=0;web86CookieConsent.onAllowed('analytics',guard=>{if(guard())__scoped++},{service:'yandex'});const input=document.createElement('input');input.id='clientid';document.body.append(input);window.ym=(id,event,callback)=>{if(event==='getClientID')callback('CONTROLLED-CLIENT-ID')};});
  await p.addScriptTag({content:readFileSync('examples/chunks/YandexMetrikaClientId.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1]});
  eq(await p.evaluate(()=>__scoped),1);eq(await p.locator('#clientid').getAttribute('data-clientid'),'CONTROLLED-CLIENT-ID');
 });
 await ctx.close();ctx=null;
 for(const lang of ['ru','en','tr'])await test('SSR-localized-full-texts-and-map-templates-cold-warm-'+lang,async()=>{
  ctl(['context'],lang);const s=await session(false);try{let first;for(let warm=0;warm<2;warm++){await s.p.goto(origin+'/?id='+ids.mock);eq(await s.p.locator('#cc-public-config').count(),0);const r=JSON.parse(await s.p.locator('#cc-service-registry').textContent());eq(r.services.every(x=>!Object.hasOwn(x,'name')&&!Object.hasOwn(x,'purpose')),true);
   const texts=await s.p.locator('[data-cc-text],[data-cc-html]').evaluateAll(xs=>xs.map(x=>x.textContent));eq(texts.every(t=>t.trim().length>0),true,'No empty static titles/buttons');
   const maps=await s.p.locator('template[data-cc-map-template]').evaluateAll(xs=>xs.map(x=>x.content.textContent));eq(maps.length,2);eq(maps.every(t=>t.includes('Google Maps')||t.includes('Яндекс')||t.includes('Yandex')),true,'Map display names remain in PHP HTML');
   const html=await s.p.locator('#cookie-block').innerHTML();if(warm)eq(html,first,'Cold/warm SSR same');else first=html;
  }}finally{await s.ctx.close()}
 });
}catch(e){console.error(e.stderr?.toString()||e.message);process.exitCode=1}
finally{await ctx?.close();ctl(['setting','cookie_consent.services'],saved);ctl(['context'],culture.exists?culture.value:'__REMOVE__');await b.close();writeFileSync(out+'/browser-results.json',JSON.stringify({suite:'Actual previous-release consent and native upgrade to minimal registry',tests:results.length,assertions:n,failed:results.filter(x=>x.result==='FAIL').length,results},null,2));}
