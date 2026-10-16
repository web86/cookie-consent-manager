import {chromium} from 'playwright';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
import {origin,docker} from '../helpers.mjs';
const source=process.env.CC_ADAPTER_CONTAINER_SOURCE||'/tmp/cc-adapter-source-clean';
const control=op=>execFileSync('docker',['exec','cookie-consent-acceptance-web-1','php',source+'/tests/adapter-cache/native.php',op],{encoding:'utf8'}).trim();
const state=()=>JSON.parse(control('state'));
const ctl=(args,input)=>docker(['web','php','/opt/cc-source/tests/local/manager-i18n-control.php',...args],input).trim();
const out='.local/adapter-cache/native';mkdirSync(out,{recursive:true});
const savedLanguage=ctl(['setting','manager_language','get']);
const guide=JSON.parse(readFileSync('_build/user-guide.json')).languages;
let n=0;const results=[];const eq=(a,b,m)=>{n++;assert.deepEqual(a,b,m);};
const test=async(name,fn)=>{const before=n;await fn();results.push({name,result:'PASS',assertions:n-before});console.log('PASS '+name);};
const browser=await chromium.launch(),ctx=await browser.newContext(),p=await ctx.newPage();
await ctx.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
const errors=[];p.on('pageerror',e=>errors.push(e.message));
let token;
const api=async(action,form={},native=false)=>(await ctx.request.post(origin+(native?'/connectors/index.php':'/assets/components/cookieconsent/connector.php'),{headers:{modAuth:token},form:{action,HTTP_MODAUTH:token,...form}})).json();
const refresh=async()=>eq((await api('system/clearcache',{},true)).success,true,'Native Manager cache clear');
try{
 const c=JSON.parse(docker(['web','php','/opt/cc-source/tests/transport/control.php','credentials','/opt/cc-private']));
 await p.goto(origin+'/manager/');await p.locator('#modx-login-username').fill(c.username);await p.locator('#modx-login-password').fill(c.password);await p.locator('#modx-login-btn').click();await p.waitForFunction(()=>window.MODx?.siteId);token=await p.evaluate(()=>MODx.siteId);
 await test('installed-plugin-event-and-successful-warmup',async()=>{const s=state();eq(s.plugins,1);eq(s.events,1);eq(s.build.state,'ready');eq(typeof s.build.built_at,'string');});
 await test('cache-clear-unchanged-skips-write',async()=>{const a=state();await refresh();const b=state();eq(b.hash,a.hash);eq(b.inode,a.inode);eq(b.settings,a.settings);});
 await test('adapter-edit-native-cache-clear-updates-static-URL',async()=>{const a=state();control('edit');await refresh();const b=state();eq(b.build.state,'ready');eq(b.asset===a.asset,false);eq(b.hash===a.hash,false);eq(b.settings,a.settings);const r=await ctx.request.get(origin+'/assets/'+b.asset);eq(r.status(),200);eq((await r.text()).includes('__adapterBuildEdited'),true);});
 await test('syntax-error-keeps-prior-file-and-metadata',async()=>{const a=state();control('break');await refresh();const b=state();eq(b.hash,a.hash);eq(b.asset,a.asset);eq(b.build.built_at,a.build.built_at);eq(b.build.state,'error');eq((await api('bundle_rebuild')).success,false);control('restore');await refresh();eq(state().build.state,'ready');});
 await test('write-permission-failure-keeps-prior-file',async()=>{const a=state();control('deny');try{eq((await api('bundle_rebuild')).success,false);eq(state().hash,a.hash);}finally{control('allow');}});
 await test('web-process-event-never-builds',async()=>{const a=state();control('edit');control('public-refresh');const b=state();eq(b.hash,a.hash);eq(b.inode,a.inode);control('restore');await refresh();});
 await test('public-request-cannot-force-build',async()=>{const publicContext=await browser.newContext();try{const a=state();const r=await publicContext.request.post(origin+'/assets/components/cookieconsent/connector.php',{form:{action:'bundle_rebuild'}});const body=await r.text();eq(r.status()>=400||body.includes('"success":false'),true);eq(state().hash,a.hash);}finally{await publicContext.close();}});
 for(const language of ['ru','en'])await test('Manager-build-guide-draft-'+language,async()=>{
  ctl(['setting','manager_language'],language);await p.goto(origin+'/manager/?a=index&namespace=cookie_consent');await p.locator('#ccm-bundle-rebuild').waitFor();
  eq(await p.locator('#ccm-adapters-build h3').textContent(),language==='ru'?'Сборка адаптеров':'Adapters build');
  eq(await p.locator('#ccm-bundle-rebuild').textContent(),language==='ru'?'Пересобрать адаптеры':'Rebuild adapters');
  await p.locator('#ccm-ttl').fill('157');const old=state();
  const r=p.waitForResponse(r=>new URLSearchParams(r.request().postData()||'').get('action')==='bundle_rebuild');await p.locator('#ccm-bundle-rebuild').click();eq((await(await r).json()).object.rebuilt,true);await p.locator('#ccm-bundle-rebuild:enabled').waitFor();
  eq(await p.locator('#ccm-ttl').inputValue(),'157');eq(state().settings,old.settings);eq(state().inode===old.inode,false,'Forced atomic replacement');
  await p.locator('#ccm-guide-open').click();eq(await p.locator('#ccm-guide-dialog h3').count(),6);eq(await p.locator('#ccm-guide-dialog code').allTextContents(),guide[language].sections.flatMap(s=>s.blocks).filter(b=>b.type==='code').map(b=>b.text));eq(await p.locator('#ccm-guide-dialog iframe,#ccm-guide-dialog script').count(),0);await p.keyboard.press('Escape');eq(await p.locator('#ccm-ttl').inputValue(),'157');
  await p.locator('#ccm-adapters-build').screenshot({path:out+'/build-'+language+'.png'});
 });
 await test('missing-cache-serves-prebuilt-without-frontend-rebuild',async()=>{control('remove-cache');const before=state();eq(before.build.state,'fallback');const id=docker(['web','php','/opt/cc-source/tests/local/ux-control.php','resource'],'<!doctype html><html><head>[[!CookieConsentAssets]]</head><body>[[!CookieConsentBanner]]</body></html>').trim();try{const v=await browser.newContext();await v.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());const page=await v.newPage();await page.goto(origin+'/?id='+id,{waitUntil:'networkidle'});eq(await page.locator('script[src*="cookie-consent.min.js"]').count(),1);eq((await page.locator('script[src*="cookie-consent.min.js"]').getAttribute('src')).includes('cached-'),false);eq(state().hash,null,'Visitor did not rebuild');await v.close();}finally{docker(['web','php','/opt/cc-source/tests/local/ux-control.php','resource','remove']);await refresh();}});
 eq(errors,[],'No uncaught Manager errors');
}catch(e){results.push({result:'FAIL',error:e.stack});console.error(e);process.exitCode=1;}
finally{control('allow');control('restore');ctl(['setting','manager_language'],savedLanguage);if(token)await refresh();await browser.close();writeFileSync(out+'/results.json',JSON.stringify({tests:results.length,assertions:n,failed:results.filter(r=>r.result==='FAIL').length,results},null,2)+'\n');}
