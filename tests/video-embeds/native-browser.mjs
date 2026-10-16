// Actual installed MODX snippets, Manager catalog, cold/warm resource caches and real audit ACK/JSONL.
import {chromium} from 'playwright';import assert from 'node:assert/strict';import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';import {execFileSync} from 'node:child_process';import {docker as mainDocker} from '../helpers.mjs';
const origin='http://127.0.0.1:18988';const docker=(args,input)=>execFileSync('docker',['exec','-i','cookie-consent-acceptance-fenom-1',...args.slice(1)],{input,encoding:'utf8',maxBuffer:8*1024*1024});
const ctl=(args,input)=>docker(['web','php','/opt/cc-source/tests/local/manager-i18n-control.php',...args],input).trim();
const keys=['cookie_consent.options','cookie_consent.services','cookie_consent.texts','manager_language','cookie_consent.log_dir'];const saved=Object.fromEntries(keys.map(k=>[k,ctl(['setting',k,'get'])]));
const videoControl=(op,input)=>docker(['web','php','/opt/cc-source/tests/video-embeds/control.php',op],input).trim();const parsers=videoControl('parser-snapshot');videoControl('prepare-native');
const culture=JSON.parse(ctl(['context','get']));let n=0;const results=[];const eq=(a,b,m)=>{n++;assert.deepEqual(a,b,m);};
const browser=await chromium.launch();const admin=await browser.newContext(),p=await admin.newPage();let token;
await admin.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
const api=async(action,form={})=>(await admin.request.post(origin+'/assets/components/cookieconsent/connector.php',{headers:{modAuth:token},form:{action,HTTP_MODAUTH:token,...form}})).json();
const html='<!doctype html><html><head>[[!CookieConsentAssets]]</head><body><span id="cache-source">[^s^]</span>'+[
 '[[!CookieConsentVideo? &provider=`youtube` &url=`https://youtu.be/M7lc1UVf-VE` &title=`Company video` &poster=`/assets/img/video-fixture.svg`]]',
 '[[!CookieConsentVideo? &provider=`rutube` &url=`https://rutube.ru/video/7716bd3e665725c3c008ae7ab4ff02e2/?p=secret` &start=`30` &poster=`https://images.example.test/video.webp`]]',
 '[[!CookieConsentVideo? &provider=`vk_video` &url=`https://vkvideo.ru/video_ext.php?oid=-1&id=2&hash=0123456789abcdef`]]',
 '[[!CookieConsentVideo? &provider=`vk_video` &url=`https://vk.com/video-1_2`]]',
 '[[!CookieConsentMap? &provider=`yandex_maps` &src=`https://yandex.ru/map-widget/v1/?ll=37.62%2C55.75&z=10` &title=`Office map` &aspectRatio=`16:9` &height=`400` &loading=`lazy` &allowFullscreen=`0`]]',
 '<div id="trusted" data-cc-embed="youtube"><template><section data-owner="preserved"><iframe title="Trusted" src="https://www.youtube-nocookie.com/embed/M7lc1UVf-VE"></iframe></section></template></div>',
 '[[!CookieConsentBanner]]</body></html>'
].join('');
try{
 const creds=JSON.parse(mainDocker(['web','php','/opt/cc-source/tests/transport/control.php','credentials','/opt/cc-private']));await p.goto(origin+'/manager/');await p.locator('#modx-login-username').fill(creds.username);await p.locator('#modx-login-password').fill(creds.password);await p.locator('#modx-login-btn').click();await p.waitForFunction(()=>window.MODx?.siteId);token=await p.evaluate(()=>MODx.siteId);
 const meta=JSON.parse(readFileSync('_build/package.json'));const signature=meta.name+'-'+meta.version+'-'+meta.release+meta.release_index;const pm=async(action,form={})=>(await admin.request.post(origin+'/connectors/index.php',{headers:{modAuth:token},form:{action:'workspace/packages/'+action,HTTP_MODAUTH:token,...form}})).json();const upload=await admin.request.post(origin+'/connectors/index.php',{headers:{modAuth:token},multipart:{action:'workspace/packages/upload',HTTP_MODAUTH:token,file:{name:signature+'.transport.zip',mimeType:'application/zip',buffer:readFileSync('.local/artifacts/'+signature+'.transport.zip')}}});const uploadResult=await upload.json();eq(uploadResult.success,true,'Fenom native upload: '+JSON.stringify(uploadResult));eq((await pm('scanlocal')).success,true);eq((await pm('install',{signature})).success,true,'Fenom native installation');
 const base=(await api('get')).object;
 const registry={schema:1,services:['youtube','rutube','vk_video','yandex_maps'].map(loader=>({key:loader,loader,category:'external_content',enabled:true,name:loader,purpose:'Fixture content',config:{}}))};
 const options={...base.options,categories:{analytics:true,marketing:true,external_content:true},buttons:{reject:true,configure:true,accept_all:true,accept:false}};
 const draft={...Object.fromEntries(['texts','audit_config_file'].map(k=>[k,base[k]])),log_dir:'/opt/cc-private/logs',options,registry};eq((await api('save',{revision:base.revision,draft:JSON.stringify(draft)})).success,true,'Native Manager Save');videoControl('audit');
 for(const lang of ['ru','en']){
  ctl(['setting','manager_language'],lang);await p.goto(origin+'/manager/?a=index&namespace=cookie_consent');await p.locator('#ccm-save').waitFor();await p.locator('#ccm-tab-services').click();
  const data=(await api('get')).object;for(const loader of ['youtube','rutube','vk_video']){eq(Object.hasOwn(data.catalog,loader),true,'Manager catalog');eq(await p.locator('[data-service='+loader+']').count(),1,'Video service rendered');eq(Boolean(data.lexicons[lang]['service.'+loader+'.name']),true,'Localized service name');}
  eq(data.guide.sections.length,6,'Short guide includes adapter editing and video integration');await p.locator('[data-preview-state=map]').click();await p.waitForTimeout(600);eq(await p.frameLocator('#ccm-preview-frame').locator('iframe').count(),0,'Preview remains inert');eq(await p.frameLocator('#ccm-preview-frame').locator('[data-preview-embed]').count(),3,'Video placeholder previews');
  results.push({name:'Manager-'+lang,result:'PASS'});
 }
 for(const parser of ['standard','fenom'])for(const lang of ['ru','en']){
  docker(['web','php','/opt/cc-source/tests/video-embeds/control.php','parser',parser]);ctl(['context'],lang);
  const markup=parser==='standard'?html:html.replace(/\[\[!([A-Za-z]+)(?:\?([\s\S]*?))?\]\]/g,(_,name,args)=>{const pairs=[...(args||'').matchAll(/&([A-Za-z]+)=`([^`]*)`/g)].map(m=>"'"+m[1]+"' => '"+m[2].replaceAll("'","\\'")+"'");return "{'!"+name+"' | snippet"+(pairs.length?' : ['+pairs.join(',')+']':'')+'}';});
  const resource=videoControl('resource',markup);await p.waitForTimeout(2200);
  for(let warm=0;warm<2;warm++){
   const ctx=await browser.newContext(),page=await ctx.newPage(),external=[],audit=[];const before=n;
   await ctx.route('**/*',async r=>{const u=new URL(r.request().url());if(u.origin!==origin){external.push(u.href);return r.fulfill({contentType:'text/html',body:'<p>Controlled player</p>'});}if(u.pathname.endsWith('/audit.php')){const event=r.request().postDataJSON(),response=await r.fetch();audit.push({event,status:response.status(),body:await response.json()});return r.fulfill({response});}if(u.pathname.endsWith('video-fixture.svg'))return r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="9"/>'});return r.continue();});
   try{
    const pageResponse=await page.goto(origin+'/?id='+resource,{waitUntil:'networkidle'});eq(pageResponse.status(),200,'Native page HTTP');eq(await page.locator('#cache-source').textContent(),warm?'cache':'database','Cold/warm resource');eq(external,[],'No third party before consent');eq(await page.locator('[data-cc-embed] iframe,[data-cc-map-provider] iframe').count(),0);eq(audit,[]);
    await page.locator('[data-cc-embed=youtube] [data-cc-settings]').first().click();eq(await page.locator('[data-cc-category=external_content]').evaluate(e=>document.activeElement===e),true);eq(audit,[],'Settings button emits no grant event');await page.locator('[data-cc-category=external_content]').check();await page.locator('[data-cc-action=save]').click();await page.waitForTimeout(300);
    eq(await page.locator('[data-cc-embed] iframe,[data-cc-map-provider] iframe').count(),5,'Videos, map, trusted HTML together');eq(await page.locator('[data-cc-embed=rutube] iframe').getAttribute('src'),'https://rutube.ru/play/embed/7716bd3e665725c3c008ae7ab4ff02e2/?p=secret&t=30');
    const map=page.locator('[data-cc-map-provider] iframe');eq(await map.getAttribute('title'),'Office map');eq(await map.getAttribute('loading'),'lazy');eq(await map.getAttribute('allowfullscreen'),null);eq(await page.locator('#trusted [data-owner]').getAttribute('data-owner'),'preserved');
    const count=external.length;await page.evaluate(()=>{web86CookieConsent.mountEmbeds();web86CookieConsent.mountEmbeds();});await page.waitForTimeout(50);eq(external.length,count,'No duplicate network');eq(external.some(u=>u.includes('images.example.test')),false,'External poster not requested');
    await page.waitForFunction(()=>document.querySelector('#cookie-block').classList.contains('closed'));
    eq(audit.filter(a=>a.event.stage==='committed').length,1,'One committed Save');
    for(const ack of audit){eq(ack.status,200);eq(ack.body.ok,true);eq(ack.body.event_id,ack.event.event_id);eq(ack.event.schema,3);const log=JSON.parse(docker(['web','php','/opt/cc-source/tests/video-embeds/control.php','record',ack.event.event_id]));eq(log.records.length,1,'Exactly one real JSONL row per event');}
    eq(audit.some(a=>['map_allow','embed_allow'].includes(a.event.event)),false);
    results.push({name:parser+'-'+lang+'-'+(warm?'warm':'cold'),result:'PASS',assertions:n-before});
   }catch(e){writeFileSync('.local/video-embeds/native-browser-failure.html',await page.content());throw e;}finally{await ctx.close();}
  }
 }
}catch(e){results.push({result:'FAIL',error:e.stack});console.error(e.stack);process.exitCode=1;}
finally{await browser.close();for(const[k,v]of Object.entries(saved))ctl(['setting',k],v);ctl(['context'],culture.value??'__REMOVE__');videoControl('parser-restore',parsers);videoControl('remove');mkdirSync('.local/video-embeds',{recursive:true});writeFileSync('.local/video-embeds/native-browser.json',JSON.stringify({tests:results.length,assertions:n,failed:results.filter(r=>r.result==='FAIL').length,results},null,2)+'\n');console.log(JSON.stringify({tests:results.length,assertions:n}));}
