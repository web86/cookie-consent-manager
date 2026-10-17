/** Exact final ZIP fresh install and focused cache/vendor regression on original 2.8.4. */
import {chromium} from 'playwright';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const local='.local/modx2-compatibility',signature='cookieconsent-1.0.8-pl3',browser=await chromium.launch();
const template=legacy=>'<!doctype html><html><head><meta charset="UTF-8">'+(legacy?'':'[[!CookieConsentAssets]]')+'</head><body><button data-cookie-settings-open>Settings</button><span id="cache-source">[^s^]</span>'+
 '[[!CookieConsentMap? &provider=`google_maps` &src=`https://www.google.com/maps/embed?pb=matrix`]]'+
 '[[!CookieConsentMap? &provider=`yandex_maps` &src=`https://yandex.ru/map-widget/v1/?ll=37.62%2C55.75&z=10`]]'+
 '[[!CookieConsentVideo? &provider=`youtube` &url=`https://youtu.be/M7lc1UVf-VE`]]'+
 '[[!CookieConsentVideo? &provider=`rutube` &url=`https://rutube.ru/video/7716bd3e665725c3c008ae7ab4ff02e2/`]]'+
 '[[!CookieConsentVideo? &provider=`vk_video` &url=`https://vk.com/video_ext.php?oid=-226836549&id=456240037&hd=2&hash=3e01dae0a9357708`]]'+
 '<div data-cc-embed="youtube"><template><iframe title="Generic iframe" src="https://www.youtube-nocookie.com/embed/M7lc1UVf-VE"></iframe></template></div>'+
 (legacy?'[[!CookieConsent]]':'[[!CookieConsentBanner]]')+'</body></html>';

try{for(const c of JSON.parse(readFileSync(local+'/final-cases.json'))){
 const fixture=local+'/'+c.name,out=fixture+'/evidence',origin='http://127.0.0.1:'+c.port,results=[];let n=0;
 const eq=(a,b,m)=>{n++;assert.deepEqual(a,b,m)},ok=(v,m)=>{n++;assert.ok(v,m)};
 const cli=(op,input)=>JSON.parse(execFileSync('docker',['compose','--env-file',fixture+'/private/compose.env','-f',fixture+'/compose.yaml','exec','-T','web','php','/opt/cc-source/tests/modx2-compatibility/fixture.php',op],{encoding:'utf8',input}));
 const test=async(name,fn)=>{const start=n;try{await fn();results.push({name,result:'PASS',assertions:n-start});console.log('PASS '+c.name+' '+name);}catch(e){results.push({name,result:'FAIL',error:e.stack});throw e;}};
 const ctx=await browser.newContext();await ctx.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 const p=await ctx.newPage();p.setDefaultTimeout(15000);let token;
 const api=async(action,form={},native=false)=>(await ctx.request.post(origin+(native?'/connectors/index.php':'/assets/components/cookieconsent/connector.php'),{headers:{modAuth:token,Origin:origin,Referer:origin+'/manager/'},form:{action,HTTP_MODAUTH:token,...form},timeout:120000})).json();
 const install=async()=>{eq((await api('workspace/packages/install',{signature},true)).success,true)};
 const draft=d=>Object.fromEntries(['options','registry','texts','log_dir','audit_config_file'].map(k=>[k,d[k]]));
 try{
  await test('exact-final-zip-fresh-native-install',async()=>{
   const info=cli('info');eq(info.modx,'2.8.4-pl');eq(info.xpdo,'2.8.4-pl');ok(info.php.startsWith(c.php+'.'));
   const creds=JSON.parse(readFileSync(fixture+'/private/manager.json'));await p.goto(origin+'/manager/');await p.locator('#modx-login-username').fill(creds.username);await p.locator('#modx-login-password').fill(creds.password);await p.locator('#modx-login-btn').click();await p.waitForFunction(()=>window.MODx?.siteId);token=await p.evaluate(()=>MODx.siteId);
   // This baseline is recorded after the official Manager runs, before component install.
   writeFileSync(out+'/core-before-component.log',readFileSync(fixture+'/site/core/cache/logs/error.log'));
   eq(Object.keys(cli('snapshot').elements).length,0);
   const upload=await ctx.request.post(origin+'/connectors/index.php',{headers:{modAuth:token},multipart:{action:'workspace/packages/upload',HTTP_MODAUTH:token,file:{name:signature+'.transport.zip',mimeType:'application/zip',buffer:readFileSync(local+'/artifacts/release/'+signature+'.transport.zip')}}});eq((await upload.json()).success,true);eq((await api('workspace/packages/scanlocal',{},true)).success,true);await install();eq((await api('get')).object.packageVersion,'1.0.8-pl3');eq(Object.keys(cli('snapshot').elements).length,6);eq((await api('get')).object.adapterBuild.state,'ready');
  });
  await test('settings-and-real-cache-triggered-php-minification',async()=>{
   cli('custom-script');const now=(await api('get')).object,value=draft(now),ids={yandex:'12345678',mailru:'87654321',google_ga4:'G-MATRIX123',google_gtm:'GTM-MATRIX123',google_ads:'AW-12345678',vk_ads:'45678901',meta_pixel:'123456789012345'};
   value.registry.services=value.registry.services.map(s=>({...s,enabled:true,config:ids[s.loader]?{...s.config,id:ids[s.loader]}:s.config}));value.registry.services.push({key:'matrix_custom',loader:'custom_js',category:'marketing',enabled:true,name:'Matrix JS',purpose:'Local custom JS',config:{path:'/assets/js/matrix-custom.js'}});value.options.categories={analytics:true,marketing:true,external_content:true};value.log_dir='/opt/cc-private/logs';value.audit_config_file='';
   const saved=await api('save',{revision:now.revision,draft:JSON.stringify(value),site_origin:origin});eq(saved.success,true);eq(saved.object.partial,false);eq(saved.object.auditStatus.state,'ready');
   const before=cli('bundle-state');cli('cache-edit');eq((await api('system/clearcache',{},true)).success,true);const after=cli('bundle-state');ok(after.version>before.version);ok(after.sha256!==before.sha256,'Native cache clear rebuilt changed adapter');eq((await api('get')).object.adapterBuild.state,'ready');eq((await api('bundle_rebuild')).success,true);
   const snapshot=cli('snapshot');await install();eq(cli('snapshot'),snapshot,'Reinstall preserves edited service');
  });
  for(const legacy of [false,true])await test('all-adapters-ack-jsonl-'+(legacy?'legacy':'strict'),async()=>{
   const now=(await api('get')).object,value=draft(now);value.options.buttons.accept=legacy;const saved=await api('save',{revision:now.revision,draft:JSON.stringify(value),site_origin:origin});eq(saved.success,true);eq(saved.object.partial,false);cli('resource',template(legacy));
   const v=await browser.newContext(),requests=[],errors=[];await v.route('**/*',r=>{if(new URL(r.request().url()).origin===origin)return r.continue();requests.push(r.request().url());return r.fulfill({contentType:r.request().resourceType()==='document'?'text/html':'application/javascript',body:''});});await v.addInitScript(()=>{window.__deliveries=[];addEventListener('web86:consent-audit-delivery',e=>__deliveries.push(e.detail));});const page=await v.newPage();page.on('pageerror',e=>errors.push(e.message));
   try{await page.goto(origin,{waitUntil:'networkidle'});eq(await page.locator('iframe').count(),legacy?6:0);if(!legacy)eq(requests,[]);eq(await page.evaluate(()=>window.__matrixCacheProbe),1);await page.evaluate(()=>{window.__allowed=0;web86CookieConsent.onAllowed('analytics',()=>window.__allowed++);});await page.locator(legacy?'[data-cc-action=accept]':'[data-cc-action=accept-all]').click();await page.waitForFunction(()=>window.__matrixCustom===1&&__deliveries.some(e=>e.ok));await page.waitForTimeout(150);eq(await page.evaluate(()=>window.__allowed),1);eq(await page.locator('iframe').count(),6);
    for(const url of ['mc.yandex.ru/metrika/tag.js','top-fwz1.mail.ru/js/code.js','www.googletagmanager.com/gtag/js','www.googletagmanager.com/gtm.js?id=GTM-MATRIX123','connect.facebook.net/en_US/fbevents.js'])ok(requests.some(r=>r.includes(url)),url);
    const queues=await page.evaluate(()=>({google:(window.dataLayer||[]).filter(e=>e[0]==='config').map(e=>e[1]),mail:(window._tmr||[]).filter(e=>e.type==='pageView').map(e=>e.id)}));ok(queues.google.includes('G-MATRIX123'));ok(queues.google.includes('AW-12345678'));ok(queues.mail.includes('87654321'));ok(queues.mail.includes('45678901'));
    const deliveries=await page.evaluate(()=>__deliveries);for(const a of deliveries){eq(a.ok,true);ok(cli('audit-ids').includes(a.event_id),'ACK stored in JSONL');}writeFileSync(out+'/adapters-'+(legacy?'legacy':'strict')+'.json',JSON.stringify({requests,queues,deliveries:deliveries.length},null,2)+'\n');eq(errors,[]);
   }finally{await v.close();}
  });
 }catch(e){console.error(e.stack);process.exitCode=1;}
 finally{await ctx.close();writeFileSync(out+'/final.json',JSON.stringify({case:c,tests:results.length,assertions:n,failed:results.filter(r=>r.result==='FAIL').length,results},null,2)+'\n');}
}}finally{await browser.close();}
