/** Installed release: retained settings, customer JS, callbacks, maps/video/iframe and failure bundles. */
import {chromium} from 'playwright';
import {readFileSync,writeFileSync,mkdirSync,renameSync,symlinkSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const major=process.argv[2],file=process.argv[3],report=JSON.parse(readFileSync(file,'utf8'));assert.equal(report.failed,0);assert.equal(report.tests,6);
const source='.local/modx'+major+'-safe-adapter-updates/.local/adapter-updates',container='cookie-consent-'+(major==='3'?'modx3-':'')+'adapter-updates-web-1',origin='http://127.0.0.1:'+(major==='3'?'23888':'22888');
const out='.local/release-test/modx'+major+'/web';mkdirSync(out,{recursive:true});
const ctl=(name,op,...args)=>JSON.parse(execFileSync('docker',['exec',container,'runuser','-u','www-data','--','php',(major==='3'?'/opt/cc-reference/tests/release-test/native-control.php':'/opt/cc-source/tests/adapter-updates/control.php'),name,op,...args],{encoding:'utf8'}));
const own=(name,op)=>JSON.parse(execFileSync('docker',['exec',container,'runuser','-u','www-data','--','php','/opt/cc-reference/tests/release-test/control.php',name,op],{encoding:'utf8'}));
const select=name=>{renameSync(source+'/active',source+'/active-before-web-'+name+'-'+Date.now());symlinkSync('cases/'+name,source+'/active');execFileSync('docker',['exec',container,'apachectl','-k','graceful'],{stdio:'pipe'});};
let n=0;const results=[],eq=(a,b,m)=>{n++;assert.deepEqual(a,b,m);},ok=(a,m)=>{n++;assert.ok(a,m);};
const test=async(name,fn)=>{let before=n;try{await fn();results.push({name,result:'PASS',assertions:n-before});console.log('PASS '+name);}catch(e){results.push({name,result:'FAIL',error:e.stack});throw e;}};
const browser=await chromium.launch();
try{
 for(const row of report.results){
  const name=row.case;select(name);const {id}=own(name,'page'),before=ctl(name,'state'),ctx=await browser.newContext();
  const errors=[],external=[],assets=[];const p=await ctx.newPage();p.setDefaultTimeout(15000);p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(new URL(r.url()).pathname.endsWith('/cached-cookie-consent.min.js'))assets.push(r.url());});
  await ctx.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!==origin){external.push(u.href);return r.fulfill({contentType:r.request().resourceType()==='script'?'text/javascript':'text/html',body:r.request().resourceType()==='script'?'/* controlled SDK */':'<p>Controlled player</p>'});}if(u.pathname.endsWith('/audit.php')){const e=r.request().postDataJSON();return r.fulfill({json:{ok:true,event_id:e.event_id,server_time:new Date().toISOString()}});}return r.continue();});
  try{await test(row.name+'-installed-customer-frontend',async()=>{
   await p.goto(origin+'/?id='+id,{waitUntil:'networkidle'});eq(await p.locator('meta[name=cc-release-case]').getAttribute('content'),name);eq(assets.length,1);eq(new URL(assets[0]).searchParams.get('v'),String(before.timestamp));eq(createHash('sha256').update(await(await ctx.request.get(assets[0])).body()).digest('hex'),before.bundle,'Exact installed production bundle');eq(await p.evaluate(()=>typeof web86CookieConsent.onAllowed),'function');eq(await p.evaluate(()=>window.__ccReleaseExtra),undefined,'Unlisted services JS is inert');
   if(row.name==='fresh'){eq(await p.locator('iframe').count(),0);eq(external,[]);}
   else{
    const legacy=row.name==='legacy';if(!legacy){eq(external,[]);eq(await p.locator('iframe').count(),0);eq(await p.evaluate(()=>window.__ccReleaseOwner||0),0);eq(await p.evaluate(()=>window.__ccAllowed||0),0);await p.locator('[data-cc-action=accept-all]').click();}else{eq(await p.evaluate(()=>web86CookieConsent.getConsent()),null);await p.locator('[data-cc-action=accept]').click();}
    await p.waitForFunction(()=>document.querySelectorAll('iframe').length===6);eq(await p.locator('[data-cc-map-provider] iframe').count(),2);eq(await p.locator('[data-cc-embed] iframe').count(),4);eq(await p.evaluate(()=>window.__ccReleaseOwner),1,'Configured customer JS executes');eq(await p.evaluate(()=>window.__ccAllowed),1,'Preserved onAllowed service callback');
    eq(await p.evaluate(()=>window.__adapterCustomerEdit||0),row.name==='edited'?3:0,'Retained edited sources execute in the installed bundle');
    await p.evaluate(()=>{web86CookieConsent.mountEmbeds();web86CookieConsent.mountEmbeds();});eq(await p.locator('iframe').count(),6);eq(await p.evaluate(()=>window.__ccReleaseOwner),1);eq(await p.evaluate(()=>window.__ccAllowed),1);
    await p.reload({waitUntil:'networkidle'});eq(await p.locator('iframe').count(),6,'Saved grant restores frames');eq(await p.evaluate(()=>window.__ccAllowed),1);
    await p.evaluate(()=>web86CookieConsent.openSettings());await p.locator('[data-cc-action=back]').click();external.length=0;await Promise.all([p.waitForNavigation({waitUntil:'networkidle'}),p.locator('[data-cc-action=reject]').click()]);eq(await p.locator('iframe').count(),0);eq(external,[]);eq(await p.evaluate(()=>window.__ccReleaseOwner||0),0);eq(await p.evaluate(()=>window.__ccAllowed||0),0);
   }
   const after=ctl(name,'state');eq(after.bundle,before.bundle,'Visitors never rebuild bundle');eq(after.timestamp,before.timestamp,'Visitors never change build timestamp');eq(errors,[]);await p.screenshot({path:out+'/'+row.name+'.png'});
  });}finally{await ctx.close();}
 }
 const row=report.results.find(r=>r.name==='edited');select(row.case);ctl(row.case,'language','en');ctl(row.case,'probe');
 await test('upgraded-Manager-force-cacheclear-no-recursion',async()=>{
  const ctx=await browser.newContext(),p=await ctx.newPage();p.setDefaultTimeout(15000);await ctx.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  try{const c=ctl(row.case,'credentials');await p.goto(origin+'/manager/');await p.locator('#modx-login-username').fill(c.username);await p.locator('#modx-login-password').fill(c.password);await p.locator('#modx-login-btn').click();await p.waitForFunction(()=>window.MODx?.siteId);await p.goto(origin+'/manager/?a=index&namespace=cookie_consent');await p.locator('#ccm-advanced>summary').click();await p.locator('#ccm-adapters-preserved').waitFor();
   const before=ctl(row.case,'state'),probe=ctl(row.case,'probe-count').count;const response=p.waitForResponse(r=>new URLSearchParams(r.request().postData()||'').get('action')==='bundle_rebuild');await p.locator('#ccm-bundle-rebuild').click();eq((await(await response).json()).success,true);await p.locator('#ccm-bundle-rebuild:enabled').waitFor();ok(ctl(row.case,'state').timestamp>before.timestamp);eq(ctl(row.case,'probe-count').count,probe);
   ctl(row.case,'edit','google-common.js','comment');const edited=ctl(row.case,'state'),token=await p.evaluate(()=>MODx.siteId);const clear=await ctx.request.post(origin+'/connectors/index.php',{headers:{modAuth:token},form:{action:'system/clearcache',HTTP_MODAUTH:token}});eq((await clear.json()).success,true);const built=ctl(row.case,'state');ok(built.timestamp>edited.timestamp);ok(built.bundle!==edited.bundle);eq(ctl(row.case,'probe-count').count,probe+1);await p.locator('#ccm-adapters-build').screenshot({path:out+'/Manager-build.png'});
  }finally{await ctx.close();}
 });
}catch(e){if(!results.some(r=>r.result==='FAIL'))results.push({name:'orchestration',result:'FAIL',error:e.stack});console.error(e.stack);process.exitCode=1;}
finally{await browser.close();writeFileSync(out+'/results.json',JSON.stringify({tests:results.length,assertions:n,failed:results.filter(r=>r.result==='FAIL').length,results,external_services:'Controlled SDK/player responses; real delivery/playback not verified'},null,2)+'\n');}
