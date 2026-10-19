import {chromium} from 'playwright';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const bundle=readFileSync(process.env.CC_VIDEO_BUNDLE||'assets/components/cookieconsentmanager3/js/cookie-consent/cookie-consent.min.js','utf8');
const css=readFileSync('assets/components/cookieconsentmanager3/css/cookie-consent.min.css','utf8'),origin='https://cmp.example.test';
const browser=await chromium.launch(),results=[];let assertions=0;
const eq=(a,b,message)=>{assertions++;assert.deepEqual(a,b,message);};
const documentFor=(fixture,html=fixture.html)=>`<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/cookie-consent.min.css"><script defer src="/cookie-consent.min.js"></script></head><body>${html}${fixture.banner}<script id="cc-service-registry" type="application/json">${JSON.stringify(fixture.registry)}</script></body></html>`;
async function pageFor(body){const ctx=await browser.newContext({viewport:{width:1200,height:900}}),p=await ctx.newPage(),requests=[],errors=[];p.on('pageerror',e=>errors.push(e.message));await ctx.route('**/*',route=>{const u=new URL(route.request().url());if(u.href===origin+'/')return route.fulfill({contentType:'text/html',body});if(u.pathname==='/cookie-consent.min.js')return route.fulfill({contentType:'text/javascript',body:bundle});if(u.pathname==='/cookie-consent.min.css')return route.fulfill({contentType:'text/css',body:css});if(u.pathname.endsWith('/audit.php')){const event=JSON.parse(route.request().postData());return route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,event_id:event.event_id,server_time:new Date().toISOString()})});}requests.push(u.href);return route.fulfill({contentType:u.pathname.endsWith('.webp')?'image/svg+xml':'text/html',body:u.pathname.endsWith('.webp')?'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="9"/>':'<p>Controlled iframe</p>'});});return {ctx,p,requests,errors};}
async function run(name,fn){const n=assertions;await fn();results.push({name,result:'PASS',assertions:assertions-n});console.log('PASS '+name);}
try{
 for(const language of ['ru','en'])for(const mode of ['strict','legacy'])for(const category of ['analytics','marketing','external_content'])for(const profile of ['default','custom'])await run([language,mode,category,profile].join('-'),async()=>{
  const fixture=JSON.parse(execFileSync('php',['tests/placeholder-texts/fixture.php',language,mode,category,profile],{encoding:'utf8'}));const {ctx,p,requests,errors}=await pageFor(documentFor(fixture));
  try{
   await p.goto(origin+'/',{waitUntil:'networkidle'});
   eq(await p.locator('iframe').count(),mode==='legacy'?6:0,'Mode determines initial loading');if(mode==='strict')eq(requests,[],'Strict sends no external requests before permission');
   if(mode==='legacy'){const reloaded=p.waitForEvent('framenavigated',f=>f===p.mainFrame());await p.locator('[data-cc-action=reject]').click();await reloaded;await p.waitForLoadState('networkidle');eq(await p.locator('iframe').count(),0,'Legacy saved refusal restores placeholders');}
   for(const [key,name]of Object.entries(fixture.names)){
    const wrapper=p.locator('#'+key),template=fixture.mapNotices[key]||fixture.notice;
    eq(await wrapper.locator('p').first().textContent(),template.split('{provider}').join(name),'Localized provider name as text: '+key);
    eq(await wrapper.locator('button').textContent(),fixture.button,'One shared button: '+key);
    await wrapper.locator('button').focus();await p.keyboard.press('Enter');eq(await p.locator(`[data-cc-category="${category}"]`).evaluate(n=>n===document.activeElement),true,'Opens assigned category: '+key);eq(await p.locator('iframe').count(),0,'Button does not grant consent');await p.locator('[data-cc-action=back]').click();
   }
   eq(await p.locator('#company_player img, #company_player script').count(),0,'Provider data never becomes markup');
   await p.locator('#company_player button').focus();await p.keyboard.press('Enter');await p.locator(`[data-cc-category="${category}"]`).check();await p.locator('[data-cc-action=save]').click();await p.waitForTimeout(50);eq(await p.locator('iframe').count(),6,'Consent activates all six wrappers');
   const revoked=p.waitForEvent('framenavigated',f=>f===p.mainFrame());await p.evaluate(()=>{web86CookieConsent.openSettings();document.querySelector('[data-cc-action=back]').click();document.querySelector('[data-cc-action=reject]').click();});await revoked;await p.waitForLoadState('networkidle');eq(await p.locator('iframe').count(),0,'Revocation removes content');eq(errors,[],'No browser errors');
  }finally{await ctx.close();}
 });
 await run('unregistered-template-key-fails-closed',async()=>{
  const fixture=JSON.parse(execFileSync('php',['tests/placeholder-texts/fixture.php','en','strict','external_content'],{encoding:'utf8'}));const {ctx,p,requests,errors}=await pageFor(documentFor(fixture));try{await p.goto(origin+'/',{waitUntil:'networkidle'});const result=await p.evaluate(()=>{const node=document.createElement('div');node.dataset.ccEmbed='bad"]';node.innerHTML='<template><iframe src="https://player.example.test/never"></iframe></template>';document.body.prepend(node);web86CookieConsent.mountEmbeds(node);const off=document.createElement('div');off.dataset.ccEmbed='disabled_player';off.innerHTML='<template><iframe src="https://player.example.test/disabled"></iframe></template>';document.body.prepend(off);web86CookieConsent.mountEmbeds(off);return {frames:node.querySelectorAll('iframe').length,text:node.textContent,disabled:off.textContent,disabledFrames:off.querySelectorAll('iframe').length};});eq(result.frames,0);eq(result.text.includes('Embed unavailable'),true);eq(result.disabled.includes('Embed unavailable'),true,'Disabled generic instance preserves the localized unavailable state');eq(result.disabledFrames,0);eq(requests,[]);eq(errors,[]);}finally{await ctx.close();}
 });
 await run('previous-bundle-after-failed-administrative-rebuild',async()=>{
  const fixture=JSON.parse(execFileSync('php',['tests/placeholder-texts/fixture.php','en','strict','external_content'],{encoding:'utf8'}));
  const previous=execFileSync('git',['show','2b7ae675a844728059dd03e5ac54d7a4c38c1d8b:assets/components/cookieconsentmanager3/js/cookie-consent/cookie-consent.min.js'],{encoding:'utf8'});
  const {ctx,p,requests,errors}=await pageFor(documentFor(fixture));await ctx.route('**/cookie-consent.min.js',r=>r.fulfill({contentType:'text/javascript',body:previous}));
  try{await p.goto(origin+'/',{waitUntil:'networkidle'});const notice=await p.locator('#company_player p').textContent();eq(notice.includes('loading this content shares your IP address'),true,'Previous bundle receives a localized common fallback');eq(notice.includes('{provider}'),false,'No unresolved provider token in legacy fallback');eq(await p.locator('#company_player button').textContent(),'Cookie settings');eq(requests,[],'Retained bundle stays Strict');await p.locator('#company_player button').focus();await p.keyboard.press('Enter');await p.locator('[data-cc-category=external_content]').check();await p.locator('[data-cc-action=save]').click();eq(await p.locator('#company_player iframe').count(),1,'Previous bundle still activates trusted content');eq(errors,[]);}finally{await ctx.close();}
 });
 const doc=readFileSync('docs/modx3-embed-display-examples.md','utf8'),examples=[...doc.matchAll(/```html\n<!-- example: ([a-z-]+) -->\n([\s\S]*?)\n```/g)];eq(examples.length,6,'Six exact documented HTML examples');
 const fixture=JSON.parse(execFileSync('php',['tests/placeholder-texts/fixture.php','en','strict','external_content'],{encoding:'utf8'}));
 for(const [,name,html]of examples)await run('documented-'+name,async()=>{
  const {ctx,p,requests,errors}=await pageFor(documentFor(fixture,html));try{
   await p.goto(origin+'/',{waitUntil:'networkidle'});eq(await p.locator('iframe').count(),0,'Documented template inert');eq(requests.some(u=>new URL(u).origin!==origin),false,'No external preconsent request');
   eq(requests.some(u=>u.endsWith('/assets/img/video-preview.webp')),name==='local-poster','Only local poster requested');
   await p.locator('[data-cc-settings]').focus();await p.keyboard.press('Enter');await p.locator('[data-cc-category=external_content]').check();await p.locator('[data-cc-action=save]').click();eq(await p.locator('iframe').count(),1);
   if(name==='fixed-size'){eq(await p.locator('iframe').getAttribute('width'),'720');eq(await p.locator('iframe').getAttribute('height'),'405');eq(await p.locator('iframe').evaluate(n=>[Math.round(n.getBoundingClientRect().width),Math.round(n.getBoundingClientRect().height)]),[720,405]);}
   else{const ratio=name==='portrait'?9/16:16/9;const dimensions=await p.locator('iframe').evaluate(n=>{const r=n.getBoundingClientRect();return [r.width,r.height]});eq(Math.abs(dimensions[0]/dimensions[1]-ratio)<.01,true,'Rendered aspect ratio');}
   if(name==='responsive'){for(const width of [1200,480]){await p.setViewportSize({width,height:900});const dims=await p.locator('[data-cc-embed]').evaluate(n=>[n.getBoundingClientRect().width,n.parentElement.clientWidth]);eq(Math.round(dims[0]),Math.min(960,dims[1]),'Responsive width follows parent');}}
   eq(requests.includes('https://images.example.test/poster.webp'),false,'External poster never loaded even after consent');eq(errors,[]);
  }finally{await ctx.close();}
 });
}catch(e){results.push({result:'FAIL',error:e.stack});console.error(e);process.exitCode=1;}
finally{await browser.close();mkdirSync('.local/placeholder-texts',{recursive:true});writeFileSync('.local/placeholder-texts/results.json',JSON.stringify({tests:results.length,assertions,failed:results.filter(r=>r.result==='FAIL').length,results},null,2)+'\n');}
