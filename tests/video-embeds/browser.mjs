import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
const bundle=readFileSync(process.env.CC_VIDEO_BUNDLE||'assets/js/cookie-consent/cookie-consent.min.js','utf8');
const demo=readFileSync('demo.html','utf8');const origin='https://cmp.example.test';
const browser=await chromium.launch();const results=[];let assertions=0;
const eq=(a,b,msg)=>{assertions++;assert.deepEqual(a,b,msg);};
const storage=(kind,category='external_content')=>({model:'categories_v2',version:'1',necessary:true,savedAt:Date.now(),consentId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',categories:{analytics:kind==='all'||kind==='partial'&&category==='analytics',marketing:kind==='all'||kind==='partial'&&category==='marketing',external_content:kind==='all'||kind==='partial'&&category==='external_content'},category_versions:{analytics:0,marketing:0,external_content:0}});
const embed=(key,id=key)=>`<div id="${id}" data-cc-embed="${key}"><template><section class="trusted"><iframe src="https://player.example.test/${key}" title="Fixture"></iframe><i data-preserved="true">Trusted HTML</i></section></template></div>`;
async function exercise({legacy=false,stored=null,hidden=false,category='external_content',loader='youtube',language='en',bulk=false,dialog=false,poster=false,generated=false}={}){
 const ctx=await browser.newContext();const p=await ctx.newPage();const requests=[],audits=[],errors=[];
 const services=[{key:'video_2',loader,category,enabled:true,config:{}},{key:'disabled',loader,category,enabled:false,config:{}},...['youtube','rutube','vk_video'].map(loader=>({key:loader,loader,category,enabled:true,config:{}}))];
 let body=demo.replace(/<script id="cc-service-registry"[^>]*>.*?<\/script>/s,`<script id="cc-service-registry" type="application/json">${JSON.stringify({schema:1,services})}</script>`).replaceAll(/<div data-cc-map-provider=[\s\S]*?<\/div>/g,'').replace('data-cc-mode="mock"','data-cc-mode="live"').replace('data-cc-show-accept="0"',`data-cc-show-accept="${legacy?1:0}"`);
 body=body.replace('data-cc-audit-url=""','data-cc-audit-url="/audit"');
 if(hidden)body=body.replace(`data-cc-category-${category.replaceAll('_','-')}="1"`,`data-cc-category-${category.replaceAll('_','-')}="0"`);
 const messages=language==='ru'?{embed_notice:'Содержимое доступно после разрешения категории.',embed_settings:'Открыть настройки категории',embed_disabled:'Встраивание недоступно.',embed_rejected:'Адрес отклонён.'}:{embed_notice:'Content is available after allowing its category.',embed_settings:'Open category settings',embed_disabled:'Embed unavailable.',embed_rejected:'URL rejected.'};
 body=body.replace('</body>',`${Object.entries(messages).map(([k,v])=>`<span hidden data-cc-message="${k}">${v}</span>`).join('')}${embed('video_2')}${embed('disabled')}${embed('unknown')}${['youtube','rutube','vk_video'].map(k=>embed(k)).join('')}${dialog?`<dialog id="modal">${embed('video_2','modal-video')}</dialog>`:''}</body>`);
 if(generated){const urls={youtube:'https://www.youtube-nocookie.com/embed/M7lc1UVf-VE?autoplay=0',rutube:'https://rutube.ru/play/embed/7716bd3e665725c3c008ae7ab4ff02e2/?p=secret&amp;t=30',vk_video:'https://vkvideo.ru/video_ext.php?oid=-1&amp;id=2&amp;autoplay=0'};body=body.replace(embed('video_2'),embed('video_2').replace('data-cc-embed="video_2"','data-cc-embed="video_2" data-cc-video="'+loader+'" data-cc-width="640" data-cc-title="Generated title" data-cc-allow-fullscreen="0"').replace('https://player.example.test/video_2',urls[loader]));}
 if(poster)body=body.replace('id="video_2"','data-cc-poster="/poster.webp" id="video_2"').replace('id="youtube"','data-cc-poster="https://images.example.test/poster.webp" id="youtube"');
 if(stored){let data=storage(stored,category);if(stored==='expired')data.savedAt=Date.now()-100*86400000;if(stored==='policy')data.version='old';if(stored==='stale')data.category_versions[category]=99;await ctx.addInitScript(value=>{if(!sessionStorage.getItem('cc-seeded')){localStorage.setItem('web86_cookie_consent',JSON.stringify(value));sessionStorage.setItem('cc-seeded','1');}},data);}
 p.on('pageerror',e=>errors.push(e.message));
 await ctx.route('**/*',r=>{const u=new URL(r.request().url());if(u.pathname==='/audit'){const event=JSON.parse(r.request().postData());audits.push(event);return r.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,event_id:event.event_id,server_time:new Date().toISOString()})});}if(u.href===origin+'/')return r.fulfill({contentType:'text/html',body});if(u.pathname.endsWith('cookie-consent.min.js'))return r.fulfill({contentType:'text/javascript',body:bundle});if(u.pathname.endsWith('cookie-consent.min.css'))return r.fulfill({contentType:'text/css',body:readFileSync('assets/css/cookie-consent.min.css','utf8')});requests.push(u.href);return r.fulfill({contentType:'text/html',body:'<p>Controlled iframe</p>'});});
 try{
  await p.goto(origin+'/',{waitUntil:'load'});const active=stored==='all'||stored==='partial'||legacy&&!stored;const allowed=active&&!hidden;
  eq(await p.locator('#video_2 iframe').count(),allowed?1:0,'Effective category permission');eq(await p.locator('#disabled iframe,#unknown iframe').count(),0,'Disabled and missing fail closed');
  if(!allowed)eq(requests.filter(u=>new URL(u).origin!==origin),[],'No external request, including posters, before permission');
  if(poster){eq(requests.includes(origin+'/poster.webp'),true,'Same-origin poster visible before choice');if(!allowed)eq(requests.includes('https://images.example.test/poster.webp'),false);}
  eq(await p.locator('#video_2 template .trusted').count(),0,'Template stays inert');
  if(bulk){
   const before=requests.length;
   await p.evaluate(()=>{window.__removedWeakRefs=[];for(let round=0;round<10;round++){const host=document.createElement('div');document.body.append(host);for(let i=0;i<100;i++){const n=document.createElement('div');n.dataset.ccEmbed='video_2';n.innerHTML='<template><iframe src="https://player.example.test/bulk" title="Bulk"></iframe></template>';host.append(n);if(i===0)__removedWeakRefs.push(new WeakRef(n));}web86CookieConsent.mountEmbeds(host);web86CookieConsent.mountEmbeds(host);host.remove();web86CookieConsent.mountEmbeds();}});
   eq(await p.locator('iframe').count(),allowed?4:0,'Removed batches leave no mounted DOM');
   if(!allowed)eq(requests.length,before,'Mass mount without permission requests nothing');
   const cdp=await ctx.newCDPSession(p);await cdp.send('HeapProfiler.collectGarbage');await cdp.send('HeapProfiler.collectGarbage');eq(await p.evaluate(()=>__removedWeakRefs.every(ref=>ref.deref()===undefined)),true,'Removed mounted nodes are collectible');await cdp.detach();
  }
  if(!process.argv.includes('--static')) await p.evaluate(()=>{web86CookieConsent.mountEmbeds();web86CookieConsent.mountEmbeds(document.getElementById('video_2'));});eq(await p.locator('#video_2 iframe').count(),allowed?1:0,'Idempotent root mounting');
  if(!hidden&&!allowed){
   if(dialog){await p.evaluate(()=>document.getElementById('modal').showModal());await p.locator('#modal-video [data-cc-settings]').focus();await p.keyboard.press('Enter');eq(await p.locator('#modal').evaluate(n=>n.open),false);}
   else{await p.locator('#video_2 [data-cc-settings]').focus();await p.keyboard.press('Enter');}
   eq(await p.locator(`[data-cc-category="${category}"]`).evaluate(n=>document.activeElement===n),true,'Settings focuses assigned category');eq(await p.locator('#video_2 iframe').count(),0,'Button never grants permission');
   eq(await p.locator('#video_2 [data-cc-settings]').textContent(),messages.embed_settings);
   await p.locator(`[data-cc-category="${category}"]`).check();await p.locator('[data-cc-action="save"]').click();
   eq(await p.locator('#video_2 iframe').count(),1,'Saving category activates content');if(dialog)eq(await p.locator('#modal').evaluate(n=>n.open),true);
  }
  if(!hidden){
   eq(await p.locator('#video_2 .trusted [data-preserved]').getAttribute('data-preserved'),'true','Trusted complex markup unchanged');
   if(generated){eq(await p.locator('#video_2 iframe').getAttribute('title'),'Generated title');eq(await p.locator('#video_2 iframe').getAttribute('width'),'640');eq(await p.locator('#video_2 iframe').getAttribute('allowfullscreen'),null);}
   const count=requests.length;if(!process.argv.includes('--static')) await p.evaluate(()=>{web86CookieConsent.mountEmbeds();web86CookieConsent.mountEmbeds();});await p.waitForTimeout(25);eq(requests.length,count,'No duplicate requests');
   if(!process.argv.includes('--static')) { await p.evaluate(()=>{const n=document.createElement('div');n.id='ajax';n.dataset.ccEmbed='video_2';n.innerHTML='<template><iframe src="https://player.example.test/ajax" title="AJAX"></iframe></template>';document.body.append(n);web86CookieConsent.mountEmbeds(n);web86CookieConsent.mountEmbeds(n);});eq(await p.locator('#ajax iframe').count(),1,'AJAX root itself mounts under current permission'); }
   // Capture synchronous DOM before the standard revoke reload.
   const revoked=p.waitForEvent('framenavigated',f=>f===p.mainFrame());await p.evaluate(()=>{web86CookieConsent.openSettings();document.querySelector('[data-cc-action="back"]').click();document.querySelector('[data-cc-action="reject"]').click();});await revoked;await p.waitForLoadState('load');eq(await p.locator('#video_2 iframe').count(),0,'Revocation reload restores inert DOM');
  }
  eq(audits.some(e=>['map_allow','embed_allow'].includes(e.event)),false,'No individual audit events');eq(new Set(audits.map(e=>e.event_id)).size,audits.length,'No duplicate audit event IDs');eq(audits.every(e=>e.schema===3&&!Object.hasOwn(e,'providers')),true,'Schema 3 remains category-only');
  eq(errors,[],'No page errors');
 }finally{await ctx.close();}
}
try{
 const cases=[];for(const loader of ['youtube','rutube','vk_video'])for(const category of ['analytics','marketing','external_content'])for(const legacy of [false,true])cases.push({loader,category,legacy});
 for(const legacy of [false,true])for(const stored of ['all','reject','partial','expired','policy','stale'])cases.push({legacy,stored});
 for(const loader of ['youtube','rutube','vk_video'])cases.push({loader,generated:true});
 cases.push({hidden:true},{hidden:true,legacy:true},{poster:true},{poster:true,legacy:true},{bulk:true},{bulk:true,legacy:true},{dialog:true},{language:'ru'});
 for(const c of cases){if(process.argv.includes('--static')&&(c.bulk||c.generated))continue;if(process.argv.includes('--generic')&&c.generated)continue;const before=assertions;await exercise(c);results.push({case:c,result:'PASS',assertions:assertions-before});console.log('PASS '+JSON.stringify(c));}
}catch(e){results.push({result:'FAIL',error:e.stack});console.error(e.stack);process.exitCode=1;}
finally{await browser.close();mkdirSync('.local/video-embeds',{recursive:true});writeFileSync('.local/video-embeds/browser.json',JSON.stringify({tests:results.length,assertions,failed:results.filter(r=>r.result==='FAIL').length,results},null,2)+'\n');}
