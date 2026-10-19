import {chromium} from 'playwright';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const repo=new URL('../../../../',import.meta.url).pathname.replace(/\/$/,'');
const local=repo+'/.local/modstore-matrix';
const cases=JSON.parse(readFileSync(local+'/cases.json'));
const docker=['compose','--env-file',local+'/private/compose.env','-f',local+'/compose.json'];
const cli=(c,...args)=>execFileSync('docker',[...docker,'exec','-T','--user','www-data',c.name,'php','/opt/cc-source/tests/modstore/fixture.php',...args],{encoding:'utf8'});
const browser=await chromium.launch();
try{for(const c of cases){
 const origin='http://127.0.0.1:'+c.port,assets=c.custom?'/files/':'/assets/',product='cookieconsentmanager'+(c.major===3?'3':'');const results=[];
 const save=()=>writeFileSync(local+'/'+c.name+'/evidence/browser.json',JSON.stringify({case:c,result:'RUNNING',checks:results},null,2)+'\n');
 for(const mode of ['strict','legacy'])for(const position of ['bottom-right','bottom-left','bottom']){
  cli(c,'mode',mode,position);const context=await browser.newContext();const page=await context.newPage();const external=[];const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/*',async route=>{const request=route.request();if(new URL(request.url()).origin===origin)return route.continue();external.push(request.url());await route.fulfill({status:200,contentType:request.resourceType()==='document'?'text/html':'application/javascript',body:''});});
  try{
   await page.goto(origin+'/',{waitUntil:'networkidle'});await page.waitForFunction(()=>!!window.web86CookieConsent);
   const banner=page.locator('#cookie-block');await assert.doesNotReject(()=>banner.waitFor({state:'visible'}));
   assert.equal(await page.locator('script[src*="cached-cookie-consent.min.js"]').count(),1);assert.ok((await page.locator('script[src*="cached-cookie-consent.min.js"]').getAttribute('src')).startsWith(assets+'components/'+product+'/'));
   assert.equal((await banner.getAttribute('class')).includes('cookie-warning--'+position),position!=='bottom');
   if(mode==='strict'){assert.equal(external.length,0,'Strict before consent');assert.equal(await page.locator('iframe').count(),0);assert.equal(await page.evaluate(()=>window.__customerLoaded||0),0);await page.locator('[data-cc-action="accept-all"]').click();}
   else {assert.ok(external.length>0,'Legacy first visit');assert.equal(await page.evaluate(()=>window.__customerLoaded),1);await page.locator('[data-cc-action="accept"]').click();}
   await page.waitForFunction(()=>window.web86CookieConsent.getConsent()?.categories?.external_content===true);await page.waitForTimeout(300);
   assert.equal(await page.locator('iframe').count(),4,'Maps and 3 video providers');assert.equal(await page.evaluate(()=>window.__customerLoaded),1);
   for(const host of ['mc.yandex.ru','www.googletagmanager.com','connect.facebook.net','www.google.com','www.youtube-nocookie.com','rutube.ru','vkvideo.ru'])assert.ok(external.some(url=>new URL(url).hostname===host),'Delayed provider '+host);
   await page.locator('[data-cookie-settings-open]').click();await page.locator('[data-cc-action="save"]').waitFor({state:'visible'});await page.locator('[data-cc-category="marketing"]').uncheck();await page.locator('[data-cc-category="external_content"]').uncheck();
   await Promise.all([page.waitForNavigation({waitUntil:'networkidle'}),page.locator('[data-cc-action="save"]').click()]);await page.waitForFunction(()=>!!window.web86CookieConsent);
   assert.equal(await page.locator('iframe').count(),0,'Revoked external content');assert.equal(await page.evaluate(()=>window.__customerLoaded||0),0,'Saved refusal gates custom service even in Legacy');
   assert.equal(await page.evaluate(()=>window.web86CookieConsent.getConsent().categories.marketing),false);assert.deepEqual(errors,[]);
   results.push({mode,position,result:'PASS'});save();
   if(mode==='strict'&&position==='bottom-right')await page.screenshot({path:local+'/'+c.name+'/evidence/banner.png',fullPage:true});
  }finally{await context.close();}
 }
 // Public receiver validates methods, origin and payload with the generated real-path bootstrap.
 const request=await browser.newContext();try{
  const url=origin+assets+'components/'+product+'/audit.php';assert.equal((await request.request.get(url)).status(),405);
  assert.equal((await request.request.post(url,{headers:{'Content-Type':'text/plain'},data:'x'})).status(),415);
  assert.equal((await request.request.post(url,{headers:{'Content-Type':'application/json',Origin:'https://wrong.invalid'},data:'{}'})).status(),403);
  assert.equal((await request.request.post(url,{headers:{'Content-Type':'application/json',Origin:origin},data:'{'})).status(),400);
  results.push({name:'audit-request-validation',result:'PASS'});
 }finally{await request.close();}
 writeFileSync(local+'/'+c.name+'/evidence/browser.json',JSON.stringify({case:c,result:'PASS',checks:results},null,2)+'\n');console.log('PASS '+c.name+' browser, Strict/Legacy, 3 positions, SDK gates and audit');
}}finally{await browser.close();}
