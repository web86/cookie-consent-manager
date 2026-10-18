import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';

const local=process.env.CC_MATRIX_DIRECTORY||'.local/modx2-compatibility',cases=JSON.parse(readFileSync(local+'/'+(process.env.CC_MATRIX_CASES||'cases.json')));
const names=process.argv.slice(2),browser=await chromium.launch();
const signature=process.env.CC_MATRIX_SIGNATURE||'cookieconsent-1.0.8-pl3';
const folder=process.env.CC_MATRIX_ARTIFACTS||local+'/artifacts/pl3';
const prior=process.env.CC_MATRIX_PRIOR_SIGNATURE||'cookieconsent-1.0.8-pl2';
const priorFolder=process.env.CC_MATRIX_PRIOR_FOLDER||local+'/artifacts/pl2';
const component=process.env.CC_MATRIX_COMPONENT||'cookieconsent';
const fixtureScript=process.env.CC_MATRIX_FIXTURE||'/opt/cc-source/tests/modx2-compatibility/fixture.php';
const version=signature.slice(signature.indexOf('-')+1);
const summary=[];
for(const c of cases.filter(c=>!names.length||names.includes(c.name))){
 const fixture=local+'/'+c.name,out=fixture+'/evidence';mkdirSync(out,{recursive:true});
 const compose=['compose','--env-file',fixture+'/private/compose.env','-f',fixture+'/compose.yaml'];
 const cli=(args,input)=>execFileSync('docker',[...compose,'exec','-T','web',...args],{encoding:'utf8',input,maxBuffer:16*1024*1024}).trim();
 const control=(op,...args)=>JSON.parse(cli(['php',fixtureScript,op,...args]));
 let activeComponent='cookieconsent';
 const origin='http://127.0.0.1:'+c.port,results=[],contexts=[];
 const previous=process.env.CC_MATRIX_RESUME?JSON.parse(readFileSync(out+'/browser.json')):null;
 if(previous){assert.ok(previous.tests<13);writeFileSync(out+'/browser-attempt-'+Date.now()+'.json',JSON.stringify(previous,null,2)+'\n',{flag:'wx'});}
 let assertions=0;
 const eq=(a,b,m)=>{assertions++;assert.deepEqual(a,b,m)},ok=(v,m)=>{assertions++;assert.ok(v,m)};
 const test=async(name,fn)=>{const retained=previous?.results.find(r=>r.name===name&&r.result==='PASS');if(retained){results.push(retained);assertions+=retained.assertions;console.log('RETAIN prior PASS '+c.name+' '+name);return;}const start=assertions;try{await fn();results.push({name,result:'PASS',assertions:assertions-start});console.log('PASS '+c.name+' '+name)}catch(e){results.push({name,result:'FAIL',assertions:assertions-start,error:e.stack});throw e}finally{writeFileSync(out+'/browser.json',JSON.stringify({case:c,complete:false,tests:results.length,assertions,failed:results.filter(r=>r.result==='FAIL').length,results},null,2)+'\n')}};
 const close=async ctx=>{await ctx.unrouteAll({behavior:'wait'});await ctx.close();};
 async function manager(lang='en',credentials=JSON.parse(readFileSync(fixture+'/private/manager.json'))){
  control('language',lang);
  const ctx=await browser.newContext({locale:lang,viewport:{width:1440,height:1000}});contexts.push(ctx);
  await ctx.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  const p=await ctx.newPage();p.setDefaultTimeout(15000);
  await p.goto(origin+'/manager/?cultureKey='+lang);
  await p.locator('#modx-login-username').fill(credentials.username);await p.locator('#modx-login-password').fill(credentials.password);await p.locator('#modx-login-btn').click();await p.waitForFunction(()=>window.MODx?.siteId);
  const token=await p.evaluate(()=>MODx.siteId);
  const api=async(action,form={},native=false)=>(await ctx.request.post(origin+(native?'/connectors/index.php':'/assets/components/'+activeComponent+'/connector.php'),{headers:{modAuth:token,Origin:origin,Referer:origin+'/manager/'},form:{action,HTTP_MODAUTH:token,...form},timeout:120000})).json();
  const install=async(sig,dir)=>{
   const bytes=readFileSync(dir+'/'+sig+'.transport.zip');
   let existing;try{existing=readFileSync(fixture+'/site/core/packages/'+sig+'.transport.zip')}catch{}
   if(existing)eq(createHash('sha256').update(existing).digest('hex'),createHash('sha256').update(bytes).digest('hex'),'Immutable installed archive');
   else{const up=await ctx.request.post(origin+'/connectors/index.php',{headers:{modAuth:token},multipart:{action:'workspace/packages/upload',HTTP_MODAUTH:token,file:{name:sig+'.transport.zip',mimeType:'application/zip',buffer:bytes}},timeout:120000});eq((await up.json()).success,true,'Native upload');}
   eq((await api('workspace/packages/scanlocal',{},true)).success,true,'Native scan');
   if(component==='cookieconsentmanager'&&prior.split('-')[0]!==signature.split('-')[0]&&sig===signature&&Object.keys(control('rename-state').history).length&&!control('rename-state').packages[signature]?.installed)eq(control('previous-package',sig).previous,false,'Cross-name transition is ACTION_INSTALL, not ACTION_UPGRADE');
   const r=await api('workspace/packages/install',{signature:sig},true);eq(r.success,true,'Native install '+JSON.stringify(r));
   const get=await api('workspace/packages/get',{signature:sig},true);ok(get.success&&get.object.installed,'Installed package record');
   activeComponent=sig.startsWith('cookieconsentmanager-')?'cookieconsentmanager':'cookieconsent';
  };
  return {ctx,p,token,api,install};
 }
 async function visitor(){
  const ctx=await browser.newContext();contexts.push(ctx);const external=[],audit=[],errors=[];
  await ctx.route('**/*',async r=>{if(new URL(r.request().url()).origin!==origin){external.push(r.request().url());return r.fulfill({contentType:r.request().resourceType()==='document'?'text/html':'application/javascript',body:r.request().resourceType()==='document'?'<p>Local controlled frame</p>':'/* local controlled SDK */'});}if(r.request().url().endsWith('/audit.php')){const response=await r.fetch();audit.push({status:response.status(),body:await response.json()});return r.fulfill({response});}return r.continue();});
  await ctx.addInitScript(()=>{window.__matrixDeliveries=[];window.addEventListener('web86:consent-audit-delivery',e=>__matrixDeliveries.push(e.detail));});
  const p=await ctx.newPage();p.setDefaultTimeout(15000);p.on('pageerror',e=>errors.push(e.message));
  await p.goto(origin,{waitUntil:'networkidle'});return {ctx,p,external,audit,errors};
 }
 const draft=d=>Object.fromEntries(['options','registry','texts','log_dir','audit_config_file'].map(k=>[k,d[k]]));
 let admin;
 const template=legacy=>'<!doctype html><html><head><meta charset="UTF-8">'+(legacy?'':'[[!CookieConsentAssets]]')+'</head><body><button data-cookie-settings-open>Settings</button><span id="cache-source">[^s^]</span>'+
 '[[!CookieConsentMap? &provider=`google_maps` &src=`https://www.google.com/maps/embed?pb=matrix`]]'+
 '[[!CookieConsentMap? &provider=`yandex_maps` &src=`https://yandex.ru/map-widget/v1/?ll=37.62%2C55.75&z=10`]]'+
 '[[!CookieConsentVideo? &provider=`youtube` &url=`https://youtu.be/M7lc1UVf-VE`]]'+
 '[[!CookieConsentVideo? &provider=`rutube` &url=`https://rutube.ru/video/7716bd3e665725c3c008ae7ab4ff02e2/`]]'+
 '[[!CookieConsentVideo? &provider=`vk_video` &url=`https://vk.com/video_ext.php?oid=-226836549&id=456240037&hd=2&hash=3e01dae0a9357708`]]'+
 '<div data-cc-embed="youtube"><template><iframe title="Generic iframe" src="https://www.youtube-nocookie.com/embed/M7lc1UVf-VE"></iframe></template></div>'+
 (legacy?'[[!CookieConsent]]':'[[!CookieConsentBanner]]')+'</body></html>';
 async function configure(legacy=false,position='bottom'){
  const now=(await admin.api('get')).object,value=draft(now);value.options={...value.options,banner_position:position,categories:{analytics:true,marketing:true,external_content:true},buttons:{reject:true,configure:true,accept_all:true,accept:legacy}};
  eq((await admin.api('save',{revision:now.revision,draft:JSON.stringify(value),site_origin:origin})).success,true,'Save mode and layout');
  cli(['php',fixtureScript,'resource'],template(legacy));
 }
 try{
  if(previous){activeComponent=component;admin=await manager();assert.equal((await admin.api('get')).object.packageVersion,version);if(!previous.results.some(r=>r.name==='native-upgrade-and-reinstall-preserve-settings-data-adapter'&&r.result==='PASS'))await admin.install(prior,priorFolder);}
  await test('official-install-db-manager-standard',async()=>{const info=control('info');eq(info.modx,c.modx);ok(info.php.startsWith(c.php+'.'));admin=await manager();});
  await test('native-candidate-fresh-install-standard',async()=>{eq(Object.keys(control('snapshot').elements).length,0);await admin.install(prior,priorFolder);eq(Object.keys(control('snapshot').elements).length,6);const d=(await admin.api('get')).object;eq(d.options.categories,{analytics:false,marketing:false,external_content:false});eq(d.adapterBuild.state,'ready');});
  await test('manager-create-settings-services-translations-and-php-bundle',async()=>{
   control('custom-script');let now=(await admin.api('get')).object;
   const value=draft(now);
   const ids={yandex:'12345678',mailru:'87654321',google_ga4:'G-MATRIX123',google_gtm:'GTM-MATRIX123',google_ads:'AW-12345678',vk_ads:'45678901',meta_pixel:'123456789012345'};
   value.registry.services=value.registry.services.map(s=>({...s,enabled:true,config:ids[s.loader]?{...s.config,id:ids[s.loader]}:s.config}));
   value.registry.services.push({key:'matrix_custom',loader:'custom_js',category:'marketing',enabled:true,name:'Matrix custom JS',purpose:'Synthetic marketing integration',config:{path:'/assets/js/matrix-custom.js'}});
   value.options.categories={analytics:true,marketing:true,external_content:true};value.log_dir='/opt/cc-private/logs';value.audit_config_file='';value.texts.locales.ru.banner_title='Матрица совместимости';value.texts.locales.en={...value.texts.locales.en,banner_title:'Compatibility matrix'};
   const saved=await admin.api('save',{revision:now.revision,draft:JSON.stringify(value),site_origin:origin});eq(saved.success,true,JSON.stringify(saved));eq(saved.object.partial,false,'Journal setup must not silently remain partial');eq(saved.object.log_dir,'/opt/cc-private/logs');eq(saved.object.auditStatus.state,'ready');
   const got=(await admin.api('get')).object;eq(got.registry.services.length,value.registry.services.length);eq(got.texts.locales.ru.banner_title,'Матрица совместимости');eq(got.options.categories,value.options.categories);
   const rebuild=await admin.api('bundle_rebuild');eq(rebuild.success,true);eq((await admin.api('get')).object.adapterBuild.state,'ready');
  });
  await test('native-upgrade-and-reinstall-preserve-settings-data-adapter',async()=>{
   control('customize');await configure(false);const seed=await visitor();try{eq(await seed.p.evaluate(()=>window.__matrixCustom),undefined,'Custom JS blocked before consent');await seed.p.locator('[data-cc-action=accept-all]').click();await seed.p.waitForFunction(()=>__matrixDeliveries.some(e=>e.ok));eq(seed.audit.every(a=>a.status===200),true);}catch(e){await close(seed.ctx);throw e;}const oldConsent=await seed.p.evaluate(()=>localStorage.getItem('web86_cookie_consent'));const oldQueue=component==='cookieconsentmanager'?control('audit-queue'):null;const renameBefore=component==='cookieconsentmanager'?control('rename-state'):null;const before=control('snapshot');ok(Object.keys(before.logs).length>0,'Seeded consent log required');await admin.install(signature,folder);const after=control('snapshot');eq(after,before,'Native upgrade preserves data and adapter');if(oldQueue)eq(control('audit-queue'),oldQueue,'Private audit secret/rate-limit state retained');await seed.p.reload({waitUntil:'networkidle'});eq(await seed.p.evaluate(()=>localStorage.getItem('web86_cookie_consent')),oldConsent,'Returning browser consent survives package rename');await close(seed.ctx);if(renameBefore){const moved=control('rename-state');eq(moved.trees,renameBefore.trees,'Every old/foreign component file is unchanged');for(const [v,h]of Object.entries(renameBefore.history))eq(moved.history[v],h,'SHA256 history retained '+v);eq(moved.namespace,'{core_path}components/cookieconsentmanager/');for(const count of Object.values(moved.counts))eq(count,1,'Exactly one canonical/admin object');eq(moved.packages[prior].installed,true,'Old package not uninstalled');eq(moved.packages[signature].installed,true,'New independent package installed');}eq((await admin.api('get')).object.packageVersion,version);eq(control('component-versions'),{manifest:version,adapters:version},'Release stamps agree');await admin.install(signature,folder);eq(control('snapshot'),after,'Native reinstall preserves');eq((await admin.api('bundle_rebuild')).success,true);
   await configure(false);const v=await visitor();try{await v.p.locator('[data-cc-action=accept-all]').click();await v.p.waitForFunction(()=>window.__matrixCustom===1);await v.p.waitForFunction(()=>__matrixDeliveries.some(e=>e.ok));eq(v.audit.every(a=>a.status===200),true);for(const a of v.audit){ok(a.body.ok);ok(control('audit-ids').includes(a.body.event_id),'HTTP ACK event_id exists in JSONL');}eq(await v.p.locator('[data-cc-embed] iframe,[data-cc-map-provider] iframe').count(),6);eq(v.errors,[]);}finally{await close(v.ctx);}
   const inv=JSON.parse(readFileSync(folder+'/'+signature+'.inventory.json'));for(const f of inv.files){const target=fixture+'/site/'+f.target;eq(createHash('sha256').update(readFileSync(target)).digest('hex'),f.sha256,'Installed vehicle '+f.target);}
  });
  for(const aliases of ['standard']){
   for(const lang of ['ru','en'])await test('manager-tabs-preview-guide-save-cache-'+lang+'-'+aliases,async()=>{
    const m=await manager(lang);await m.p.goto(origin+'/manager/?a=index&namespace=cookie_consent');await m.p.locator('#ccm-save').waitFor();
    eq((await m.api('get')).object.managerLanguage,lang);eq(await m.p.locator('[role=tab]').count(),4);
    for(const tab of ['main','services','texts','logs']){await m.p.locator('#ccm-tab-'+tab).click();eq(await m.p.locator('#ccm-panel-'+tab).isVisible(),true);}
    await m.p.locator('#ccm-tab-main').click();await m.p.locator('#ccm-guide-open').click();eq(await m.p.locator('#ccm-guide-dialog h3').count(),6);await m.p.keyboard.press('Escape');
    for(const state of ['banner','preferences','map']){await m.p.locator('[data-preview-state='+state+']').click();await m.p.waitForTimeout(250);eq(await m.p.locator('#ccm-preview-frame').count(),1);}
    await m.p.locator('[data-preview-state=banner]').click();await m.p.waitForTimeout(250);eq(await m.p.frameLocator('#ccm-preview-frame').locator('.cookie-warning-title').textContent(),lang==='ru'?'Матрица совместимости':'Compatibility matrix');
    await m.p.locator('#ccm-ttl').fill('91');await m.p.locator('#ccm-save').click();await m.p.waitForFunction(()=>document.querySelector('#ccm-status')?.dataset.state==='saved');eq((await m.api('get')).object.options.ttl_days,91);
    eq((await m.api('system/clearcache',{},true)).success,true);await m.p.screenshot({path:out+'/manager-'+lang+'-'+aliases+'.png',fullPage:true});await m.ctx.close();
   });
   for(const legacy of [false,true])for(const position of ['bottom','bottom-right','bottom-left'])await test('frontend-'+(legacy?'legacy':'strict')+'-'+position+'-'+aliases,async()=>{
    await configure(legacy,position);const v=await visitor();
    try{
     eq(await v.p.locator('#cookie-block').getAttribute('class').then(s=>s.includes('cookie-warning--'+position)),position!=='bottom');
     eq(await v.p.locator('[data-cc-embed] iframe,[data-cc-map-provider] iframe').count(),legacy?6:0);
     if(!legacy)eq(v.external,[],'No vendor request before consent');
     await v.p.evaluate(()=>{window.__matrixAllowed=0;web86CookieConsent.onAllowed('analytics',()=>window.__matrixAllowed++);});
     await v.p.locator(legacy?'[data-cc-action=accept]':'[data-cc-action=accept-all]').click();
     await v.p.waitForFunction(()=>web86CookieConsent.getConsent()?.categories.marketing===true);await v.p.waitForTimeout(250);
     eq(await v.p.locator('[data-cc-embed] iframe,[data-cc-map-provider] iframe').count(),6);eq(await v.p.evaluate(()=>window.__matrixAllowed),1);eq(await v.p.evaluate(()=>window.__matrixCustom),1);ok(v.external.some(u=>u.includes('google')),'Analytics/marketing loaders');await v.p.waitForFunction(()=>__matrixDeliveries.some(e=>e.ok));ok(v.audit.some(a=>a.status===200),'Real HTTP audit accepted');for(const a of v.audit){eq(a.status,200);ok(a.body.ok);ok(control('audit-ids').includes(a.body.event_id),'HTTP ACK correlated with JSONL');}
     const consent=await v.p.evaluate(()=>localStorage.getItem('web86_cookie_consent'));await v.p.reload({waitUntil:'networkidle'});eq(await v.p.evaluate(()=>localStorage.getItem('web86_cookie_consent')),consent);eq(await v.p.locator('[data-cc-embed] iframe,[data-cc-map-provider] iframe').count(),6);
     eq((await admin.api('system/clearcache',{},true)).success,true);await v.p.reload({waitUntil:'networkidle'});eq(await v.p.evaluate(()=>localStorage.getItem('web86_cookie_consent')),consent);eq(await v.p.locator('[data-cc-embed] iframe,[data-cc-map-provider] iframe').count(),6);
     await v.p.evaluate(()=>web86CookieConsent.openSettings());for(const cat of ['analytics','marketing','external_content'])await v.p.locator('[data-cc-category='+cat+']').uncheck();
     await Promise.all([v.p.waitForNavigation({waitUntil:'networkidle'}),v.p.locator('[data-cc-action=save]').click()]);eq(await v.p.locator('[data-cc-embed] iframe,[data-cc-map-provider] iframe').count(),0);eq(await v.p.evaluate(()=>web86CookieConsent.getConsent().categories),{analytics:false,marketing:false,external_content:false});eq(v.errors,[]);
    }finally{await close(v.ctx);}
   });
  }
  await test('journal-http-csv-acl',async()=>{
   const list=await admin.api('logs_list',{year:'2026'});eq(list.success,true);ok(list.object.total>0,'Persisted consent records');
   const csv=await admin.ctx.request.post(origin+'/assets/components/'+activeComponent+'/connector.php',{headers:{modAuth:admin.token},form:{action:'logs_export',HTTP_MODAUTH:admin.token,year:'2026'}});eq(csv.status(),200);ok(csv.headers()['content-type'].includes('csv'));ok((await csv.text()).length>100);
   const anon=await browser.newContext();try{for(const action of ['get','save','logs_list','logs_export','bundle_rebuild']){const r=await anon.request.post(origin+'/assets/components/'+activeComponent+'/connector.php',{form:{action}});ok(r.status()>=400||(await r.text()).includes('"success":false'),'Anonymous denied '+action);}}finally{await anon.close();}
   await admin.p.goto(origin+'/manager/?a=index&namespace=cookie_consent');await admin.p.locator('#ccm-tab-logs').click();await admin.p.locator('#ccm-log-table tbody tr').first().waitFor();ok(await admin.p.locator('#ccm-log-table tbody tr').count()>0);
   cli(['php','/opt/cc-source/tests/modx2-compatibility/restricted.php']);const restricted=await manager('en',JSON.parse(readFileSync(fixture+'/private/restricted-manager.json')));for(const action of ['get','save','bundle_rebuild','logs_list','logs_export'])eq((await restricted.api(action)).success,false,'Restricted denied '+action);await restricted.ctx.close();
  });

 }catch(e){console.error('FAIL '+c.name+' '+e.message);process.exitCode=1;}
 finally{for(const ctx of contexts)await close(ctx).catch(()=>{});const report={case:c,complete:results.length===13&&results.every(r=>r.result==='PASS'),tests:results.length,assertions,failed:results.filter(r=>r.result==='FAIL').length,results};writeFileSync(out+'/browser.json',JSON.stringify(report,null,2)+'\n');summary.push(report);}
}
await browser.close();writeFileSync(local+'/'+(names.length===1?names[0]+'-summary':'browser-summary')+'.json',JSON.stringify(summary,null,2)+'\n');
