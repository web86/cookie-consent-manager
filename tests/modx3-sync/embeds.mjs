import {chromium} from 'playwright';import assert from 'node:assert/strict';import {writeFileSync} from 'node:fs';
import {manager,cli} from '../modx3/helpers.mjs';
const service=process.env.CC3_EMBED_SERVICE||'clean',ports={clean:20889,php82:20891},origin='http://127.0.0.1:'+ports[service];
const ctl=(...a)=>JSON.parse(cli(service,['php','/opt/cc-source/tests/modx3-beta3/control.php',...a]));
const results=[];let assertions=0;const eq=(a,b,m)=>{assertions++;assert.deepEqual(a,b,m)};
const b=await chromium.launch(),admin=await manager(b,service),base=(await admin.api('get')).object;
const previousAudit=cli(service,['php','/opt/cc-source/tests/modx3-sync/embeds.php','audit-origin',origin]);
const saved={options:base.options,registry:base.registry,texts:base.texts,log_dir:base.log_dir,audit_config_file:base.audit_config_file};
const snippetCalls=[
 '[[!CookieConsentVideo? &provider=`youtube` &url=`https://youtu.be/M7lc1UVf-VE` &poster=`/poster.svg` &aspectRatio=`16:9` &width=`640`]]',
 '[[!CookieConsentVideo? &provider=`rutube` &url=`https://rutube.ru/video/7716bd3e665725c3c008ae7ab4ff02e2/?p=secret` &start=`30` &poster=`https://images.example.test/poster.webp` &aspectRatio=`9:16` &width=`360`]]',
 '[[!CookieConsentVideo? &provider=`vk_video` &url=`https://vk.com/video_ext.php?oid=-226836549&id=456240037&hd=2&hash=3e01dae0a9357708`]]',
 '[[!CookieConsentMap? &provider=`google_maps` &src=`https://www.google.com/maps/embed?pb=fixture` &height=`400`]]',
 '[[!CookieConsentMap? &provider=`yandex_maps` &src=`https://yandex.ru/map-widget/v1/?ll=37.62%2C55.75&z=10` &title=`Office map` &allowFullscreen=`0` &loading=`lazy`]]',
 '<div id="generic-vk" data-cc-embed="vk_video" data-cc-aspect-ratio="9:16" data-cc-width="360"><template><iframe src="https://vk.com/video_ext.php?oid=-226836549&id=456240037&hd=2&hash=3e01dae0a9357708" width="360" height="815" title="VK Видео" loading="lazy" allowfullscreen></iframe></template></div>'
];
try{
 for(const lang of ['ru','en'])for(const parser of ['standard','fenom'])for(const mode of ['strict','legacy']){
  if(process.env.CC3_EMBED_FOCUS&&[lang,parser,mode].join('-')!==process.env.CC3_EMBED_FOCUS)continue;
  const now=(await admin.api('get')).object,options={...now.options,categories:{analytics:true,marketing:true,external_content:true},buttons:{reject:true,configure:true,accept_all:true,accept:mode==='legacy'}};
  const registry={schema:1,services:['youtube','rutube','vk_video','google_maps','yandex_maps'].map(loader=>({key:loader,loader,category:'external_content',enabled:true,name:loader,purpose:'Native embed fixture',config:{}}))};
  eq((await admin.api('save',{revision:now.revision,draft:JSON.stringify({...saved,options,registry,audit_config_file:'',log_dir:'/opt/cc-private/logs'})})).success,true,'Save real Manager configuration');
  ctl('parser',parser,'all');cli(service,['php','/opt/cc-source/tests/local/manager-i18n-control.php','context'],lang);
  let html='<!doctype html><html><head>[[!CookieConsentAssets]]</head><body><span id="cache-source">[^s^]</span>'+snippetCalls.join('')+'[[!CookieConsentBanner]]</body></html>';
  if(parser==='fenom')html=html.replace(/\[\[!([A-Za-z]+)(?:\?([\s\S]*?))?\]\]/g,(_,name,args)=>{const pairs=[...(args||'').matchAll(/&([A-Za-z]+)=`([^`]*)`/g)].map(m=>"'"+m[1]+"' => '"+m[2].replaceAll("'","\\'")+"'");return "{'!"+name+"' | snippet"+(pairs.length?' : ['+pairs.join(',')+']':'')+'}';});
  const id=cli(service,['php','/opt/cc-source/tests/modx3-sync/embeds.php','resource'],html);
  for(const warm of [false,true]){
   const ctx=await b.newContext(),p=await ctx.newPage(),external=[],errors=[],audits=[];let start=assertions;
   p.on('pageerror',e=>errors.push(e.message));
   await ctx.route('**/*',async r=>{const u=new URL(r.request().url());if(u.origin!==origin){external.push(u.href);return r.fulfill({contentType:'text/html',body:'<p>Controlled iframe</p>'});}if(u.pathname==='/poster.svg')return r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="9"/>'});if(u.pathname.endsWith('/audit.php')){const event=r.request().postDataJSON(),response=await r.fetch();audits.push({event,status:response.status(),body:await response.json()});return r.fulfill({response});}return r.continue();});
   const name=[service,lang,parser,mode,warm?'warm':'cold'].join('-');
   try{
    const r=await p.goto(origin+'/?id='+id,{waitUntil:'networkidle'});eq(r.status(),200,'Native page HTTP');eq(await p.locator('#cache-source').textContent(),warm?'cache':'database');eq(await p.locator('head #cc-service-registry').count(),1);eq(await p.locator('script[src*="cookie-consent.min.js"]').count(),1);eq(await p.locator('[data-cc-embed] iframe,[data-cc-map-provider] iframe').count(),mode==='legacy'?6:0);if(mode==='strict')eq(external,[],'No external request before consent');
    if(mode==='strict'){await p.locator('#generic-vk [data-cc-settings]').click();eq(await p.locator('[data-cc-category=external_content]').evaluate(e=>document.activeElement===e),true);eq(audits,[],'Settings opens category without granting');await p.locator('[data-cc-category=external_content]').check();await p.locator('[data-cc-action=save]').click();}else await p.locator('[data-cc-action=accept]').click();
    await p.waitForTimeout(150);eq(await p.locator('[data-cc-embed] iframe,[data-cc-map-provider] iframe').count(),6);eq(await p.locator('[data-cc-embed=rutube] iframe').getAttribute('src'),'https://rutube.ru/play/embed/7716bd3e665725c3c008ae7ab4ff02e2/?p=secret&t=30');eq(await p.locator('[data-cc-map-provider=yandex_maps] iframe').getAttribute('loading'),'lazy');eq(await p.locator('[data-cc-map-provider=yandex_maps] iframe').getAttribute('allowfullscreen'),null);eq(external.some(u=>u.includes('images.example.test')),false,'External poster never requested');
    const count=external.length;await p.evaluate(()=>{web86CookieConsent.mountEmbeds();web86CookieConsent.mountEmbeds()});await p.waitForTimeout(100);eq(external.length,count,'Repeated mount has no duplicate load');eq(await p.locator('#generic-vk iframe').count(),1);eq(errors,[]);
    for(const a of audits){eq(a.status,200);eq(a.body.event_id,a.event.event_id);eq(a.event.schema,3);eq(ctl('record',a.event.event_id).records.length,1,'Exactly one JSONL row');}
    await p.evaluate(()=>web86CookieConsent.openSettings());await p.locator('[data-cc-category=external_content]').uncheck();await Promise.all([p.waitForNavigation({waitUntil:'networkidle'}),p.locator('[data-cc-action=save]').click()]);eq(await p.locator('[data-cc-embed] iframe,[data-cc-map-provider] iframe').count(),0,'Revoke removes all frames');
    results.push({name,result:'PASS',assertions:assertions-start});console.log('PASS '+name);
   }catch(e){writeFileSync('.local/modx3/evidence/embed-failure-'+name+'.html',await p.content());console.error(await p.locator('[data-cc-embed],[data-cc-map-provider]').evaluateAll(xs=>xs.map(x=>({embed:x.dataset.ccEmbed,map:x.dataset.ccMapProvider,frames:x.querySelectorAll('iframe').length,text:x.innerText.slice(0,130)}))));results.push({name,result:'FAIL',assertions:assertions-start,error:e.message});console.error('FAIL '+name+': '+e.message)}finally{await ctx.close();}
  }
 }
}finally{cli(service,['php','/opt/cc-source/tests/modx3-sync/embeds.php','audit-restore'],previousAudit);const now=(await admin.api('get')).object;await admin.api('save',{revision:now.revision,draft:JSON.stringify(saved)});ctl('parser','standard','all');await admin.ctx.close();await b.close();const report={tests:results.length,assertions,failed:results.filter(r=>r.result==='FAIL').length,results};writeFileSync('.local/modx3/evidence/sync106-embeds-'+service+'.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({tests:report.tests,assertions,failed:report.failed}));if(report.failed)process.exitCode=1;}
