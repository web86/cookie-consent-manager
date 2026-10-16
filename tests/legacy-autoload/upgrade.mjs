import {frontendHash,expectedFrontendHash} from '../frontend-asset.mjs';
// Native beta1/beta2/beta3 -> current, retaining real visitor choice and immutable old ZIPs.
import {chromium} from 'playwright';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {origin,docker} from '../helpers.mjs';
const out='.local/legacy-autoload-evidence';mkdirSync(out,{recursive:true});
const meta=JSON.parse(readFileSync('_build/package.json')),target=`${meta.name}-${meta.version}-${meta.release}${meta.release_index}`;
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const ctl=(a,input)=>docker(['web','php','/opt/cc-source/tests/local/manager-i18n-control.php',...a],input).trim();
const saved=Object.fromEntries(['cookie_consent.options','cookie_consent.services','cookie_consent.texts'].map(k=>[k,ctl(['setting',k,'get'])]));
const snapshot=()=>JSON.parse(docker(['web','php','/opt/cc-source/tests/transport/control.php','snapshot','/opt/cc-private']));
const install=signature=>{execFileSync('docker',['compose','--env-file','.local/private/compose.env','-f','tests/local/compose.yaml','restart','web'],{stdio:'pipe'});execFileSync('node',['tests/transport/install-current.mjs'],{stdio:'pipe',env:{...process.env,CC_INSTALL_SERVICES:'web',CC_INSTALL_SIGNATURE:signature}})};
const browser=await chromium.launch(),results=[];let n=0;
const eq=(a,b,m)=>{n++;assert.deepEqual(a,b,m)};
const previous = process.argv.slice(2).length ? process.argv.slice(2) : ['cookieconsent-1.0.4-beta1','cookieconsent-1.0.4-beta2','cookieconsent-1.0.4-beta3','cookieconsent-1.0.4-beta4','cookieconsent-1.0.4-beta5'];
try{for(const old of previous){
 const oldSha=hash('.local/artifacts/'+old+'.transport.zip'),start=n,visitors=[];
 try{
  install(old);const ids=JSON.parse(docker(['web','php','/opt/cc-source/tests/beta31/fixture.php']));
  const options={...JSON.parse(saved['cookie_consent.options']),categories:{analytics:true,marketing:true,external_content:true},buttons:{reject:true,configure:false,accept_all:false,accept:true}};
  ctl(['setting','cookie_consent.options'],JSON.stringify(options));ctl(['setting','cookie_consent.services'],JSON.stringify({schema:1,services:[{key:'yandex',loader:'yandex',name:'Fixture Yandex',purpose:'Statistics',enabled:true,category:'analytics',config:{id:'12345678'}}]}));
  for(const kind of ['accept','refusal','partial','expired']){
   const ctx=await browser.newContext(),p=await ctx.newPage(),sdk=[];
   await ctx.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin===origin)return r.continue();sdk.push(u.href);return r.fulfill({contentType:'text/javascript',body:'window.__sdk=(window.__sdk||0)+1;'})});
   await p.goto(origin+'/?id='+ids.split,{waitUntil:'networkidle'});eq(sdk.length,['cookieconsent-1.0.4-beta3','cookieconsent-1.0.4-beta4','cookieconsent-1.0.4-beta5'].includes(old)?1:0,'Preserve each historical first-visit startup contract');
   if(kind==='partial'){await p.evaluate(()=>web86CookieConsent.openSettings());await p.locator('[data-cc-category=marketing]').check();await p.locator('[data-cc-action=save]').click()}
   else await p.locator('[data-cc-action='+(kind==='refusal'?'reject':'accept')+']').click();
   await p.waitForTimeout(150);
   if(kind==='expired')await p.evaluate(()=>{const c=JSON.parse(localStorage.getItem('web86_cookie_consent'));c.savedAt=Date.now()-3660*86400000;localStorage.setItem('web86_cookie_consent',JSON.stringify(c))});
   const state=await p.evaluate(()=>({raw:localStorage.getItem('web86_cookie_consent'),consent:web86CookieConsent.getConsent()}));
   const bundle=await p.locator('script[src*="cookie-consent.min.js"]').getAttribute('src');visitors.push({kind,ctx,p,sdk,state,bundle});
  }
  const before=snapshot();install(target);const after=snapshot();
  for(const key of ['settings','auditRegistry','data','resources','templates','menus','policies'])eq(after[key],before[key],key+' retained');
  for(const v of visitors){v.sdk.length=0;await v.p.reload({waitUntil:'networkidle'});eq(await v.p.evaluate(()=>localStorage.getItem('web86_cookie_consent')),v.state.raw,'Exact stored choice survives native upgrade');
   if(v.kind==='expired')eq(await v.p.evaluate(()=>web86CookieConsent.getConsent()),null);else eq(await v.p.evaluate(()=>web86CookieConsent.getConsent()),v.state.consent);
   eq(v.sdk.length,v.kind==='accept'?1:0,'Legacy upgrade never expands previous choice');
   const bundle=await v.p.locator('script[src*="cookie-consent.min.js"]').getAttribute('src');eq(bundle!==v.bundle,true,'Content-hash cache busting');
   const bytes=await(await v.ctx.request.get(new URL(bundle,origin).href)).body();eq(frontendHash(bytes),expectedFrontendHash());
  }
  eq(hash('.local/artifacts/'+old+'.transport.zip'),oldSha,'Historical ZIP immutable');results.push({name:old+' -> '+target,result:'PASS',assertions:n-start,oldSha,targetSha:hash('.local/artifacts/'+target+'.transport.zip')});console.log('PASS '+old+' -> '+target);
 }catch(e){results.push({name:old+' -> '+target,result:'FAIL',error:e.stack});throw e}finally{for(const v of visitors)await v.ctx.close()}
}}catch(e){console.error(e.stack);process.exitCode=1}finally{await browser.close();for(const[k,v]of Object.entries(saved))ctl(['setting',k],v);writeFileSync(out+'/upgrade.json',JSON.stringify({tests:results.length,assertions:n,failed:results.filter(r=>r.result==='FAIL').length,results},null,2)+'\n')}
