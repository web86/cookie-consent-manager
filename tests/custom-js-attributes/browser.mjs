import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';
const product=JSON.parse(readFileSync('_build/package.json')).name;
const base='assets/components/'+product+'/js/cookie-consent/';
const bundle=readFileSync(base+'cookie-consent.min.js','utf8');
const demo=readFileSync('demo.html','utf8');
const fixture=readFileSync('tests/fixtures/custom-js-attributes.js','utf8');
const origin='https://attributes.example.test';
const out=process.env.CC_ATTRIBUTES_OUT||'.local/custom-js-attributes';mkdirSync(out,{recursive:true});
const browser=await chromium.launch();let assertions=0;const results=[];
const eq=(a,b,m)=>{assertions++;assert.deepEqual(a,b,m);};
const test=async(name,fn)=>{const before=assertions;try{await fn();results.push({name,result:'PASS',assertions:assertions-before});console.log('PASS '+name);}catch(e){results.push({name,result:'FAIL',error:e.stack});throw e;}};
const service=(key='custom',category='analytics',attributes)=>({key,category,enabled:true,loader:'custom_js',purpose:'Site statistics',config:{path:'/'+key+'.js',...(attributes===undefined?{}:{attributes})}});
async function session(services,legacy=false,raw){
 const ctx=await browser.newContext();let registry={schema:1,services};const requests=[],external=[],errors=[];
 const versions={analytics:0,marketing:0,external_content:0};
 const processing=(r,c)=>JSON.stringify(r.services.filter(s=>s.enabled&&s.category===c).map(s=>[s.key,s.loader,s.purpose,s.config.path,Object.entries(s.config.attributes||{}).sort()]));
 const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
 await ctx.route('**/*',route=>{
  const u=new URL(route.request().url());
  if(u.origin!==origin){external.push(u.href);return route.abort();}
  if(route.request().isNavigationRequest()){
   const json=(raw??JSON.stringify(registry)).replaceAll('<','\\u003c').replaceAll('>','\\u003e').replaceAll('&','\\u0026');
   return route.fulfill({contentType:'text/html',body:demo.replace(/(<script id="cc-service-registry"[^>]*>).*?(<\/script>)/s,(_,a,b)=>a+json+b).replace('data-cc-show-accept="0"','data-cc-show-accept="'+(legacy?1:0)+'"').replace(/data-cc-category-version-(analytics|marketing|external-content)="0"/g,(_,category)=>'data-cc-category-version-'+category+'="'+versions[category.replaceAll('-','_')]+'"')});
  }
  if(u.pathname.endsWith('cookie-consent.min.js'))return route.fulfill({contentType:'text/javascript',body:bundle});
  if(u.pathname.endsWith('.css'))return route.fulfill({contentType:'text/css',body:''});
  if(u.pathname==='/runtime-test.js')return route.fulfill({contentType:'text/javascript',body:readFileSync(base+'service-runtime.js','utf8')+'\nwindow.__runtime = web86CreateServiceRuntime();'});
  if(u.pathname.endsWith('.js')){requests.push(u.pathname);return route.fulfill({contentType:'text/javascript',body:fixture});}
  return route.fulfill({status:404,body:''});
 });
 await page.goto(origin,{waitUntil:'networkidle'});
 return {ctx,page,requests,errors,external,set:r=>{for(const c of Object.keys(versions))if(processing(r,c)!==processing(registry,c))versions[c]++;registry=r;},close:async()=>{eq(external,[],'All script responses local');eq(errors,[],'No uncaught errors');await ctx.close();}};
}
const runs=page=>page.evaluate(()=>window.__customScriptRuns||[]);
const accept=async page=>{await page.locator('[data-cc-action=accept-all]').click();await page.waitForFunction(()=>window.__customScriptRuns?.length);};
try{
 for(const [name,attributes] of [['legacy-path-only',undefined],['empty-object',{}],['one-key',{'data-key':'public'}],['html-escape-size-expansion',Object.fromEntries(Array.from({length:10},(_,i)=>['data-'+i,'<'.repeat(2048)]))],['multiple-unicode-html',{'data-key':'Ключ 😀 " & </script><script>window.__bad=1</script>','data-domain':'example.test','data-empty':''}]])await test(name,async()=>{
  const s=await session([service('custom','analytics',attributes)]);try{
   eq(s.requests,[],'Strict waits');await accept(s.page);eq((await runs(s.page))[0].attributes,attributes||{},'All attributes at document.currentScript execution');eq((await runs(s.page))[0].async,true);
   await s.page.evaluate(()=>{const c=web86CookieConsent.getConsent();web86Providers.apply(c,'live');web86Providers.apply(c,'live');});await s.page.waitForTimeout(50);eq(s.requests,['/custom.js'],'Repeated apply loads once');eq(await s.page.evaluate(()=>window.__bad),undefined);
  }finally{await s.close();}
 });
 await test('public-validation-and-fingerprint-compatibility',async()=>{
  const s=await session([]);try{
   const result=await s.page.evaluate(base=>{
    const make=a=>({schema:1,services:[{...base,config:{...base.config,...a}}]});
    const fingerprint=a=>web86Providers.validate(make(a))[0].fingerprint;
    const old=fingerprint({});
    const invalid=[null,[],1,'x',{'src':'x'},{'DATA-key':'x'},{'data-Key':'x'},{'data-_key':'x'},{'data-key\n':'x'},{'data-key':1},{'data-key':[]},{'data-key':{}},{'data-key':null},{'data-key':'a\t'},{'data-key':'a\u0085'},{'data-key':'x'.repeat(2049)},{'data-key':'😀'.repeat(513)},Object.fromEntries(Array.from({length:21},(_,i)=>['data-'+i,'x'])),{['data-'+ 'x'.repeat(60)]:'x'}];
    const reject=r=>{try{web86Providers.validate(r);return false;}catch{return true;}};
    const duplicate='{"schema":1,"services":[{"attributes":{"data-key":"a","data-\\u006bey":"b"}}]}';
    let rawReject=false;try{web86CustomJs.parseJson(duplicate);}catch{rawReject=true;}
    const sorted=fingerprint({attributes:{'data-z':'z','data-a':'a'}});
    const other={...base,loader:'google_gtm',config:{id:'GTM-TEST1234',attributes:{'data-key':'x'}}};
    return {old,empty:fingerprint({attributes:{}}),sorted,reordered:fingerprint({attributes:{'data-a':'a','data-z':'z'}}),changed:fingerprint({attributes:{'data-z':'changed','data-a':'a'}}),invalid:invalid.map(attributes=>reject(make({attributes}))),other:reject({schema:1,services:[other]}),duplicate:reject({schema:1,services:[base,{...base,key:'another'}]}),rawReject};
   },service());
   eq(result.old,JSON.stringify([2,'custom_js','analytics','custom',{path:'/custom.js',purpose:'Site statistics'}]),'Exact pre-feature fingerprint');
   eq(result.empty,result.old);eq(result.sorted,result.reordered);eq(result.changed===result.sorted,false);eq(result.invalid.every(Boolean),true);eq(result.other,true);eq(result.duplicate,true);eq(result.rawReject,true);
   // Compare the owning origin's complete provider fingerprints, not just a formula.
   const old=execFileSync('git',['show',(product.endsWith('3')?'origin/modx3':'origin/main')+':'+base+'provider-registry.js'],{encoding:'utf8'});
   const before=await s.page.evaluate(()=>web86Providers.validate({schema:1,services:[{key:'custom',category:'analytics',enabled:true,loader:'custom_js',purpose:'Site statistics',config:{path:'/custom.js'}}]})[0].fingerprint);
   await s.page.addScriptTag({content:old});eq(await s.page.evaluate(()=>web86Providers.validate({schema:1,services:[{key:'custom',category:'analytics',enabled:true,loader:'custom_js',purpose:'Site statistics',config:{path:'/custom.js'}}]})[0].fingerprint),before,'Origin implementation and candidate agree');
  }finally{await s.close();}
 });
 await test('consent-change-reorder-remove-and-unrelated-category',async()=>{
  const s=await session([service(),service('other','marketing')]);try{
   await accept(s.page);await s.page.waitForFunction(()=>__customScriptRuns.length===2);const old=await s.page.evaluate(()=>localStorage.getItem('web86_cookie_consent'));
   s.set({schema:1,services:[service('custom','analytics',{}),service('other','marketing')]});await s.page.reload({waitUntil:'networkidle'});eq(await s.page.evaluate(()=>localStorage.getItem('web86_cookie_consent')),old,'No-attributes upgrade retains raw consent');eq((await runs(s.page)).length,2);
   for(const attributes of [{'data-key':'a'},{'data-key':'b'},{'data-mode':'prod','data-key':'b'},{}]){
    s.set({schema:1,services:[service('custom','analytics',attributes),service('other','marketing')]});await s.page.reload({waitUntil:'networkidle'});
    eq((await runs(s.page)).map(x=>x.path),['/other.js'],'Changed analytics blocked; marketing remains permitted');
    eq(await s.page.evaluate(()=>web86CookieConsent.getConsent().categories),{analytics:false,marketing:true,external_content:true});
    await accept(s.page);await s.page.waitForFunction(()=>__customScriptRuns.length===2);eq((await runs(s.page)).find(x=>x.path==='/custom.js').attributes,attributes);
   }
   s.set({schema:1,services:[service('custom','analytics',{'data-z':'z','data-a':'a'}),service('other','marketing')]});await s.page.reload({waitUntil:'networkidle'});await accept(s.page);const stable=await s.page.evaluate(()=>localStorage.getItem('web86_cookie_consent'));
   s.set({schema:1,services:[service('custom','analytics',{'data-a':'a','data-z':'z'}),service('other','marketing')]});await s.page.reload({waitUntil:'networkidle'});eq(await s.page.evaluate(()=>localStorage.getItem('web86_cookie_consent')),stable,'Order does not invalidate choice');eq((await runs(s.page)).length,2);
  }finally{await s.close();}
 });
 await test('legacy-startup-and-stored-refusal',async()=>{
  const s=await session([service('custom','analytics',{'data-key':'legacy'})],true);try{
   eq((await runs(s.page))[0].attributes,{'data-key':'legacy'},'Legacy no-choice startup retained');
   await s.page.locator('[data-cc-action=reject]').click();await s.page.waitForLoadState('networkidle');await s.page.reload({waitUntil:'networkidle'});eq(await runs(s.page),[],'Stored refusal blocks legacy');
  }finally{await s.close();}
 });
 await test('runtime-url-attribute-conflict-and-no-partial-load',async()=>{
  const s=await session([]);try{
   await s.page.addScriptTag({url:origin+'/runtime-test.js'});
   const result=await s.page.evaluate(async()=>{
    await __runtime.script('/fixture.js',{'data-key':'x','data-empty':''});await __runtime.script('/fixture.js',{'data-empty':'','data-key':'x'});
    const rejected=[];for(const a of [{'data-key':'y'},undefined,{'onload':'x'},{'data-key':null}])try{await __runtime.script('/fixture.js',a);rejected.push(false);}catch{rejected.push(true);}
    await __runtime.script('/old.js');await __runtime.script('/old.js',{});try{await __runtime.script('/old.js',{'data-key':'x'});rejected.push(false);}catch{rejected.push(true);}
    try{await __runtime.script('/invalid.js',{'data-key':'ok','style':'bad'});rejected.push(false);}catch{rejected.push(true);}
    return rejected;
   });eq(result,Array(6).fill(true));eq(s.requests,['/fixture.js','/old.js']);eq((await runs(s.page))[0].attributes,{'data-empty':'','data-key':'x'});
  }finally{await s.close();}
 });
 await test('malformed-public-registry-fails-before-any-service',async()=>{
  for(const bad of ['{"data-key":"x","data-key":"y"}','[]','{"data-key":1}']){
   const raw=JSON.stringify({schema:1,services:[service(),service('other','marketing')]}).replace('"path":"/custom.js"','"path":"/custom.js","attributes":'+bad);
   const s=await session([],true,raw);try{eq(s.requests,[]);eq(await s.page.evaluate(()=>web86Providers.services.length),0);}finally{await s.close();}
  }
 });
}catch(e){console.error(e.stack);process.exitCode=1;}finally{await browser.close();writeFileSync(out+'/browser.json',JSON.stringify({product,tests:results.length,assertions,failed:results.filter(r=>r.result==='FAIL').length,results},null,2)+'\n');}
