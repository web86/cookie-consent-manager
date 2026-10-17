import {chromium} from 'playwright';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,renameSync,symlinkSync} from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const origin='http://127.0.0.1:23888',container='cookie-consent-modx3-adapter-updates-web-1',out=process.env.CC_ADAPTER_WEB_OUT||'.local/adapter-updates/evidence/web';mkdirSync(out,{recursive:true});
const ctl=(name,op,...args)=>JSON.parse(execFileSync('docker',['exec',container,'runuser','-u','www-data','--','php','/opt/cc-source/tests/adapter-updates/control.php',name,op,...args],{encoding:'utf8'}));
const native=process.argv.slice(2).length?process.argv.slice(2):['.local/adapter-updates/evidence/native-accepted.json'];
const records=new Map();for(const file of native)for(const row of JSON.parse(readFileSync(file)).results)if(row.result==='PASS')records.set(row.name,row);
let n=0;const results=[],eq=(a,b,m)=>{n++;assert.deepEqual(a,b,m);};
const select=name=>{const active='.local/adapter-updates/active';renameSync(active,active+'-web-'+name+'-'+Date.now());symlinkSync('cases/'+name,active);execFileSync('docker',['exec',container,'apachectl','-k','graceful'],{stdio:'pipe'});};
async function test(name,fn){const before=n;try{await fn();results.push({name,result:'PASS',assertions:n-before});console.log('PASS '+name);}catch(e){results.push({name,result:'FAIL',assertions:n-before,error:e.stack});throw e;}}
const browser=await chromium.launch();
try{
 for(const key of (process.env.CC_ADAPTER_WEB_ONLY==='manager'?[]:['fresh','original','one','several','helper','deleted','extra','occupied','syntax','firstsyntax'])){
  const row=records.get(key);assert.ok(row,'Completed native case '+key);const name=row.case;select(name);
  for(const mode of ['strict','legacy'])await test(key+'-'+mode+'-installed-PHP-bundle',async()=>{
   const {id}=ctl(name,'production',mode),before=ctl(name,'state');const ctx=await browser.newContext(),page=await ctx.newPage(),external=[],errors=[],js=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(new URL(r.url()).pathname.endsWith('/cached-cookie-consent.min.js'))js.push(r.url());});
   await ctx.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!==origin){external.push(u.href);return r.fulfill({contentType:r.request().resourceType()==='script'?'text/javascript':'text/html',body:r.request().resourceType()==='script'?'/* controlled SDK */':'<p>Controlled iframe</p>'});}if(u.pathname.endsWith('/audit.php')){const e=r.request().postDataJSON();return r.fulfill({json:{ok:true,event_id:e.event_id,server_time:new Date().toISOString()}});}return r.continue();});
   try{
    await page.goto(origin+'/?id='+id,{waitUntil:'networkidle'});eq(await page.locator('meta[name=cc-adapter-case]').getAttribute('content'),name,'Actual HTTP fixture identity');eq(js.length,1,'One installed cached production JS');eq(new URL(js[0]).searchParams.get('v'),String(before.timestamp),'Saved timestamp');eq(js.some(u=>/\/cookie-consent\.min\.js/.test(u)),false,'No prebuilt fallback');eq(createHash('sha256').update(await(await ctx.request.get(js[0])).body()).digest('hex'),before.bundle,'Exact installed JS bytes served');
    eq(await page.evaluate(()=>typeof web86CookieConsent.mountEmbeds),'function');eq(await page.evaluate(()=>window.__adapterCustomerEdit||0),({one:1,several:2,helper:1,occupied:1}[key]||0),'User edits execute only for fixed inputs; extra file is inert');
    if(mode==='strict'){eq(external,[],'No third party before grant');eq(await page.locator('iframe').count(),0);await page.locator('[data-cc-action=accept-all]').click();}
    else{eq(await page.evaluate(()=>web86CookieConsent.getConsent()),null);await page.locator('[data-cc-action=accept]').click();}
    await page.waitForFunction(()=>document.querySelectorAll('[data-cc-embed] iframe,[data-cc-map-provider] iframe').length===5);eq(await page.locator('[data-cc-embed] iframe').count(),3);eq(await page.locator('[data-cc-map-provider] iframe').count(),2);
    const count=external.length;await page.evaluate(()=>{web86CookieConsent.mountEmbeds();web86CookieConsent.mountEmbeds();});eq(external.length,count,'Idempotent mount');
    await page.reload({waitUntil:'networkidle'});eq(await page.locator('iframe').count(),5,'Saved grant restored');
    await page.evaluate(()=>web86CookieConsent.openSettings());await page.locator('[data-cc-action=back]').click();external.length=0;await Promise.all([page.waitForNavigation({waitUntil:'networkidle'}),page.locator('[data-cc-action=reject]').click()]);eq(await page.locator('iframe').count(),0);eq(external,[],'Saved refusal blocks processing after revoke');eq(errors,[]);
    const after=ctl(name,'state');eq(after.bundle,before.bundle,'Visitor requests never rewrite JS');eq(after.timestamp,before.timestamp,'Visitor requests never rebuild/version');
   }finally{await ctx.close();}
  });
 }
 await test('Manager-error-keeps-prior-bundle-and-invalid-source',async()=>{
  const name=records.get('syntax').case;select(name);ctl(name,'language','en');const before=ctl(name,'state'),ctx=await browser.newContext(),p=await ctx.newPage();await ctx.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  try{const c=ctl(name,'credentials');await p.goto(origin+'/manager/');await p.locator('#modx-login-username').fill(c.username);await p.locator('#modx-login-password').fill(c.password);await p.locator('#modx-login-btn').click();await p.waitForFunction(()=>window.MODx?.siteId);await p.goto(origin+'/manager/?a=index&namespace=cookie_consent');await p.locator('#ccm-build-status').waitFor();eq((await p.locator('#ccm-build-status').textContent()).includes('Build failed'),true);const response=p.waitForResponse(r=>new URLSearchParams(r.request().postData()||'').get('action')==='bundle_rebuild');await p.locator('#ccm-bundle-rebuild').click();eq((await(await response).json()).success,false);const after=ctl(name,'state');eq(after.bundle,before.bundle);eq(after.timestamp,before.timestamp);eq(after.files,before.files,'Manager does not replace invalid user JS');}finally{await ctx.close();}
 });
 const name=records.get('helper').case;select(name);ctl(name,'probe');
 for(const lang of ['ru','en'])await test('Manager-'+lang+'-kept-notice-force-cacheclear',async()=>{
  ctl(name,'language',lang);const ctx=await browser.newContext(),p=await ctx.newPage();await ctx.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  try{
   const c=ctl(name,'credentials');await p.goto(origin+'/manager/?manager_language='+lang);await p.locator('#modx-login-username').fill(c.username);await p.locator('#modx-login-password').fill(c.password);await p.locator('#modx-login-btn').click();await p.waitForFunction(()=>window.MODx?.siteId);
   const token=await p.evaluate(()=>MODx.siteId),api=async(action,core=false)=>(await ctx.request.post(origin+(core?'/connectors/index.php':'/assets/components/cookieconsent/connector.php'),{headers:{modAuth:token},form:{action,HTTP_MODAUTH:token}})).json();
   await p.goto(origin+'/manager/?a=index&namespace=cookie_consent');await p.locator('#ccm-bundle-rebuild').waitFor();eq(await p.locator('#ccm-adapters-preserved').isVisible(),true);eq((await p.locator('#ccm-adapters-preserved').textContent()).includes(lang==='ru'?'сохранены':'kept'),true,'Localized one-line preservation notice');
   await p.locator('#ccm-ttl').fill('157');const before=ctl(name,'state'),probe=ctl(name,'probe-count').count;const response=p.waitForResponse(r=>new URLSearchParams(r.request().postData()||'').get('action')==='bundle_rebuild');await p.locator('#ccm-bundle-rebuild').click();eq((await(await response).json()).success,true);await p.locator('#ccm-bundle-rebuild:enabled').waitFor();eq(await p.locator('#ccm-ttl').inputValue(),'157','Build does not save draft');eq(ctl(name,'state').timestamp>before.timestamp,true,'Force advances timestamp');eq(ctl(name,'probe-count').count,probe,'Force does not recurse through OnSiteRefresh');
   ctl(name,'edit','google-common.js','comment');const edited=ctl(name,'state');eq((await api('system/clearcache',true)).success,true,'Native Manager cache clear');const built=ctl(name,'state');eq(built.timestamp>edited.timestamp,true);eq(built.bundle!==edited.bundle,true);eq(ctl(name,'probe-count').count,probe+1,'One native refresh, no recursion');
   await p.locator('#ccm-adapters-build').screenshot({path:out+'/Manager-'+lang+'.png'});
   const anonymous=await browser.newContext();try{const a=ctl(name,'state');const denied=await anonymous.request.post(origin+'/assets/components/cookieconsent/connector.php',{form:{action:'bundle_rebuild'}});eq(denied.status()>=400||(await denied.text()).includes('"success":false'),true,'Public rebuild denied');eq(ctl(name,'state').timestamp,a.timestamp);}finally{await anonymous.close();}
  }finally{await ctx.close();}
 });
}catch(e){if(!results.some(r=>r.result==='FAIL'))results.push({name:'orchestration',result:'FAIL',error:e.stack});console.error(e.stack);process.exitCode=1;}
finally{await browser.close();writeFileSync(out+'/results.json',JSON.stringify({tests:results.length,assertions:n,failed:results.filter(r=>r.result==='FAIL').length,results,real_video_playback:'NOT TESTED: controlled external responses'},null,2)+'\n');}
