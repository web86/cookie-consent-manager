import {frontendHash,expectedFrontendHash} from '../frontend-asset.mjs';
// Real Manager Save + installed content-hashed bundle. Vendor responses are controlled;
// requests and SDK initialization are asserted separately, never real customer telemetry.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
import {origin,docker} from '../helpers.mjs';
const out='.local/legacy-autoload-evidence';mkdirSync(out,{recursive:true});
const ctl=(a,input)=>docker(['web','php','/opt/cc-source/tests/local/manager-i18n-control.php',...a],input).trim();
const saved=Object.fromEntries(['cookie_consent.options','cookie_consent.services','manager_language'].map(k=>[k,ctl(['setting',k,'get'])]));
const ids=JSON.parse(docker(['web','php','/opt/cc-source/tests/beta31/fixture.php']));
const browser=await chromium.launch(),admin=await browser.newContext(),p=await admin.newPage();
await admin.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
const categories=['analytics','marketing','external_content'],all=Object.fromEntries(categories.map(c=>[c,true]));
const svc=(key,loader,category,config={},enabled=true)=>({key,loader,category,config,enabled,name:key,purpose:'Controlled acceptance processing'});
const ym=svc('yandex','yandex','analytics',{id:'12345678'});
const custom=svc('custom','custom_js','marketing',{path:'https://cdn.example.test/custom.js'});
const services=[ym,svc('ga4','google_ga4','analytics',{id:'G-TEST2026',allow_google_signals:true,allow_ad_personalization_signals:true}),svc('gtm','google_gtm','marketing',{id:'GTM-TEST2026'}),svc('ads','google_ads','marketing',{id:'AW-12345678'}),svc('vk','vk_ads','marketing',{id:'87654321'}),svc('meta','meta_pixel','marketing',{id:'12345678'}),custom,svc('google_maps','google_maps','analytics'),svc('disabled','custom_js','analytics',{path:'https://cdn.example.test/disabled.js'},false)];
let token,n=0;const results=[];const eq=(a,b,m)=>{n++;assert.deepEqual(a,b,m)};
const test=async(name,fn)=>{const start=n;try{await fn();results.push({name,result:'PASS',assertions:n-start});console.log('PASS '+name)}catch(e){results.push({name,result:'FAIL',assertions:n-start,error:e.stack});throw e}};
const api=async(action,form={})=>(await admin.request.post(origin+'/assets/components/cookieconsent/connector.php',{headers:{modAuth:token},form:{action,HTTP_MODAUTH:token,...form}})).json();
async function setup({legacy=true,visible=all,list=services}={}){
 const state=(await api('get')).object,draft=Object.fromEntries(['options','registry','texts','log_dir','audit_config_file'].map(k=>[k,structuredClone(state[k])]));
 draft.registry={schema:1,services:list};draft.options.categories=visible;
 draft.options.buttons={reject:true,configure:!legacy,accept_all:!legacy,accept:legacy};
 const response=await api('save',{revision:state.revision,draft:JSON.stringify(draft)});eq(response.success,true,'Native Manager Save');return response.object;
}
async function visit({stored,archive,storageError=false,delayedMeta=false,delayedGoogle=false,siteConsent}={}){
 const ctx=await browser.newContext(),page=await ctx.newPage(),requests=[],events=[],errors=[];let releaseMeta;
 const metaWait=new Promise(resolve=>{releaseMeta=resolve});
 await ctx.route('**/*',async r=>{
  const u=new URL(r.request().url());requests.push(u.href);
  if(u.origin===origin)return r.continue();
  if((delayedMeta&&u.hostname==='connect.facebook.net')||(delayedGoogle&&u.hostname==='www.googletagmanager.com'))await metaWait;
  let body='window.__custom=(window.__custom||0)+1;';
  if(u.hostname==='mc.yandex.ru')body='window.__ymSDK=(window.__ymSDK||0)+1;window.__ymInit=(ym.a||[]).map(x=>Array.from(x)).filter(x=>x[1]==="init");';
  if(u.hostname==='www.googletagmanager.com')body='window.__googleSDK=(window.__googleSDK||0)+1;window.__googleAtLoad=(dataLayer||[]).map(x=>Array.from(x));';
  if(u.hostname==='top-fwz1.mail.ru')body='window.__vkSDK=(window.__vkSDK||0)+1;window.__vkInit=structuredClone(_tmr);';
  if(u.hostname==='connect.facebook.net')body='window.__metaSDK=(window.__metaSDK||0)+1;window.__metaInit=structuredClone(fbq.queue);';
  return r.fulfill({contentType:r.request().resourceType()==='document'?'text/html':'text/javascript',body:r.request().resourceType()==='document'?'<p>Controlled map</p>':body});
 });
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().endsWith('/audit.php'))events.push(r.postDataJSON())});
 await page.addInitScript(({stored,archive,storageError,siteConsent})=>{
  if(siteConsent){window.dataLayer=[];window.gtag=function(){dataLayer.push(arguments)};gtag('consent','default',siteConsent);gtag('set','site_owned',true);dataLayer.push({event:'site_owned'});}
  if(stored!==undefined)localStorage.setItem('web86_cookie_consent',stored);
  if(archive!==undefined)localStorage.setItem('web86_cookie_consent_legacy_v2',archive);
  if(storageError)Object.defineProperty(window,'localStorage',{get(){throw Error('Storage unavailable')}});
 },{stored,archive,storageError,siteConsent});
 await page.goto(origin+'/?id='+ids.split,{waitUntil:delayedMeta||delayedGoogle?'domcontentloaded':'networkidle'});
 const bundle=await page.locator('script[src*="cookie-consent.min.js"]').getAttribute('src');
 const bytes=await(await ctx.request.get(new URL(bundle,origin).href)).body();
 eq(frontendHash(bytes),expectedFrontendHash(),'Installed bundle matches source');
 return{ctx,p:page,requests,events,errors,releaseMeta,external:()=>requests.filter(u=>new URL(u).origin!==origin),ym:()=>requests.filter(u=>u.includes('mc.yandex.ru/metrika/tag.js'))};
}
const persisted=(state,grants=all)=>JSON.stringify({model:'categories_v2',version:state.options.policy_version||'1',necessary:true,categories:grants,category_versions:state.options.category_versions,savedAt:Date.now(),consentId:randomUUID()});
async function signals(page){return page.evaluate(()=>Array.from(dataLayer).filter(x=>x[0]==='consent').map(x=>[x[1],x[2]]));}
try{
 const c=JSON.parse(docker(['web','php','/opt/cc-source/tests/transport/control.php','credentials','/opt/cc-private']));
 await p.goto(origin+'/manager/');await p.locator('#modx-login-username').fill(c.username);await p.locator('#modx-login-password').fill(c.password);await p.locator('#modx-login-btn').click();await p.waitForFunction(()=>window.MODx?.siteId);token=await p.evaluate(()=>MODx.siteId);
 await test('strict-new-visitor-zero-optional-network',async()=>{await setup({legacy:false});const v=await visit();try{eq(v.external(),[]);eq(await v.p.evaluate(()=>web86CookieConsent.getConsent()),null);eq(v.events,[]);}finally{await v.ctx.close()}});
 await test('legacy-first-visit-network-init-dedup-no-consent-no-audit-google-unmodified',async()=>{
  await setup();const v=await visit();try{
   eq(v.ym().length,1);eq(await v.p.evaluate(()=>[__ymSDK,__ymInit[0].slice(0,2)]),[1,[12345678,'init']]);
   eq(await v.p.evaluate(()=>[__googleSDK,__vkSDK,__vkInit[0].type,__metaSDK,__metaInit.some(x=>x[0]==='init'),__custom]),[2,1,'pageView',1,true,1]);
   eq(await v.p.locator('[data-cc-map-provider=google_maps] iframe').count(),1);eq(v.external().some(u=>u.includes('disabled.js')),false);
   eq(await v.p.evaluate(()=>web86CookieConsent.getConsent()),null);eq(await v.p.evaluate(()=>localStorage.getItem('web86_cookie_consent')),null);eq(v.events,[]);
   eq(await v.p.locator('[data-cc-action=accept]').isVisible(),true);eq(await v.p.locator('[data-cc-action=reject]').isVisible(),true);eq(await v.p.locator('[data-cc-action=configure]').isVisible(),false);eq(await v.p.locator('[data-cc-action=accept-all]').isVisible(),false);
   eq(await signals(v.p),[],'CMP emits no Google consent commands before choice');
   eq(await v.p.evaluate(()=>dataLayer.filter(x=>x[0]==='config').every(x=>x[2].allow_ad_personalization_signals===true)),true);eq(await v.p.evaluate(()=>dataLayer.find(x=>x[0]==='config'&&x[1].startsWith('G-'))[2].allow_google_signals),true);
   eq(await v.p.evaluate(()=>Object.hasOwn(dataLayer.find(x=>x.event==='gtm.js'),'cookie_consent')),false);
   await v.p.evaluate(()=>{window.__count=0;web86CookieConsent.onAllowed('marketing',g=>{__count++;window.__guard=g},{service:'custom'});web86CookieConsent.onAllowed('analytics',()=>__count++);});eq(await v.p.evaluate(()=>[__count,__guard()]),[2,true]);
   const count=v.external().length;await v.p.locator('[data-cc-action=accept]').click();await v.p.waitForTimeout(180);eq(v.external().length,count,'Accept never initializes SDK twice');
   eq((await v.p.evaluate(()=>web86CookieConsent.getConsent())).categories,all);eq(v.events.map(e=>e.event),['accept']);eq(v.events[0].schema,3);eq(Object.hasOwn(v.events[0],'providers'),false);
   eq(Object.values((await signals(v.p)).at(-1)[1]).every(x=>x==='granted'),true);
   const audit=v.events[0];await v.p.waitForTimeout(100);const list=await api('logs_list',{year:'all',month:'all',search:audit.event_id});eq(list.object.total,1,'One actual JSONL event after explicit click');eq(v.errors,[]);
  }finally{await v.ctx.close()}
 });
 for(const setting of ['denied','granted'])await test('legacy-preserves-independent-site-consent-'+setting,async()=>{await setup();const siteConsent={analytics_storage:setting,ad_storage:setting,ad_user_data:setting,ad_personalization:setting},v=await visit({siteConsent});try{eq(await signals(v.p),[['default',siteConsent]],'Existing site commands are untouched');eq(v.ym().length,1);eq(await v.p.evaluate(()=>web86CookieConsent.getConsent()),null);eq(v.events,[]);}finally{await v.ctx.close()}});
 await test('legacy-reject-synchronous-guards-real-reload-denied-restored',async()=>{
  await setup();const v=await visit();try{
   await v.p.evaluate(()=>web86CookieConsent.onAllowed('marketing',g=>window.__guard=g,{service:'custom'}));
   await v.ctx.route('**/audit.php',async r=>{await new Promise(resolve=>setTimeout(resolve,350));await r.continue()});
   const before=v.external().length,nav=v.p.waitForNavigation({waitUntil:'networkidle'});
   await v.p.evaluate(()=>{document.querySelector('[data-cc-action=reject]').click();window.__afterReject=__guard();window.__late=0;web86CookieConsent.onAllowed('marketing',()=>__late++);});
   eq(await v.p.evaluate(()=>[__afterReject,__late]),[false,0]);eq(Object.values((await signals(v.p)).at(-1)[1]).every(x=>x==='denied'),true);
   await nav;eq(v.external().length,before,'No optional request after reload');eq(v.events.map(e=>e.event),['reject']);eq((await v.p.evaluate(()=>web86CookieConsent.getConsent())).categories,{analytics:false,marketing:false,external_content:false});eq(await v.p.locator('[data-cc-map-provider] iframe').count(),0);eq(v.errors,[]);
  }finally{await v.ctx.close()}
 });
 for(const kind of ['refusal','partial','expired','policy','category-version','malformed','historical-incomplete','historical-complete','archive-only','unavailable-storage'])await test('legacy-respects-'+kind,async()=>{
  const state=await setup(),grants=kind==='refusal'?{analytics:false,marketing:false,external_content:false}:kind==='partial'?{analytics:true,marketing:false,external_content:false}:all;
  let data=JSON.parse(persisted(state,grants)),stored,archive,storageError=false;
  if(kind==='expired')data.savedAt=Date.now()-3660*86400000;
  if(kind==='policy')data.version='outdated-policy';
  if(kind==='category-version')data.category_versions=Object.fromEntries(categories.map(c=>[c,-1]));
  if(kind.startsWith('historical')){delete data.model;data.analytics=true;data.marketing=true;data.external_content=true;data.providers={};if(kind==='historical-complete'){
   const temp=await visit({stored:JSON.stringify({...data,analytics:false,marketing:false,external_content:false})});try{data.providers=await temp.p.evaluate(()=>Object.fromEntries(web86Providers.services.map(s=>[s.key,s.fingerprint])));}finally{await temp.ctx.close()}
  }}
  stored=kind==='malformed'?'{broken':JSON.stringify(data);
  if(kind==='archive-only'){stored=undefined;archive=JSON.stringify(data)}
  if(kind==='unavailable-storage'){stored=undefined;storageError=true}
  const v=await visit({stored,archive,storageError});try{
   if(['partial','historical-complete'].includes(kind)){eq(v.ym().length,1);eq(await v.p.evaluate(()=>web86CookieConsent.getConsent().categories.marketing),kind==='historical-complete');if(kind==='partial')eq(v.external().some(u=>u.includes('custom.js')),false)}else eq(v.external(),[]);
   eq(v.events,[]);if(['expired','policy','malformed','archive-only','unavailable-storage'].includes(kind))eq(await v.p.evaluate(()=>web86CookieConsent.getConsent()),null);
   if(!kind.startsWith('historical')&&!storageError)eq(await v.p.evaluate(()=>localStorage.getItem('web86_cookie_consent')),stored??null,'No silent record rewrite');eq(v.errors,[]);
  }finally{await v.ctx.close()}
 });
 await test('legacy-hidden-category-disabled-service-and-mode-off',async()=>{
  await setup({visible:{analytics:false,marketing:true,external_content:true}});let v=await visit();try{eq(v.ym(),[]);eq(await v.p.locator('[data-cc-map-provider] iframe').count(),0);eq(v.external().some(u=>u.includes('disabled.js')),false);eq(await v.p.evaluate(()=>{window.__hidden=0;web86CookieConsent.onAllowed('analytics',()=>__hidden++);return __hidden}),0)}finally{await v.ctx.close()}
  await setup({legacy:false});v=await visit();try{eq(v.external(),[])}finally{await v.ctx.close()}
 });
 await test('legacy-reject-even-with-all-categories-hidden-reloads',async()=>{await setup({visible:{analytics:false,marketing:false,external_content:false}});const v=await visit();try{eq(v.external(),[]);await Promise.all([v.p.waitForNavigation({waitUntil:'networkidle'}),v.p.locator('[data-cc-action=reject]').click()]);eq(v.external(),[]);eq(v.events.map(e=>e.event),['reject']);}finally{await v.ctx.close()}});
 await test('legacy-admin-processing-change-invalidates-real-consent',async()=>{
  await setup();const v=await visit();try{await v.p.locator('[data-cc-action=accept]').click();const prev=await v.p.evaluate(()=>web86CookieConsent.getConsent());const list=structuredClone(services);list.find(s=>s.key==='custom').config.path='https://cdn.example.test/changed.js';const state=await setup({list});eq(state.options.category_versions.marketing,prev.category_versions.marketing+1);v.requests.length=0;await v.p.reload({waitUntil:'networkidle'});eq(await v.p.evaluate(()=>web86CookieConsent.getConsent().categories.marketing),false);eq(v.external().some(u=>/custom.js|changed.js|fbevents.js|gtm.js/.test(u)),false);eq(v.ym().length,1);}finally{await v.ctx.close()}
 });
 for(const loader of ['google_ga4','google_ads','google_gtm'])await test('legacy-pending-'+loader+'-reject-discards-only-CMP-work',async()=>{
  await setup({list:[services.find(s=>s.loader===loader)]});const siteConsent={analytics_storage:'granted',ad_storage:'granted',ad_user_data:'granted',ad_personalization:'granted'},v=await visit({delayedGoogle:true,siteConsent});try{
   const nav=v.p.waitForNavigation({waitUntil:'networkidle'});const queue=await v.p.evaluate(()=>{document.querySelector('[data-cc-action=reject]').click();return dataLayer.map(x=>x.event?x:Array.from(x));});
   eq(queue.some(x=>x[0]==='config'||x[0]==='js'||x.event==='gtm.js'),false);eq(queue.some(x=>x.event==='site_owned'),true);eq(queue.some(x=>x[0]==='set'&&x[1]==='site_owned'),true);eq(queue.filter(x=>x[0]==='consent')[0][2],siteConsent);eq(Object.values(queue.filter(x=>x[0]==='consent').at(-1)[2]).every(x=>x==='denied'),true);v.releaseMeta();await nav;eq(v.external().length,1);eq(v.errors,[]);
  }finally{v.releaseMeta();await v.ctx.close()}
 });
 await test('legacy-pending-meta-reject-cancels-queued-pageview',async()=>{
  await setup({list:[svc('meta','meta_pixel','marketing',{id:'12345678'})]});const v=await visit({delayedMeta:true});try{const nav=v.p.waitForNavigation({waitUntil:'networkidle'});await v.p.locator('[data-cc-action=reject]').click();eq(await v.p.evaluate(()=>fbq.queue.some(x=>x[0]==='init'||x[0]==='trackSingle'||x[1]==='grant')),false);v.releaseMeta();await nav;eq(v.external().length,1);eq(v.errors,[]);}finally{v.releaseMeta();await v.ctx.close()}
 });
 for(const lang of ['ru','en'])await test('Manager-warning-'+lang,async()=>{ctl(['setting','manager_language'],lang);await p.goto(origin+'/manager/?a=language&switch='+lang+'&target_a=index&target_namespace=cookie_consent');await p.locator('#ccm-save').waitFor();const text=await p.locator('body').textContent();eq(text.includes(lang==='ru'?'до нажатия кнопки «Принять»':'before the visitor clicks Accept'),true);eq(text.includes(lang==='ru'?'законодательства о конфиденциальности':'privacy legislation'),true)});
}catch(e){console.error(e.stack);process.exitCode=1}finally{await browser.close();for(const[k,v]of Object.entries(saved))ctl(['setting',k],v);writeFileSync(out+'/browser.json',JSON.stringify({suite:'Legacy auto-load: actual MODX 2 / Chromium / intercepted vendors',tests:results.length,assertions:n,failed:results.filter(r=>r.result==='FAIL').length,results},null,2)+'\n')}
