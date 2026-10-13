import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {origin,registry,setting,docker} from '../helpers.mjs';
const cats=['analytics','marketing','external_content'],out='.local/beta21-evidence';mkdirSync(out,{recursive:true});
const b=await chromium.launch(),results=[];let n=0;const eq=(a,c,m)=>{n++;assert.deepEqual(a,c,m);};
const test=async(name,fn)=>{const start=n;try{await fn();results.push({name,result:'PASS',assertions:n-start});console.log('PASS '+name);}catch(e){results.push({name,result:'FAIL',error:e.message});throw e;}};
const ctx=await b.newContext();ctx.setDefaultTimeout(15000);const mgr=await ctx.newPage();await ctx.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
try{
 const creds=JSON.parse(docker(['web','php','-r','echo file_get_contents("/opt/cc-private/manager.json");']));await mgr.goto(origin+'/manager/');await mgr.locator('#modx-login-username').fill(creds.username);await mgr.locator('#modx-login-password').fill(creds.password);await mgr.locator('#modx-login-btn').click();await mgr.waitForFunction(()=>window.MODx?.siteId,{},{timeout:15000});await mgr.goto(origin+'/manager/?a=index&namespace=cookie_consent');await mgr.locator('#ccm-save').waitFor();const token=await mgr.evaluate(()=>CookieConsentManagerBootstrap.auth);
 const api=async(action,form={})=>(await ctx.request.post(origin+'/assets/components/cookieconsent/connector.php',{headers:{modAuth:token},form:{action,HTTP_MODAUTH:token,...form}})).json();
 const original=(await api('get')).object;const fixture=origin+'/?id='+docker(['web','php','/opt/cc-source/tests/beta21/fixture.php']).trim();
 for(let mask=0;mask<8;mask++)await test('SSR-JS-preview-category-activity-mask-'+mask,async()=>{
  const active=structuredClone(registry);for(const s of active.services)s.enabled=Boolean(mask&(1<<cats.indexOf(s.category)));setting('cookie_consent.services',JSON.stringify(active));
  const visible=['necessary',...cats.filter((c,i)=>mask&(1<<i))];
  const disabled=await b.newContext({javaScriptEnabled:false});disabled.setDefaultTimeout(15000);await disabled.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  // Inspection stylesheet exposes only the two SSR panels; no page script runs.
  await disabled.route('**/assets/css/cookie-consent.css',async r=>{const response=await r.fetch();await r.fulfill({response,body:(await response.text())+'.cookie-warning.closed{display:block!important}.cookie-warning.done{opacity:1!important}.cookie-warning-settings[hidden]{display:block!important}'});});
  try{const p=await disabled.newPage();await p.goto(fixture);eq(await p.locator('[data-cc-category-row=necessary]').getAttribute('hidden'),null);for(const[i,cat]of cats.entries())eq(await p.locator('[data-cc-category-row='+cat+']').getAttribute('hidden'),mask&(1<<i)?null:'');
   eq(await p.locator('[data-cc-category-row]:visible').evaluateAll(xs=>xs.map(x=>x.dataset.ccCategoryRow)),visible);

  }finally{await disabled.close();}
  const live=await b.newContext();live.setDefaultTimeout(15000);const p=await live.newPage(),requests=[];await live.route('**/*',r=>{requests.push(r.request().url());return new URL(r.request().url()).origin===origin?r.continue():r.abort();});
  try{await p.goto(fixture,{waitUntil:'networkidle'});await p.locator('[data-cc-action=configure]').click();eq(await p.locator('[data-cc-category-row]:visible').evaluateAll(xs=>xs.map(x=>x.dataset.ccCategoryRow)),visible);eq(requests.filter(u=>u.includes('/mock/')),[]);
   await p.locator('[data-cc-action=back]').click();await p.locator('[data-cc-action=accept-all]').click();await p.waitForTimeout(200);const consent=await p.evaluate(()=>web86CookieConsent.getConsent());eq(Object.keys(consent.providers).sort(),active.services.filter(s=>s.enabled).map(s=>s.key).sort());eq(await p.locator('[data-cc-map-provider] iframe').count(),mask&4?2:0);for(const map of ['google_maps','yandex_maps'])eq(requests.some(u=>u.endsWith('/mock/'+map+'.html')),Boolean(mask&4));for(const s of active.services.filter(s=>!s.enabled))eq(requests.some(u=>u.includes('/mock/'+s.key+'.js')||u.includes('/mock/maps/'+s.key)),false);eq(requests.filter(u=>new URL(u).origin!==origin),[]);
  }finally{await live.close();}
  const draft=Object.fromEntries(['options','registry','texts','log_dir','audit_config_file'].map(k=>[k,original[k]]));draft.registry=active;const preview=(await api('preview',{draft:JSON.stringify(draft),language:'en'})).object;
  eq(preview.visibleCategories,Object.fromEntries(['necessary',...cats].map(c=>[c,visible.includes(c)])));
 });
 await test('Manager-unsaved-service-toggle-immediately-updates-preview-no-persist',async()=>{
  setting('cookie_consent.services',JSON.stringify(registry));await mgr.reload();await mgr.locator('#ccm-save').waitFor();await mgr.locator('#ccm-tab-services').click();await mgr.locator('[data-preview-state=preferences]').click();const frame=mgr.frameLocator('#ccm-preview-frame');await frame.locator('input[type=checkbox]').first().waitFor();eq(await frame.locator('input[type=checkbox]').count(),4);
  for(const service of registry.services){await mgr.locator('#ccm-enable-'+service.key).uncheck();}
  await frame.locator('input[type=checkbox]').nth(1).waitFor({state:'detached'});eq(await frame.locator('input[type=checkbox]').count(),1);
  for(let mask=1;mask<8;mask++){
   const response=mgr.waitForResponse(r=>(r.request().postData()||'').includes('action=preview'));
   for(const service of registry.services){const box=mgr.locator('#ccm-enable-'+service.key);await box.setChecked(Boolean(mask&(1<<cats.indexOf(service.category))));}
   const preview=(await(await response).json()).object;eq(preview.visibleCategories,Object.fromEntries(['necessary',...cats].map(c=>[c,c==='necessary'||Boolean(mask&(1<<cats.indexOf(c)))])));
   const names=['necessary',...cats.filter((c,i)=>mask&(1<<i))].map(c=>preview.strings[c+'_name']);
   for(let retry=0;retry<50;retry++){if(JSON.stringify(await frame.locator('strong').allTextContents())===JSON.stringify(names))break;await mgr.waitForTimeout(40);}
   eq(await frame.locator('strong').allTextContents(),names);
  }
  eq((await api('get')).object.registry.services.map(s=>[s.key,s.enabled]),registry.services.map(s=>[s.key,s.enabled]));
 });
 await test('disabled-provider-never-loads-then-new-enable-never-expands-stored-grants',async()=>{
  const active=structuredClone(registry),late={key:'late_counter',loader:'google_ga4',category:'analytics',enabled:false,name:'Late counter',purpose:'New purpose',purpose_id:'late_counter',config:{id:'G-LATE1234'}};active.services.push(late);setting('cookie_consent.services',JSON.stringify(active));
  const isolated=await b.newContext(),page=await isolated.newPage(),requests=[];await isolated.route('**/*',r=>{requests.push(r.request().url());return new URL(r.request().url()).origin===origin?r.continue():r.abort();});
  try{await page.goto(fixture,{waitUntil:'networkidle'});await page.locator('[data-cc-action=accept-all]').click();const stored=await page.evaluate(()=>localStorage.getItem('web86_cookie_consent'));eq(Object.hasOwn(JSON.parse(stored).providers,'late_counter'),false);eq(requests.some(u=>u.includes('/mock/late_counter.js')),false);
   late.enabled=true;active.services[0].enabled=false;setting('cookie_consent.services',JSON.stringify(active));requests.length=0;await page.reload({waitUntil:'networkidle'});eq(await page.evaluate(()=>localStorage.getItem('web86_cookie_consent')),stored);const grants=await page.evaluate(()=>web86CookieConsent.getConsent().providers);eq(Object.hasOwn(grants,'late_counter'),false);eq(Object.hasOwn(grants,active.services[0].key),false);eq(requests.some(u=>u.includes('/mock/late_counter.js')||u.includes('/mock/'+active.services[0].key+'.js')),false);eq(await page.locator('[data-cc-action=reject]').isVisible(),true);
   await page.locator('[data-cc-action=configure]').click();await page.locator('[data-cc-action=save]').click();eq(Object.hasOwn(await page.evaluate(()=>web86CookieConsent.getConsent().providers),'late_counter'),false);eq(requests.filter(u=>new URL(u).origin!==origin),[]);
  }finally{await isolated.close();}
 });
 await test('empty-registry-accept-all-then-enable-categories-no-permission-expansion',async()=>{
  const empty=structuredClone(registry);for(const s of empty.services)s.enabled=false;setting('cookie_consent.services',JSON.stringify(empty));const isolated=await b.newContext(),page=await isolated.newPage(),requests=[];await isolated.route('**/*',r=>{requests.push(r.request().url());return new URL(r.request().url()).origin===origin?r.continue():r.abort();});
  try{await page.goto(fixture,{waitUntil:'networkidle'});await page.locator('[data-cc-action=accept-all]').click();const stored=await page.evaluate(()=>localStorage.getItem('web86_cookie_consent'));eq(Object.keys(JSON.parse(stored).providers),[]);setting('cookie_consent.services',JSON.stringify(registry));requests.length=0;await page.reload({waitUntil:'networkidle'});eq(await page.evaluate(()=>localStorage.getItem('web86_cookie_consent')),stored);eq(Object.keys(await page.evaluate(()=>web86CookieConsent.getConsent().providers)),[]);eq(requests.filter(u=>u.includes('/mock/')),[]);eq(await page.locator('[data-cc-map-provider] iframe').count(),0);eq(await page.locator('[data-cc-action=reject]').isVisible(),true);await page.locator('[data-cc-action=configure]').click();await page.locator('[data-cc-action=save]').click();eq(Object.keys(await page.evaluate(()=>web86CookieConsent.getConsent().providers)),[]);eq(requests.filter(u=>u.includes('/mock/')),[]);
  }finally{await isolated.close();}
 });
}catch(e){console.error(e.message);process.exitCode=1;}
finally{setting('cookie_consent.services',JSON.stringify(registry));await b.close();writeFileSync(out+'/categories.json',JSON.stringify({suite:'Beta21 all eight activity masks / real SSR no JS / public / preview',tests:results.length,assertions:n,failed:results.filter(x=>x.result==='FAIL').length,results},null,2));}
