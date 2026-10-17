/** Runs sequentially against a NEW ui-refinement-* native MODX fixture. */
import {chromium} from 'playwright';
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const major=process.env.CC_UI_MODX||'2',name=process.env.CC_UI_CASE||'ui-refinement-a';
assert.match(name,/^ui-refinement-[a-z0-9-]+$/);
const container=major==='3'?'cookie-consent-modx3-adapter-updates-web-1':'cookie-consent-adapter-updates-web-1';
const origin='http://127.0.0.1:'+(major==='3'?'23888':'22888');
const out=process.env.CC_UI_OUT||'.local/ui-refinement/modx'+major;mkdirSync(out,{recursive:true});
const run=(args,input)=>execFileSync('docker',['exec','-i',container,'runuser','-u','www-data','--',...args],{encoding:'utf8',input,maxBuffer:8*1024*1024});
const ctl=(op,...args)=>JSON.parse(run(['php','/opt/cc-source/tests/adapter-updates/control.php',name,op,...args]));
const ui=(op,...args)=>JSON.parse(run(['php','/opt/cc-reference/tests/ui-refinement/control.php',name,op,...args]));
const setting=(key,value)=>JSON.parse(run(['php','/opt/cc-reference/tests/ui-refinement/control.php',name,'setting',key,value===undefined?'get':'set'],value)).value;
const initial=Object.fromEntries(['cookie_consent.options','cookie_consent.services','cookie_consent.texts','cookie_consent.log_dir','manager_language'].map(k=>[k,setting(k)]));
let n=0;const results=[],errors=[];const eq=(a,b,m)=>{n++;assert.deepEqual(a,b,m);},ok=(a,m)=>{n++;assert.ok(a,m);};
async function test(name,fn){const before=n;try{await fn();results.push({name,result:'PASS',assertions:n-before});console.log('PASS '+name);}catch(e){results.push({name,result:'FAIL',error:e.stack});throw e;}}
const browser=await chromium.launch();let ctx,p;
async function open(lang){
 if(ctx)await ctx.close();ctl('language',lang);ctx=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
 await ctx.route('**/*',r=>{if(new URL(r.request().url()).origin!==origin)return r.fulfill({contentType:r.request().resourceType()==='script'?'text/javascript':'text/html',body:r.request().resourceType()==='script'?'/* isolated SDK */':'<p>Isolated iframe</p>'});return r.continue();});
 p=await ctx.newPage();p.setDefaultTimeout(15000);p.setDefaultNavigationTimeout(30000);p.on('pageerror',e=>errors.push(e.message));const c=ctl('credentials');await p.goto(origin+'/manager/');await p.locator('#modx-login-username').fill(c.username);await p.locator('#modx-login-password').fill(c.password);await p.locator('#modx-login-btn').click();await p.waitForFunction(()=>window.MODx?.siteId);
 await p.goto(origin+'/manager/?a=index&namespace=cookie_consent');await p.locator('#ccm-save').waitFor();await p.frameLocator('#ccm-preview-frame').locator('section.cookie-warning').waitFor();
}
const shot=async options=>{if(await p.locator('.ccm-preview').isVisible())await p.frameLocator('#ccm-preview-frame').locator('section.cookie-warning').waitFor();await p.screenshot(options);};
const expand=async()=>{if(!await p.locator('#ccm-advanced').evaluate(e=>e.open))await p.locator('#ccm-advanced > summary').click();};
async function save(){const r=p.waitForResponse(r=>new URLSearchParams(r.request().postData()||'').get('action')==='save');await p.locator('#ccm-save').click();const data=await(await r).json();eq(data.success,true);eq(data.object.partial,false);await p.waitForFunction(()=>document.querySelector('#ccm-status').dataset.state==='saved');return data.object;}
async function api(action,form={}){const token=await p.evaluate(()=>CookieConsentManagerBootstrap.auth);const r=await ctx.request.post(origin+'/assets/components/cookieconsent/connector.php',{headers:{modAuth:token},form:{action,HTTP_MODAUTH:token,...form}});return r.json();}
try{
 ctl('production','strict');
 for(const lang of (process.env.CC_UI_JOURNAL_ONLY?[]:['ru','en'])){
  await open(lang);
  await test(lang+'-settings-layout-keyboard-and-guide',async()=>{
   eq(await p.locator('#ccm-tab-main').textContent(),lang==='ru'?'Настройки':'Settings');
   eq(await p.locator('.ccm-basic-settings input').evaluateAll(xs=>xs.map(x=>x.id)),['ccm-ttl','ccm-show-reject','ccm-show-configure','ccm-show-accept_all','ccm-show-accept']);
   eq(await p.locator('#ccm-advanced').evaluate(e=>e.open),false);eq(await p.locator('#ccm-advanced > summary').getAttribute('aria-expanded'),'false');
   eq(await p.locator('#ccm-legacy-warning strong').textContent(),lang==='ru'?'Внимание. ':'Attention. ');
   eq(await p.locator('#ccm-show-accept').getAttribute('aria-describedby'),'ccm-legacy-warning');
   const a=await p.locator('#ccm-reconsent').boundingBox(),b=await p.locator('#ccm-guide-open').boundingBox();ok(a.x<b.x);eq(a.y,b.y);
   await p.locator('#ccm-guide-open').click();eq(await p.locator('#ccm-guide-dialog').evaluate(e=>e.open),true);await p.keyboard.press('Escape');eq(await p.locator('#ccm-guide-dialog').evaluate(e=>e.open),false);eq(await p.locator('#ccm-guide-open').evaluate(e=>e===document.activeElement),true);
   await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await p.locator('#ccm-advanced > summary').focus();await p.keyboard.press('Enter');await p.waitForFunction(()=>document.querySelector('#ccm-advanced > summary').getAttribute('aria-expanded')==='true');
   eq(await p.locator('#ccm-advanced-content > section').evaluateAll(xs=>xs.map(x=>x.id)),['ccm-banner-appearance','ccm-log-storage','ccm-adapters-build']);
   await p.keyboard.press('Space');await p.waitForFunction(()=>document.querySelector('#ccm-advanced > summary').getAttribute('aria-expanded')==='false');
   await shot({path:out+'/'+lang+'-settings.png'});
  });
  await test(lang+'-five-settings-and-collapsed-log-save',async()=>{
   await p.locator('#ccm-ttl').fill('124');await p.locator('#ccm-show-reject').uncheck();await p.locator('#ccm-show-configure').check();await p.locator('#ccm-show-accept_all').check();await p.locator('#ccm-show-accept').check();eq(await p.locator('#ccm-show-configure').isDisabled(),true);
   await expand();const logPath=await p.locator('#ccm-log-dir').inputValue();await p.locator('#ccm-log-mode').selectOption('absolute');await p.locator('#ccm-log-dir').fill(initial['cookie_consent.log_dir']);
   await p.locator('#ccm-advanced > summary').click();eq(await p.locator('#ccm-log-dir').inputValue(),initial['cookie_consent.log_dir']);await save();
   const opts=JSON.parse(setting('cookie_consent.options'));eq(opts.ttl_days,124);eq(opts.buttons,{reject:false,configure:true,accept_all:true,accept:true});
   await p.reload();await p.locator('#ccm-save').waitFor();eq(await p.locator('#ccm-ttl').inputValue(),'124');eq(await p.locator('#ccm-show-accept').isChecked(),true);eq(await p.locator('#ccm-advanced').evaluate(e=>e.open),false);
   await p.locator('#ccm-show-accept').uncheck();eq(await p.locator('#ccm-show-configure').isChecked(),true);eq(await p.locator('#ccm-show-accept_all').isChecked(),true);await p.locator('#ccm-show-reject').check();await save();
  });
  await test(lang+'-reconsent-confirm-cancel-and-save-first',async()=>{
   let confirmations=0;const dismiss=async d=>{confirmations++;await d.dismiss();};p.on('dialog',dismiss);const before=JSON.parse(setting('cookie_consent.options'));
   await p.locator('#ccm-ttl').fill('125');await p.locator('#ccm-reconsent').click();eq(confirmations,0,'Dirty form does not send dangerous action');await save();
   await p.locator('#ccm-reconsent').click();eq(confirmations,1);eq(JSON.parse(setting('cookie_consent.options')).policy_version,before.policy_version);p.off('dialog',dismiss);
   p.once('dialog',d=>d.accept());const r=p.waitForResponse(r=>new URLSearchParams(r.request().postData()||'').get('action')==='reconsent');await p.locator('#ccm-reconsent').click();eq((await(await r).json()).success,true);ok(JSON.parse(setting('cookie_consent.options')).policy_version!==before.policy_version);
  });
  await test(lang+'-actual-build-status-force-failure-and-draft',async()=>{
   await expand();let state=ctl('state');eq(await p.locator('#ccm-build-status').getAttribute('data-state'),'ready');
   eq(await p.locator('#ccm-build-time strong').textContent(),await p.evaluate(([raw,lang])=>new Date(raw).toLocaleString(lang),[state.build.built_at,lang]));
   await p.locator('#ccm-ttl').fill('126');const response=p.waitForResponse(r=>new URLSearchParams(r.request().postData()||'').get('action')==='bundle_rebuild');await p.locator('#ccm-bundle-rebuild').click();eq((await(await response).json()).success,true);await p.locator('#ccm-bundle-rebuild:enabled').waitFor();ok(ctl('state').timestamp>state.timestamp);eq(await p.locator('#ccm-ttl').inputValue(),'126');eq(JSON.parse(setting('cookie_consent.options')).ttl_days,125);
   const file='/opt/cc-updates/cases/'+name+'/site/assets/js/cookie-consent/services/google-ga4.js';const original=execFileSync('docker',['exec',container,'cat',file]);state=ctl('state');const time=await p.locator('#ccm-build-time strong').textContent();
   try{ctl('edit','google-ga4.js','syntax');const r=p.waitForResponse(r=>new URLSearchParams(r.request().postData()||'').get('action')==='bundle_rebuild');await p.locator('#ccm-bundle-rebuild').click();eq((await(await r).json()).success,false);await p.locator('#ccm-bundle-rebuild:enabled').waitFor();eq(await p.locator('#ccm-build-status').getAttribute('data-state'),'error');eq(await p.locator('#ccm-build-time strong').textContent(),time);eq(ctl('state').bundle,state.bundle);eq(ctl('state').timestamp,state.timestamp);ok((await p.locator('#ccm-build-status').textContent()).includes('bundle_rebuild'));await shot({path:out+'/'+lang+'-build-error.png'});
    await save();await p.reload();await p.locator('#ccm-save').waitFor();await expand();eq(await p.locator('#ccm-build-status').getAttribute('data-state'),'error');eq(await p.locator('#ccm-build-time strong').textContent(),time);
   }finally{execFileSync('docker',['exec','-i',container,'runuser','-u','www-data','--','tee',file],{input:original,stdio:['pipe','ignore','pipe']});}
   eq((await api('bundle_rebuild')).success,true);await p.reload();await p.locator('#ccm-save').waitFor();await expand();eq(await p.locator('#ccm-build-status').getAttribute('data-state'),'ready');await shot({path:out+'/'+lang+'-advanced.png',fullPage:true});
  });
  await test(lang+'-custom-first-create-edit-and-sources',async()=>{
   await p.locator('#ccm-tab-services').click();await p.locator('#ccm-add-service').click();eq(await p.locator('#ccm-service-adapter option').first().getAttribute('value'),'custom_js');eq(await p.locator('#ccm-service-adapter').inputValue(),'custom_js');ok(await p.locator('#ccm-service-adapter option').count()>10);
   await p.locator('#ccm-service-name').fill('Customer '+lang);await p.locator('#ccm-service-purpose').fill('Customer consent integration');await p.locator('#ccm-service-path').fill('/assets/js/customer-'+lang+'.js');await p.locator('#ccm-service-create').click();await save();
   const custom=JSON.parse(setting('cookie_consent.services')).services.find(s=>s.name==='Customer '+lang);eq(custom.loader,'custom_js');eq(custom.config.path,'/assets/js/customer-'+lang+'.js');
   const before=JSON.parse(setting('cookie_consent.services')).services.map(s=>[s.key,s.loader]);
   await p.locator('[data-settings=yandex] summary').click();await p.locator('#ccm-name-yandex').fill('Yandex '+lang);await save();eq(JSON.parse(setting('cookie_consent.services')).services.map(s=>[s.key,s.loader]),before,'Edit never changes selected adapters');
   for(const details of await p.locator('.ccm-service details').all())if(!await details.evaluate(e=>e.open))await details.locator('summary').click();
   const sources=await p.locator('.ccm-adapter-source').allTextContents();ok(sources.length>10);ok(sources.every(s=>!s.includes('→')&&!s.includes('start()')&&!s.includes('mount()')&&!s.includes('valid()')));ok(sources.some(s=>s.endsWith('services/yandex.js')));ok(sources.some(s=>s.endsWith('/assets/js/customer-'+lang+'.js')));await shot({path:out+'/'+lang+'-services.png'});
  });
 }
 if(process.env.CC_UI_JOURNAL_ONLY)await open('en');
 await test('neutral-and-pending-build-never-claim-success',async()=>{
  await p.locator('#ccm-tab-main').click();
  const pattern='**/assets/components/cookieconsent/connector.php';
  const neutral=async route=>{if(new URLSearchParams(route.request().postData()||'').get('action')!=='get')return route.continue();const response=await route.fetch();const json=await response.json();json.object.adapterBuild=null;return route.fulfill({response,json});};
  await p.route(pattern,neutral);
  try{await p.reload();await p.locator('#ccm-save').waitFor();await expand();eq(await p.locator('#ccm-build-status').getAttribute('data-state'),'fallback');eq(await p.locator('#ccm-build-time strong').textContent(),'—');}
  finally{await p.unroute(pattern,neutral);}
  await p.reload();await p.locator('#ccm-save').waitFor();await expand();let release;const gate=new Promise(resolve=>release=resolve);
  const pending=async route=>{if(new URLSearchParams(route.request().postData()||'').get('action')==='bundle_rebuild')await gate;return route.continue();};
  await p.route(pattern,pending);const response=p.waitForResponse(r=>new URLSearchParams(r.request().postData()||'').get('action')==='bundle_rebuild');
  try{await p.locator('#ccm-bundle-rebuild').click();await p.waitForFunction(()=>document.querySelector('#ccm-build-status').dataset.state==='running');eq(await p.locator('#ccm-bundle-rebuild').isDisabled(),true);eq(await p.locator('#ccm-build-status').getAttribute('data-state'),'running');}
  finally{release();}
  eq((await(await response).json()).success,true);await p.locator('#ccm-bundle-rebuild:enabled').waitFor();eq(await p.locator('#ccm-build-status').getAttribute('data-state'),'ready');await p.unroute(pattern,pending);
 });
 await test('journal-page-old-records-pagination-filters-csv-and-text-safety',async()=>{
  eq(ui('seed').records,55);await p.locator('#ccm-tab-logs').click();await p.locator('#ccm-log-year').selectOption('2025');await p.locator('#ccm-log-find').click();await p.waitForFunction(()=>document.querySelector('#ccm-log-table tbody')?.rows.length===50);
  eq(await p.locator('#ccm-log-table th').allTextContents(),['Date and time — MSK (UTC+03:00)','IP address','Action','Page','Details']);
  eq(await p.locator('#ccm-log-table tbody tr').first().locator('td').nth(3).textContent(),'—');eq(await p.locator('#ccm-log-table tbody tr').nth(1).locator('td').nth(3).textContent(),'/<img src=x onerror=alert(1)>/');eq(await p.locator('#ccm-log-table img').count(),0);
  await p.locator('.ccm-log-view').first().click();await p.locator('#ccm-log-dialog[open]').waitFor();ok((await p.locator('#ccm-log-dialog').textContent()).includes('—'));await p.locator('#ccm-log-close').click();
  await p.locator('#ccm-log-next').click();await p.waitForFunction(()=>document.querySelector('#ccm-log-table tbody').rows.length===5);await p.locator('#ccm-log-previous').click();await p.waitForFunction(()=>document.querySelector('#ccm-log-table tbody').rows.length===50);
  await p.locator('#ccm-log-search').fill('/catalog/item-1/');await p.locator('#ccm-log-find').click();await p.waitForFunction(()=>document.querySelector('#ccm-log-table tbody').rows.length===1);eq(await p.locator('.ccm-log-path').textContent(),'/catalog/item-1/');
  const download=p.waitForEvent('download');await p.locator('#ccm-log-export').click();const file=await(await download).path();const csv=readFileSync(file,'utf8');ok(csv.includes('Page'));ok(csv.includes('/catalog/item-1/'));ok(!csv.includes('/catalog/item-2/'));
  await p.locator('#ccm-log-search').fill('missing-unique');await p.locator('#ccm-log-find').click();await p.waitForFunction(()=>document.querySelector('#ccm-log-table tbody td')?.colSpan===5);eq(await p.locator('#ccm-log-table tbody td').getAttribute('colspan'),'5');
  await p.locator('#ccm-log-search').fill('');await p.locator('#ccm-log-find').click();await p.waitForFunction(()=>document.querySelector('#ccm-log-table tbody').rows.length===50);await shot({path:out+'/en-journal.png'});
  const anonymous=await browser.newContext();try{for(const action of ['logs_list','logs_detail','logs_export','bundle_rebuild'])eq((await(await anonymous.request.post(origin+'/assets/components/cookieconsent/connector.php',{form:{action}})).json()).success,false,'Anonymous '+action+' denied');}finally{await anonymous.close();}
 });
 await test('real-consent-event-pathname-only-and-frontend-regression',async()=>{
  const {id}=ctl('production','strict');await p.locator('#ccm-tab-main').click();await p.reload();await p.locator('#ccm-save').waitFor();await save();
  const visitor=await ctx.newPage(),sent=[];visitor.on('pageerror',e=>errors.push(e.message));visitor.on('request',r=>{if(r.url().includes('/audit.php'))sent.push(r.postDataJSON());});
  const before=ctl('state');await visitor.goto(origin+'/index.php?id='+id+'&private_token=do-not-log#sensitive-fragment',{waitUntil:'networkidle'});eq(await visitor.locator('iframe').count(),0);
  const ack=visitor.waitForResponse(r=>r.url().includes('/audit.php'));await visitor.locator('[data-cc-action=accept-all]').click();eq((await ack).status(),200);await visitor.waitForFunction(()=>document.querySelectorAll('[data-cc-embed] iframe,[data-cc-map-provider] iframe').length===5);
  eq(sent.at(-1).page,'/index.php');const record=ui('logs').records.find(r=>r.event_id===sent.at(-1).event_id);eq(record.page,'/index.php');ok(!JSON.stringify(record).includes('do-not-log'));ok(!JSON.stringify(record).includes('sensitive-fragment'));
  const bad={...sent.at(-1),event_id:crypto.randomUUID(),page:'/catalog/?token=secret'};const rejected=await ctx.request.post(origin+'/assets/components/cookieconsent/audit.php',{headers:{Origin:origin},data:bad});eq(rejected.status(),400);
  await visitor.reload({waitUntil:'networkidle'});eq(await visitor.locator('iframe').count(),5);await visitor.evaluate(()=>web86CookieConsent.openSettings());await visitor.locator('[data-cc-action=back]').click();await Promise.all([visitor.waitForNavigation({waitUntil:'networkidle'}),visitor.locator('[data-cc-action=reject]').click()]);eq(await visitor.locator('iframe').count(),0);eq(ctl('state').bundle,before.bundle);eq(ctl('state').timestamp,before.timestamp);await visitor.close();
  await p.locator('#ccm-tab-logs').click();await p.locator('#ccm-log-year').selectOption('all');await p.locator('#ccm-log-search').fill(record.event_id);await p.locator('#ccm-log-find').click();await p.waitForFunction(()=>document.querySelector('.ccm-log-path')?.textContent==='/index.php');
 });
 for(const lang of ['ru','en'])await test(lang+'-narrow-layout-and-journal',async()=>{
  await open(lang);await p.setViewportSize({width:390,height:844});await shot({path:out+'/'+lang+'-settings-mobile.png'});const rect=await p.locator('.ccm-main').boundingBox();ok(rect.x>=0&&rect.x+rect.width<=390);await expand();await p.locator('#ccm-bundle-rebuild').scrollIntoViewIfNeeded();await shot({path:out+'/'+lang+'-advanced-mobile.png'});await p.locator('#ccm-tab-logs').click();await p.locator('#ccm-log-year').selectOption('2025');await p.locator('#ccm-log-find').click();await p.waitForFunction(()=>document.querySelector('#ccm-log-table tbody').rows.length===50);eq(await p.locator('#ccm-log-table th').nth(3).textContent(),lang==='ru'?'Страница':'Page');await shot({path:out+'/'+lang+'-journal-mobile.png'});await p.setViewportSize({width:1440,height:1000});await p.waitForFunction(()=>document.querySelector('.ccm-main').getBoundingClientRect().width>800);await shot({path:out+'/'+lang+'-journal.png'});
 });
 eq(errors,[],'No Manager/frontend JavaScript errors');
}catch(e){console.error(e.stack);if(p){console.error('Page:',p.url(),(await p.locator('body').innerText()).slice(0,1600));await shot({path:out+'/failure.png'}).catch(()=>{});}process.exitCode=1;}
finally{if(ctx)await ctx.close();await browser.close();for(const[k,v]of Object.entries(initial))setting(k,v);writeFileSync(out+'/results.json',JSON.stringify({modx:major,case:name,tests:results.length,assertions:n,failed:results.filter(r=>r.result==='FAIL').length,errors,results},null,2)+'\n');}
