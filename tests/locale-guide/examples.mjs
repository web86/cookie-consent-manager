// Execute the documented category example as owner code; guide rendering remains inert.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {origin,docker} from '../helpers.mjs';
const ctl=(a,input)=>docker(['web','php','/opt/cc-source/tests/local/manager-i18n-control.php',...a],input).trim();
const saved=ctl(['setting','cookie_consent.services','get']),ids=JSON.parse(docker(['web','php','/opt/cc-source/tests/beta31/fixture.php']));
const docs=JSON.parse(readFileSync('_build/user-guide.json')).languages;
const example=docs.en.sections[4].blocks.find(x=>x.type==='code').text;
const b=await chromium.launch(),results=[];let n=0;
const eq=(a,c,m)=>{n++;assert.deepEqual(a,c,m)};
const test=async(name,fn)=>{const start=n;try{await fn();results.push({name,result:'PASS',assertions:n-start});console.log('PASS '+name)}catch(e){results.push({name,result:'FAIL',assertions:n-start,error:e.message});throw e}};
async function session(hold=false){
 const ctx=await b.newContext(),p=await ctx.newPage(),requests=[],external=[],errors=[];let signal,release;
 const entered=new Promise(r=>signal=r);p.on('pageerror',e=>errors.push(e.message));
 await ctx.addInitScript(()=>{window.__moduleInit=0;});await ctx.addInitScript({content:example});
 await ctx.route('**/*',async r=>{
  const u=new URL(r.request().url());if(u.origin!==origin){external.push(u.href);return r.abort();}
  if(u.pathname==='/assets/js/custom-map.js'){
   requests.push('module');signal();if(hold)await new Promise(resolve=>release=resolve);
   return r.fulfill({contentType:'text/javascript',body:'export async function initMap(stillAllowed) { if (!stillAllowed()) return; window.__moduleInit++; }'});
  }
  if(u.pathname.endsWith('/audit.php')&&r.request().postData()?.includes('save_settings'))await new Promise(resolve=>setTimeout(resolve,600));
  return r.continue();
 });
 await p.goto(origin+'/?id='+ids.mock,{waitUntil:'networkidle'});
 return{ctx,p,requests,external,errors,entered,release:()=>release?.(),close:async()=>{release?.();await ctx.close();}};
}
try{
 ctl(['setting','cookie_consent.services'],JSON.stringify({schema:1,services:[]}));
 await test('actual-guide-example-A-zero-services-grant-and-restored-consent',async()=>{
  const s=await session();try{
   eq(s.requests,[]);eq(await s.p.evaluate(()=>__moduleInit),0);
   await s.p.locator('[data-cc-action=accept-all]').click();await s.p.waitForFunction(()=>__moduleInit===1);
   eq(s.requests,['module']);eq(await s.p.locator('#cc-public-config').count(),0);
   s.requests.length=0;await s.p.reload({waitUntil:'networkidle'});
   eq(await s.p.evaluate(()=>__moduleInit),1);eq(s.requests,['module']);eq(s.external,[]);eq(s.errors,[]);
  }finally{await s.close();}
 });
 await test('actual-guide-example-A-withdraw-pending-import-no-late-init',async()=>{
  const s=await session(true);try{
   await s.p.locator('[data-cc-action=accept-all]').click();await s.entered;
   await s.p.evaluate(()=>web86CookieConsent.openSettings());await s.p.locator('[data-cc-category=external_content]').uncheck();
   const nav=s.p.waitForNavigation({waitUntil:'networkidle'});nav.catch(()=>{});
   await s.p.locator('[data-cc-action=save]').click();s.release();await s.p.waitForTimeout(150);
   eq(await s.p.evaluate(()=>__moduleInit),0,'Recheck after import blocks init');await nav;
   eq(await s.p.evaluate(()=>__moduleInit),0);eq(s.requests,['module'],'No new import after revoked reload');eq(s.external,[]);eq(s.errors,[]);
  }finally{await s.close();}
 });
 for(const [lang,inline,reject]of [['ru',false,'Отклонить'],['en',false,'Reject'],['tr',true,'Reddet']])await test('historical-standalone-i18n-'+lang,async()=>{
  const ctx=await b.newContext(),p=await ctx.newPage(),requests=[];
  await ctx.route('**/*',r=>{
   const u=new URL(r.request().url());requests.push(u.pathname);if(u.origin!==origin)return r.abort();
   if(u.pathname==='/owner-standalone')return r.fulfill({contentType:'text/html',body:'<!doctype html><html lang="'+lang+'"><head>'+(inline?'<script id="cc-public-config" type="application/json">{"locale":"tr","strings":{"reject":"Reddet"}}</script>':'')+'<script src="/fixtures/i18n.js"></script></head><body>Owner standalone</body></html>'});
   if(u.pathname==='/fixtures/i18n.js')return r.fulfill({contentType:'text/javascript',body:readFileSync('assets/js/cookie-consent/i18n.js','utf8')});
   if(u.pathname==='/fixtures/lexicons.json')return r.fulfill({contentType:'application/json',body:readFileSync('assets/js/cookie-consent/lexicons.json','utf8')});
   return r.abort();
  });
  try{await p.goto(origin+'/owner-standalone',{waitUntil:'networkidle'});eq(await p.evaluate(async()=>{await web86I18n.ready;return web86I18n.t('reject')}),reject);eq(requests.includes('/fixtures/lexicons.json'),!inline);eq(await p.evaluate(()=>typeof web86CookieConsent),'undefined','Not a current CMP integration');}finally{await ctx.close();}
 });
}catch(e){console.error(e.message);process.exitCode=1;}
finally{ctl(['setting','cookie_consent.services'],saved);await b.close();mkdirSync('.local/modx3/locale-guide-evidence',{recursive:true});writeFileSync('.local/modx3/locale-guide-evidence/examples.json',JSON.stringify({tests:results.length,assertions:n,failed:results.filter(x=>x.result==='FAIL').length,results},null,2));}
