import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {execFileSync,spawn} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {once} from 'node:events';
const local=process.env.CC_PREFLIGHT_LOCAL||'.local/preflight3-pl7';
const signature='cookieconsentmanager3-1.0.8-pl7',old='cookieconsentmanager3-1.0.8-pl6';
const archive=JSON.parse(readFileSync(local+'/current-artifact.json')).folder+'/'+signature+'.transport.zip';
const oldArchive='.local/uninstall3/artifacts/final/release/'+old+'.transport.zip';
const browser=await chromium.launch();
for(const c of JSON.parse(readFileSync(local+'/cases.json'))){
 const selected=process.argv.slice(2).find(v=>!v.startsWith('--'));if(selected&&selected!==c.name)continue;
 const f=local+'/'+c.name,out=f+'/evidence',origin='http://127.0.0.1:'+c.port;
 const compose=['compose','--env-file',f+'/private/compose.env','-f',f+'/compose.yaml'];
 const cli=(file,args=[],input)=>execFileSync('docker',[...compose,'exec','-T','-u','www-data','web','php','/opt/cc-source/tests/'+file,...args],{encoding:'utf8',input,maxBuffer:16*1024*1024}).trim();
 const ctl=(...args)=>JSON.parse(cli('preflight3/fixture.php',args));
 const control=(...args)=>JSON.parse(cli('public-install/fixture.php',args));
 const uninstallControl=(...args)=>JSON.parse(cli('uninstall/fixture.php',args));
 const previous=process.argv.includes('--resume')?JSON.parse(readFileSync(out+'/preflight.json')):null;
 if(previous)writeFileSync(out+'/preflight-attempt-'+Date.now()+'.json',JSON.stringify(previous,null,2)+'\n',{flag:'wx'});
 const result=[];let n=0;const eq=(a,b,m)=>{n++;assert.deepEqual(a,b,m)},ok=(v,m)=>{n++;assert.ok(v,m)};
 const ctx=await browser.newContext();await ctx.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 const run=async(name,fn)=>{const retained=previous?.results.find(r=>r.name===name&&r.result==='PASS');if(retained){result.push(retained);n+=retained.assertions;return;}const start=n;try{await fn();result.push({name,result:'PASS',assertions:n-start});console.log('PASS '+c.name+' '+name)}catch(e){result.push({name,result:'FAIL',assertions:n-start,error:e.stack});throw e}finally{writeFileSync(out+'/preflight.json',JSON.stringify({case:c,tests:result.length,assertions:n,failed:result.filter(r=>r.result==='FAIL').length,results:result},null,2)+'\n')}};
 const clean=()=>{const state=ctl('state');eq(state.installed,false);eq(Object.keys(state.files),[]);for(const rows of Object.values(state.objects))eq(rows,[]);};
 try{
  const info=control('info');eq(info.modx,c.modx);ok(info.php.startsWith(c.php+'.'));eq(info.aliases,false);writeFileSync(out+'/runtime-info.json',JSON.stringify(info,null,2)+'\n');
  await p.goto(origin+'/manager/');const credentials=JSON.parse(readFileSync(f+'/private/manager.json'));
  await p.locator('#modx-login-username').fill(credentials.username);await p.locator('#modx-login-password').fill(credentials.password);await p.locator('#modx-login-btn').click();await p.waitForFunction(()=>window.MODx?.siteId);
  const token=await p.evaluate(()=>MODx.siteId);
  const api=async(action,form={},native=true)=>(await ctx.request.post(origin+(native?'/connectors/index.php':'/assets/components/cookieconsentmanager3/connector.php'),{headers:{modAuth:token,Origin:origin,Referer:origin+'/manager/'},form:{action,HTTP_MODAUTH:token,...form},timeout:120000})).json();
  const install=async(sig=signature,expected=true)=>{const r=await api('workspace/packages/install',{signature:sig});eq(r.success,expected,JSON.stringify(r));};
  const uninstall=async()=>{const r=await api('workspace/packages/uninstall',{signature});eq(r.success,true,JSON.stringify(r));};
  const upload=async(path,sig=signature)=>{const r=await ctx.request.post(origin+'/connectors/index.php',{headers:{modAuth:token},multipart:{action:'workspace/packages/upload',HTTP_MODAUTH:token,file:{name:sig+'.transport.zip',mimeType:'application/zip',buffer:readFileSync(path)}},timeout:120000});eq((await r.json()).success,true);eq((await api('workspace/packages/scanlocal')).success,true);};
  const log=()=>{try{return readFileSync(f+'/site/core/cache/logs/error.log','utf8')}catch{return ''}};
  const refused=async(reason,sig=signature)=>{const before=ctl('state'),offset=log().length;await install(sig,false);eq(ctl('state'),before,'Refusal preserves all component files/objects and installed state');ok(log().slice(offset).includes('Cookie Consent preflight refused: '+reason),'Expected exact refusal diagnostic: '+reason);};
  await run('native-pristine-install-and-uninstall',async()=>{clean();await upload(archive);eq(ctl('state').objects['MODX\\Revolution\\modNamespace'],[],'Upload/scan must not create namespace');await install();eq(ctl('state').installed,true);eq((await api('get',{},false)).object.adapterBuild.state,'ready');await uninstall();clean();});
  await run('correct-namespace-only-first-install',async()=>{ctl('namespace');eq(Object.keys(ctl('state').files),[]);await install();eq(ctl('state').installed,true);await uninstall();clean();});
  await run('old-pl6-namespace-refusal-is-reproducible',async()=>{ctl('namespace');await upload(oldArchive,old);await refused('Unrecognized cookie_consent installation; inspect its manifest before installing',old);});
  const reasons={snippet:'Unowned canonical element conflict: CookieConsent',chunk:'Unowned canonical element conflict: CookiesPopup',plugin:'Unowned canonical element conflict: CookieConsentCacheBuild',setting:'Unowned cookie_consent objects','foreign-setting':'Unowned cookie_consent objects',menu:'Unowned cookie_consent objects','foreign-menu':'Unowned cookie_consent objects',symlink:'Unowned component symlink; inspect before retry','css-symlink':'Symlink runtime target refused',css:'Occupied runtime target; inspect before retry','namespace-core':'Namespace path conflict','namespace-assets':'Namespace assets path conflict'};
  for(const type of ['namespace-core','namespace-assets','snippet','chunk','plugin','setting','foreign-setting','menu','foreign-menu','core-known','core-unknown','assets-known','assets-unknown','public','public-unknown','adapter','css','css-symlink','manifest','state','symlink','nonempty-lock']){
   await run('reject-foreign-'+type,async()=>{ctl('conflict',type,'seed');try{await refused(reasons[type]||'Unowned component files; inspect before retry');}finally{ctl('conflict',type,'clear');}});
  }
  await run('held-lock-refusal-and-empty-lock-retry-after-old-preflight',async()=>{
   const child=spawn('docker',[...compose,'exec','-T','-u','www-data','web','php','/opt/cc-source/tests/preflight3/fixture.php','lock'],{stdio:['pipe','pipe','pipe']});let ready='';const exit=once(child,'exit');
   try{for await(const bytes of child.stdout){ready+=bytes;if(ready.includes('READY'))break;}ok(ready.includes('READY'));const before=ctl('state');eq(Object.keys(before.files),['/var/www/html/assets/components/cookieconsentmanager3/js/cookie-consent/cookie-consent.build.lock']);await refused('bundle_busy');}
   finally{child.stdin.end('\n');const [code]=await exit;eq(code,0);}
   await install();eq(ctl('state').installed,true);eq((await api('get',{},false)).object.adapterBuild.state,'ready');
  });
  await run('own-native-reinstall-preserves-settings-adapter-and-history',async()=>{
   uninstallControl('settings');uninstallControl('adapter');const snapshot=control('snapshot'),state=JSON.parse(readFileSync(f+'/site/core/components/cookieconsentmanager3/adapter-checksums.json'));await install();eq(control('snapshot'),snapshot);eq(JSON.parse(readFileSync(f+'/site/core/components/cookieconsentmanager3/adapter-checksums.json')).versions,state.versions);for(const count of Object.values(control('identity').counts))eq(count,1);eq((await api('get',{},false)).object.adapterBuild.state,'ready');
   await uninstall();uninstallControl('clear-preserved-fixtures');clean();
  });
  await run('native-upgrade-from-immutable-pl6',async()=>{
   await install(old);eq(control('component-versions').manifest,'1.0.8-pl6');uninstallControl('settings');uninstallControl('adapter');const snapshot=control('snapshot');const previous=JSON.parse(readFileSync(f+'/site/core/components/cookieconsentmanager3/adapter-checksums.json'));
   await install();eq(control('component-versions').manifest,'1.0.8-pl7');eq(control('snapshot'),snapshot);const current=JSON.parse(readFileSync(f+'/site/core/components/cookieconsentmanager3/adapter-checksums.json'));eq(current.versions['1.0.8-pl6'],previous.versions['1.0.8-pl6'],'Prior adapter SHA256 history retained');eq(current.versions['1.0.8-pl7'],previous.versions['1.0.8-pl6'],'New stamp has identical adapter hashes');eq((await api('get',{},false)).object.adapterBuild.state,'ready');for(const count of Object.values(control('identity').counts))eq(count,1);
   await uninstall();uninstallControl('clear-preserved-fixtures');clean();
  });
  await run('native-uninstall-reinstall-no-manual-sql',async()=>{await install();await uninstall();clean();await install();eq(ctl('state').installed,true);const identity=control('identity');eq(identity.aliases,false);eq(identity.native,true);ok(/^v?3\./.test(identity.xpdo));eq(identity.namespace.path,'{core_path}components/cookieconsentmanager3/');eq(identity.namespace.assets_path,'{assets_path}components/cookieconsentmanager3/');});
  await run('manager-and-frontend-smoke',async()=>{
   await p.goto(origin+'/manager/?a=index&namespace=cookie_consent');await p.locator('#ccm-save').waitFor();eq((await api('bundle_rebuild',{},false)).success,true);eq((await api('get',{},false)).object.adapterBuild.state,'ready');eq(errors,[]);
   const data=(await api('get',{},false)).object,draft=Object.fromEntries(['options','registry','texts','log_dir','audit_config_file'].map(k=>[k,data[k]]));draft.options.categories={analytics:true,marketing:true,external_content:true};draft.registry.services=draft.registry.services.map(s=>({...s,enabled:['google_maps','youtube'].includes(s.loader)}));eq((await api('save',{revision:data.revision,draft:JSON.stringify(draft),site_origin:origin},false)).success,true);
   cli('public-install/fixture.php',['resource'],'<!doctype html><html><head>[[!CookieConsentAssets]]</head><body>[[!CookieConsentMap? &provider=`google_maps` &src=`https://www.google.com/maps/embed?pb=smoke`]][[!CookieConsentVideo? &provider=`youtube` &url=`https://youtu.be/M7lc1UVf-VE`]][[!CookieConsentBanner]]</body></html>');
   const visitor=await browser.newContext();const page=await visitor.newPage(),pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));await visitor.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.fulfill({contentType:'text/html',body:'<p>Controlled external frame</p>'}));
   try{const bundle=control('bundle-state');await page.goto(origin,{waitUntil:'networkidle'});await page.locator('#cookie-block').waitFor();eq(await page.locator('iframe').count(),0);eq(await page.evaluate(()=>typeof web86CookieConsent.onAllowed),'function');eq(await page.evaluate(()=>typeof web86CookieConsent.mountEmbeds),'function');await page.evaluate(()=>{window.__allowed=0;web86CookieConsent.onAllowed('analytics',()=>window.__allowed++);});await page.locator('[data-cc-action=accept-all]').click();await page.waitForFunction(()=>window.__allowed===1);await page.waitForFunction(()=>document.querySelectorAll('iframe').length===2);eq(await page.evaluate(()=>web86CookieConsent.getConsent().categories.analytics),true);eq(control('bundle-state'),bundle,'Visitor requests must not rebuild bundle');eq(pageErrors,[]);await page.screenshot({path:out+'/frontend-smoke.png',fullPage:true});}finally{await visitor.close();}
   await p.screenshot({path:out+'/manager-smoke.png',fullPage:true});
  });
  writeFileSync(out+'/final-state.json',JSON.stringify(ctl('state'),null,2)+'\n');
 }catch(e){console.error(e);process.exitCode=1;}finally{await ctx.close();}
}
await browser.close();
