// Real installed clean MODX, live mode, no mock directory; external SDK/player responses are controlled.
import {chromium} from 'playwright';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
const metadata=JSON.parse(readFileSync('_build/package.json')),version=metadata.version+(metadata.release?'-'+metadata.release+metadata.release_index:'');
const origin='http://127.0.0.1:8889',container='cookie-consent-acceptance-clean-1';
const cli=(file,...args)=>execFileSync('docker',['exec',container,'php','/opt/cc-source/'+file,...args],{encoding:'utf8'}).trim();
const fixture=op=>cli('tests/transport/production-fixture.php',op);
const out='.local/beta2-evidence';mkdirSync(out,{recursive:true});
const id=fixture('prepare'),browser=await chromium.launch(),results=[];let n=0;
const eq=(a,b,m)=>{n++;assert.deepEqual(a,b,m);};const test=async(name,fn)=>{const start=n;await fn();results.push({name,result:'PASS',assertions:n-start});console.log('PASS '+name);};
try{
 for(const mode of ['strict','legacy'])await test('installed-live-'+mode+'-SDK-maps-video-consent-without-mocks',async()=>{
  fixture(mode);const ctx=await browser.newContext(),p=await ctx.newPage(),external=[],mocks=[],errors=[];p.on('pageerror',e=>errors.push(e.message));
  await ctx.route('**/*',async r=>{const u=new URL(r.request().url());if(u.pathname.includes('/mock/')){mocks.push(u.href);return r.abort();}
   if(u.origin!==origin){external.push({url:u.href,type:r.request().resourceType()});return r.fulfill({contentType:r.request().resourceType()==='script'?'text/javascript':'text/html',body:r.request().resourceType()==='script'?'/* controlled SDK */':'<p>Controlled player/map</p>'});}
   if(u.pathname==='/assets/js/customer-fixture.js')return r.fulfill({contentType:'text/javascript',body:'window.__customLoads=(window.__customLoads||0)+1;'});
   if(u.pathname.endsWith('/audit.php')){const e=r.request().postDataJSON();return r.fulfill({json:{ok:true,event_id:e.event_id,server_time:new Date().toISOString()}});}return r.continue();
  });
  try{
   await p.goto(origin+'/?id='+id,{waitUntil:'networkidle'});eq(await p.locator('#cookie-block').getAttribute('data-cc-mode'),'live');
   if(mode==='strict'){eq(external,[],'Strict has no third-party request before choice');eq(await p.locator('[data-cc-embed] iframe,[data-cc-map-provider] iframe').count(),0);eq(await p.evaluate(()=>window.__allowed),0);await p.locator('[data-cc-action=accept-all]').click();}
   else{await p.waitForFunction(()=>window.__customLoads===1);eq(await p.evaluate(()=>web86CookieConsent.getConsent()),null,'Legacy startup creates no persisted grant');eq(await p.evaluate(()=>localStorage.getItem('web86_cookie_consent')),null);await p.locator('[data-cc-action=accept]').click();}
   await p.waitForFunction(()=>window.__customLoads===1&&document.querySelectorAll('[data-cc-embed] iframe,[data-cc-map-provider] iframe').length===5);
   eq(await p.evaluate(()=>window.__allowed),1,'onAllowed runs once');eq(await p.locator('[data-cc-embed] iframe').count(),3,'All three videos');eq(await p.locator('[data-cc-map-provider] iframe').count(),2,'Both map providers');
   const scripts=external.filter(r=>r.type==='script').map(r=>r.url);eq(scripts.length,5,'Five live SDK URLs, shared Mail.Ru/VK and Google libraries deduplicated');
   for(const host of ['mc.yandex.ru','top-fwz1.mail.ru','www.googletagmanager.com','connect.facebook.net'])eq(scripts.some(s=>new URL(s).hostname===host),true,host);
   eq(new Set(scripts).size,scripts.length,'No duplicate SDK requests');const consent=await p.evaluate(()=>localStorage.getItem('web86_cookie_consent'));eq(JSON.parse(consent).categories,{analytics:true,marketing:true,external_content:true});
   const before=external.length;await p.evaluate(()=>{web86CookieConsent.mountEmbeds();web86CookieConsent.mountEmbeds();});eq(external.length,before,'Repeated mount is idempotent');
   await p.reload({waitUntil:'networkidle'});eq(await p.evaluate(()=>localStorage.getItem('web86_cookie_consent')),consent,'Saved consent retained');eq(await p.locator('[data-cc-embed] iframe,[data-cc-map-provider] iframe').count(),5);
   await p.evaluate(()=>web86CookieConsent.openSettings());for(const category of ['analytics','marketing','external_content'])await p.locator('[data-cc-category='+category+']').uncheck();
   external.length=0;await Promise.all([p.waitForNavigation({waitUntil:'networkidle'}),p.locator('[data-cc-action=save]').click()]);
   eq(external,[],'Saved refusal blocks all SDK/player/map requests after revoke');eq(await p.locator('[data-cc-embed] iframe,[data-cc-map-provider] iframe').count(),0);eq(await p.evaluate(()=>window.__allowed),0);eq(mocks,[],'No request for excluded mock assets');eq(errors,[]);
  }finally{await ctx.close();}
 });
 await test('installed-Manager-preview-and-rebuild-without-mocks',async()=>{
  fixture('strict');const ctx=await browser.newContext(),p=await ctx.newPage(),mocks=[],external=[];
  await ctx.route('**/*',r=>{const u=new URL(r.request().url());if(u.pathname.includes('/mock/'))mocks.push(u.href);if(u.origin!==origin){if(r.request().frame().parentFrame())external.push(u.href);return r.abort();}return r.continue();});
  try{const c=JSON.parse(cli('tests/transport/control.php','credentials','/opt/cc-clean'));await p.goto(origin+'/manager/');await p.locator('#modx-login-username').fill(c.username);await p.locator('#modx-login-password').fill(c.password);await p.locator('#modx-login-btn').click();await p.waitForFunction(()=>window.MODx?.siteId);await p.goto(origin+'/manager/?a=index&namespace=cookie_consent');await p.locator('[data-preview-state=map]').click();await p.waitForTimeout(700);const frame=p.frameLocator('#ccm-preview-frame');eq(await frame.locator('[data-preview-embed]').count(),3);eq(await frame.locator('[data-preview-map]').count(),2);eq(await frame.locator('iframe,script').count(),0);eq(mocks,[]);eq(external,[],'Preview frame makes no external requests; MODX avatar belongs to the Manager shell');const token=await p.evaluate(()=>MODx.siteId),api=async action=>(await ctx.request.post(origin+'/assets/components/cookieconsent/connector.php',{headers:{modAuth:token},form:{action,HTTP_MODAUTH:token}})).json();const before=(await api('get')).object;eq(before.packageVersion,version,'Installed runtime version');const built=await api('bundle_rebuild');eq(built.success,true,'Native administrative rebuild without mock files');eq(built.object.rebuilt,true);eq(built.object.version>before.adapterBuild.version,true,'Force advances saved timestamp');}finally{await ctx.close();}
 });
}catch(e){results.push({result:'FAIL',error:e.stack});console.error(e.stack);process.exitCode=1;}
finally{await browser.close();fixture('restore');writeFileSync(out+'/production-without-mocks.json',JSON.stringify({tests:results.length,assertions:n,failed:results.filter(r=>r.result==='FAIL').length,results,real_video_playback:'NOT TESTED: controlled iframe responses'},null,2)+'\n');}
