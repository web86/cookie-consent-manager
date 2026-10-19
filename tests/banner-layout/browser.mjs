import {chromium} from 'playwright';
import {execFileSync} from 'node:child_process';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const origin='https://cmp.example.test',out=process.env.CC_BANNER_OUT||'.local/banner-layout/browser';mkdirSync(out,{recursive:true});
const css=readFileSync('assets/components/cookieconsentmanager/css/cookie-consent.min.css','utf8'),bundle=readFileSync('assets/components/cookieconsentmanager/js/cookie-consent/cookie-consent.min.js','utf8');
const browser=await chromium.launch(),results=[];let n=0;const eq=(a,b,m)=>{n++;assert.deepEqual(a,b,m);},ok=(a,m)=>{n++;assert.ok(a,m);};
const fixture=(...args)=>JSON.parse(execFileSync('php',['tests/banner-layout/fixture.php',...args],{encoding:'utf8'}));
async function pageFor(data,width,style=''){
 const ctx=await browser.newContext({viewport:{width,height:900}}),p=await ctx.newPage(),errors=[],requests=[];
 p.on('pageerror',e=>errors.push(e.message));
 const body=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><link rel="stylesheet" href="/cookie-consent.min.css"><style>body{margin:0;font:16px system-ui;background:#f5f6f8;color:#263341}main{padding:40px}h1{font-size:32px}#video iframe{max-width:100%}.example{background:white;padding:30px;border:1px solid #dfe4e9;border-radius:8px;max-width:650px} ${style}</style><script defer src="/cookie-consent.min.js"></script></head><body><main><h1>Cookie Consent Manager</h1><p>Banner layout · ${width}px</p><div class="example">Website content — consent settings stay under your control.</div>${data.html}</main>${data.banner}<script id="cc-service-registry" type="application/json">${JSON.stringify(data.registry)}</script></body></html>`;
 await ctx.route('**/*',r=>{const u=new URL(r.request().url());if(u.href===origin+'/')return r.fulfill({contentType:'text/html',body});if(u.pathname==='/cookie-consent.min.css')return r.fulfill({contentType:'text/css',body:css});if(u.pathname==='/cookie-consent.min.js')return r.fulfill({contentType:'text/javascript',body:bundle});if(u.pathname.endsWith('/audit.php')){const event=JSON.parse(r.request().postData());return r.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,event_id:event.event_id,server_time:new Date().toISOString()})});}requests.push(u.href);return r.fulfill({contentType:'text/html',body:'<p>Controlled external video</p>'});});
 await p.goto(origin+'/');await p.locator('#cookie-block').waitFor({state:'visible'});return{ctx,p,errors,requests};
}
async function test(name,fn){const start=n;await fn();results.push({name,result:'PASS',assertions:n-start});console.log('PASS '+name);}
try{
 for(const language of ['ru','en'])for(const mode of ['strict','legacy'])for(const position of ['bottom','bottom-right','bottom-left'])for(const profile of ['empty','short','long'])for(const width of [1440,650,390,320])await test([language,mode,position,profile,width].join('-'),async()=>{
  const data=fixture(language,mode,position,profile),{ctx,p,errors,requests}=await pageFor(data,width);
  try{
   eq(await p.locator('.cookie-warning-title').count(),profile==='empty'?0:1,'No empty title element');if(profile!=='empty')eq(await p.locator('.cookie-warning-title').textContent(),data.title,'Localized literal title');
   eq(await p.locator('#video iframe').count(),mode==='legacy'?1:0,'Strict/Legacy unchanged');if(mode==='strict')eq(requests,[],'No external requests before consent');
   const box=await p.locator('#cookie-block').boundingBox();ok(box.x>=-1&&box.x+box.width<=width+1,'Banner within viewport');ok(box.y>=-1&&box.y+box.height<=901,'Scrollable banner remains within viewport');
   eq(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'No page horizontal overflow');
   eq(await p.locator('#cookie-block').evaluate(e=>e.scrollWidth<=e.clientWidth),true,'No banner horizontal overflow');
   if(width<=650||position==='bottom'){eq(Math.round(box.width),width,'Standard bottom bar width');eq(Math.round(box.x),0);}
   else{ok(box.width>=380&&box.width<=420,'Compact width');eq(Math.round(position==='bottom-right'?width-box.x-box.width:box.x),16,'Correct edge');}
   for(const action of ['reject',mode==='legacy'?'accept':'accept-all',...(mode==='strict'?['configure']:[])]){const button=p.locator(`[data-cc-action="${action}"]`);await button.scrollIntoViewIfNeeded();ok(await button.isVisible(),'Button accessible');}
   if(language==='ru'&&mode==='strict'&&profile==='short'&&[1440,390].includes(width)){await p.waitForFunction(()=>getComputedStyle(document.getElementById('cookie-block')).opacity==='1');await p.locator('#cookie-block').evaluate(e=>e.scrollTop=0);await p.screenshot({path:`${out}/${position}-${width===1440?'desktop':'mobile'}.png`});}
   eq(errors,[],'No JS errors');
  }finally{await ctx.close();}
 });
 for(const mode of ['strict','legacy'])for(const position of ['bottom','bottom-right','bottom-left'])await test('consent-'+mode+'-'+position,async()=>{
  const {ctx,p,errors}=await pageFor(fixture('en',mode,position,'short'),390);
  try{
   await p.locator(`[data-cc-action="${mode==='legacy'?'accept':'accept-all'}"]`).click();await p.waitForFunction(()=>!!localStorage.getItem('web86_cookie_consent'));
   const saved=await p.evaluate(()=>JSON.parse(localStorage.getItem('web86_cookie_consent')));eq(saved.version,'1');eq(saved.categories.external_content,true);
   await p.reload();await p.waitForFunction(()=>!!window.web86CookieConsent);eq(await p.locator('#video iframe').count(),1,'Reload keeps choice');
   await p.evaluate(()=>web86CookieConsent.openSettings());await p.locator('[data-cc-action=back]').click();const nav=p.waitForEvent('framenavigated',f=>f===p.mainFrame());await p.locator('[data-cc-action=reject]').click();await nav;await p.waitForLoadState('load');eq(await p.locator('#video iframe').count(),0,'Revoke blocks external content');
   await p.evaluate(()=>web86CookieConsent.openSettings());await p.locator('[data-cc-category=external_content]').check();await p.locator('[data-cc-action=save]').click();eq(await p.locator('#video iframe').count(),1,'Settings grant works');eq(errors,[]);
  }finally{await ctx.close();}
 });
 await test('default-markup-and-customer-css',async()=>{
  const data=fixture('en','strict','bottom','empty');
  const baseline=JSON.parse(execFileSync('php',[process.env.CC_BANNER_BASE+'/tests/placeholder-texts/fixture.php','en','strict','external_content','default'],{encoding:'utf8'}));
  const current=JSON.parse(execFileSync('php',['tests/placeholder-texts/fixture.php','en','strict','external_content','default'],{encoding:'utf8'}));eq(current,baseline,'Existing banner/rendered embeds unchanged byte-for-byte');
  for(const position of ['bottom','bottom-right','bottom-left']){
   const {ctx,p}=await pageFor(fixture('en','strict',position,'short'),1440,'.cookie-warning{background:rgb(20,30,40);color:rgb(230,231,232);font-family:monospace}.cookie-warning .cookie-btn{border-radius:0}');
   try{eq(await p.locator('#cookie-block').evaluate(e=>[getComputedStyle(e).backgroundColor,getComputedStyle(e).color,getComputedStyle(e).fontFamily]),['rgb(20, 30, 40)','rgb(230, 231, 232)','monospace']);eq(await p.locator('[data-cc-action=reject]').evaluate(e=>getComputedStyle(e).borderRadius),'0px','Existing CSS selectors still apply');}finally{await ctx.close();}
  }
 });
}catch(e){results.push({result:'FAIL',error:e.stack});console.error(e);process.exitCode=1;}
finally{await browser.close();writeFileSync(out+'/results.json',JSON.stringify({tests:results.length,assertions:n,failed:results.filter(r=>r.result==='FAIL').length,results},null,2)+'\n');}
