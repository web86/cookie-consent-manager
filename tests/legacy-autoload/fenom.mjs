import {frontendHash,expectedFrontendHash} from '../frontend-asset.mjs';
// Isolated marked Fenom fixture: strict/legacy, actual resource cache and bundle hash.
import {chromium} from 'playwright';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const origin='http://127.0.0.1:18988',container='cookie-consent-acceptance-fenom-1',out='.local/legacy-autoload-evidence';mkdirSync(out,{recursive:true});
const cli=(file,args=[],input)=>execFileSync('docker',['exec','-i',container,'php','/opt/cc-source/'+file,...args],{input,encoding:'utf8'}).trim();
const control=(...a)=>cli('tests/fenom/control.php',a),ctl=(...a)=>cli('tests/local/manager-i18n-control.php',a);
const b=await chromium.launch(),ids=JSON.parse(control('setup')),saved=ctl('setting','cookie_consent.options','get');let n=0;const results=[],eq=(a,b,m)=>{n++;assert.deepEqual(a,b,m)};
try{for(const syntax of ['default','all'])for(const lang of ['ru','en'])for(const mode of ['standard-split','fenom-split','fenom-legacy'])for(const legacy of [false,true]){
 const name=[syntax,lang,mode,legacy?'legacy':'strict'].join('-'),start=n;try{
  control('syntax',syntax);control('parser',mode==='standard-split'?'standard':'fenom');const opts=JSON.parse(saved);opts.buttons={reject:true,configure:!legacy,accept_all:!legacy,accept:legacy};cli('tests/local/manager-i18n-control.php',['setting','cookie_consent.options'],JSON.stringify(opts));
  // The fixture caches generated MODX PHP config with OPcache revalidate_freq=2.
  await new Promise(resolve=>setTimeout(resolve,2200));
  for(let warm=0;warm<2;warm++){const ctx=await b.newContext(),p=await ctx.newPage(),requests=[],events=[],errors=[];
   p.on('pageerror',e=>errors.push(e.message));
   await ctx.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin===origin){if(u.pathname.endsWith('/audit.php')){events.push(r.request().postDataJSON());return r.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,event_id:events.at(-1).event_id,server_time:new Date().toISOString()})})}return r.continue()}
    requests.push(u.href);return r.fulfill({contentType:r.request().resourceType()==='document'?'text/html':'text/javascript',body:r.request().resourceType()==='document'?'<p>Map</p>':'window.__sdk=1;window.__init=Array.from(ym.a[0]);'});
   });
   try{await p.goto(`${origin}/fenom.php?ctx=fenom-${lang}&id=${ids[lang][mode]}`,{waitUntil:'networkidle'});eq(await p.locator('#cache-source').textContent(),warm?'cache':'database','Actual resource cache');eq(await p.locator('#cookie-block').count(),1);eq(await p.locator('#cc-service-registry').count(),1);
    eq(requests.length,legacy?2:0);eq(await p.locator('[data-cc-map-provider] iframe').count(),legacy?1:0);eq(await p.evaluate(()=>web86CookieConsent.getConsent()),null);eq(events,[]);
    const url=await p.locator('script[src*="cookie-consent.min.js"]').getAttribute('src'),bytes=await(await ctx.request.get(new URL(url,origin).href)).body();eq(frontendHash(bytes),expectedFrontendHash());
    if(legacy){eq(await p.evaluate(()=>__init.slice(0,2)),[12345678,'init']);if(warm){await Promise.all([p.waitForNavigation({waitUntil:'networkidle'}),p.locator('[data-cc-action=reject]').click()]);eq(requests.length,2);eq(await p.locator('[data-cc-map-provider] iframe').count(),0)}}eq(errors,[]);
   }catch(e){writeFileSync(out+'/fenom-failure.html',await p.content());throw e}finally{await ctx.close()}
  }
  results.push({name,result:'PASS',assertions:n-start});console.log('PASS '+name);
 }catch(e){results.push({name,result:'FAIL',assertions:n-start,error:e.stack});throw e}
}}catch(e){console.error(e.stack);process.exitCode=1}finally{cli('tests/local/manager-i18n-control.php',['setting','cookie_consent.options'],saved);control('parser','fenom');await b.close();writeFileSync(out+'/fenom.json',JSON.stringify({tests:results.length,assertions:n,failed:results.filter(r=>r.result==='FAIL').length,results},null,2)+'\n')}
