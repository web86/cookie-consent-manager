/** Short regression on the already provisioned 2.8.8 release-test infrastructure. */
import {chromium} from 'playwright';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const local='.local/modx2-compatibility',out=local+'/baseline',name='ui-refinement-banner2-pl1-a';mkdirSync(out,{recursive:true});
const container='cookie-consent-adapter-updates-web-1',origin='http://127.0.0.1:22888',signature='cookieconsent-1.0.8-pl3';
const run=(script,op,input)=>JSON.parse(execFileSync('docker',['exec','-i',container,'runuser','-u','www-data','--','php',script,name,op],{encoding:'utf8',input,maxBuffer:8*1024*1024}));
const ctl=op=>run('/opt/cc-source/tests/adapter-updates/control.php',op);
const own=op=>run('/opt/cc-reference/tests/release-test/control.php',op);
const info=run('/opt/cc-reference/tests/modx2-compatibility/baseline.php','info');assert.equal(info.modx,'2.8.8-pl');
const initial=ctl('state'),preserved=own('state');writeFileSync(out+'/before.json',JSON.stringify({initial,preserved},null,2)+'\n',{flag:'wx'});assert.equal(initial.packageVersion,'1.0.8-pl1');
const results=[],errors=[];let n=0;const eq=(a,b,m)=>{n++;assert.deepEqual(a,b,m)};
const test=async(name,fn)=>{let start=n;try{await fn();results.push({name,result:'PASS',assertions:n-start});console.log('PASS baseline '+name);}catch(e){results.push({name,result:'FAIL',error:e.stack});throw e;}};
const browser=await chromium.launch(),ctx=await browser.newContext({viewport:{width:1440,height:1000}});let original;
await ctx.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
const p=await ctx.newPage();p.setDefaultTimeout(15000);p.on('pageerror',e=>errors.push(e.message));
let token;const api=async(action,form={},native=false)=>(await ctx.request.post(origin+(native?'/connectors/index.php':'/assets/components/cookieconsent/connector.php'),{headers:{modAuth:token,Origin:origin,Referer:origin+'/manager/'},form:{action,HTTP_MODAUTH:token,...form},timeout:120000})).json();
const draft=d=>Object.fromEntries(['options','registry','texts','log_dir','audit_config_file'].map(k=>[k,d[k]]));
async function save(value){const now=(await api('get')).object,response=await api('save',{revision:now.revision,draft:JSON.stringify(value),site_origin:origin});eq(response.success,true);eq(response.object.partial,false);}
try{
 await test('native-upgrade-pl1-pl3-reinstall-preserves',async()=>{
  const c=ctl('credentials');await p.goto(origin+'/manager/?a=index&namespace=cookie_consent');await p.locator('#modx-login-username').fill(c.username);await p.locator('#modx-login-password').fill(c.password);await p.locator('#modx-login-btn').click();await p.waitForFunction(()=>window.MODx?.siteId);token=await p.evaluate(()=>MODx.siteId);
  const up=await ctx.request.post(origin+'/connectors/index.php',{headers:{modAuth:token},multipart:{action:'workspace/packages/upload',HTTP_MODAUTH:token,file:{name:signature+'.transport.zip',mimeType:'application/zip',buffer:readFileSync(local+'/artifacts/pl3/'+signature+'.transport.zip')}}});eq((await up.json()).success,true);
  eq((await api('workspace/packages/scanlocal',{},true)).success,true);
  for(let i=0;i<2;i++){eq((await api('workspace/packages/install',{signature},true)).success,true);const after=ctl('state'),saved=own('state');eq(after.packageVersion,'1.0.8-pl3');eq(after.files,initial.files);eq(after.elements,initial.elements);eq(saved.settings,preserved.settings);eq(saved.logs,preserved.logs);eq(saved.owner,preserved.owner);eq(saved.php_error_count,preserved.php_error_count);eq(after.build.state,'ready');}
 });
 await test('manager-preview-guide-save-build-cache-journal',async()=>{
  await p.goto(origin+'/manager/?a=index&namespace=cookie_consent');await p.locator('#ccm-save').waitFor();eq(await p.locator('[role=tab]').count(),4);for(const tab of ['main','services','texts','logs']){await p.locator('#ccm-tab-'+tab).click();eq(await p.locator('#ccm-panel-'+tab).isVisible(),true);}
  await p.locator('#ccm-tab-main').click();await p.locator('#ccm-guide-open').click();eq(await p.locator('#ccm-guide-dialog h3').count(),6);await p.keyboard.press('Escape');await p.frameLocator('#ccm-preview-frame').locator('.cookie-warning-title').waitFor();
  original=draft((await api('get')).object);await save(original);eq((await api('bundle_rebuild')).success,true);eq((await api('system/clearcache',{},true)).success,true);eq((await api('get')).object.adapterBuild.state,'ready');eq((await api('logs_list')).success,true);await p.screenshot({path:out+'/manager.png',fullPage:true});
 });
 for(const legacy of [false,true])await test('frontend-'+(legacy?'legacy':'strict')+'-consent-embeds-cache',async()=>{
  const value=structuredClone(original);value.options.buttons.accept=legacy;await save(value);
  const html='<!doctype html><html><head>'+ (legacy?'':'[[!CookieConsentAssets]]')+'</head><body>[[!CookieConsentMap? &provider=`google_maps` &src=`https://www.google.com/maps/embed?pb=baseline`]][[!CookieConsentVideo? &provider=`youtube` &url=`https://youtu.be/M7lc1UVf-VE`]]'+(legacy?'[[!CookieConsent]]':'[[!CookieConsentBanner]]')+'</body></html>';
  const {id}=run('/opt/cc-reference/tests/modx2-compatibility/baseline.php','page',html);
  const v=await browser.newContext(),requests=[];await v.route('**/*',r=>{if(new URL(r.request().url()).origin===origin)return r.continue();requests.push(r.request().url());return r.fulfill({contentType:r.request().resourceType()==='document'?'text/html':'application/javascript',body:''});});
  const page=await v.newPage();page.on('pageerror',e=>errors.push(e.message));
  try{await page.goto(origin+'/?id='+id,{waitUntil:'networkidle'});eq(await page.locator('iframe').count(),legacy?2:0);if(!legacy)eq(requests,[]);await page.locator(legacy?'[data-cc-action=accept]':'[data-cc-action=accept-all]').click();await page.waitForFunction(()=>web86CookieConsent.getConsent()?.categories.marketing===true);eq(await page.locator('iframe').count(),2);const raw=await page.evaluate(()=>localStorage.getItem('web86_cookie_consent'));await page.reload({waitUntil:'networkidle'});eq(await page.evaluate(()=>localStorage.getItem('web86_cookie_consent')),raw);eq((await api('system/clearcache',{},true)).success,true);await page.reload({waitUntil:'networkidle'});eq(await page.locator('iframe').count(),2);await page.evaluate(()=>web86CookieConsent.openSettings());for(const cat of ['analytics','marketing','external_content'])await page.locator('[data-cc-category='+cat+']').uncheck();await Promise.all([page.waitForNavigation({waitUntil:'networkidle'}),page.locator('[data-cc-action=save]').click()]);eq(await page.locator('iframe').count(),0);}finally{await v.close();}
 });
 await save(original);original=null;eq(errors,[]);
}catch(e){console.error(e.stack);process.exitCode=1;}
finally{if(original)await save(original).catch(()=>{});await ctx.close();await browser.close();writeFileSync(out+'/results.json',JSON.stringify({info,tests:results.length,assertions:n,failed:results.filter(r=>r.result==='FAIL').length,results,errors},null,2)+'\n');}
