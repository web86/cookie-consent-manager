import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
const origin='http://127.0.0.1:18989', endpoint=origin+'/assets/components/cookieconsent/audit.php', container='cookie-consent-acceptance-audit-visibility-1';
const out='.local/audit-visibility/evidence';mkdirSync(out,{recursive:true});
const ctl=(...args)=>execFileSync('docker',['exec',container,'php','/opt/cc-source/tests/audit-visibility/control.php',...args],{encoding:'utf8'}).trim();
const ids=JSON.parse(ctl('setup')), metadata=JSON.parse(ctl('metadata'));
const results=[];let assertions=0;const eq=(a,b,m)=>{assertions++;assert.deepEqual(a,b,m);};
const test=async(name,fn)=>{const before=assertions;try{const evidence=await fn();results.push({name,result:'PASS',assertions:assertions-before,...evidence});console.log('PASS '+name);}catch(e){results.push({name,result:'FAIL',error:e.message});throw e;}};
const record=id=>JSON.parse(ctl('records',id));
const event=()=>({schema:2,event_id:randomUUID(),consent_id:randomUUID(),event:'accept_all',stage:'committed',analytics:true,marketing:false,external_content:true,providers:{yandex:true,mailru:true,yandex_maps:true},provider:null,policy_version:'1',page:'/',timestamp:new Date().toISOString()});
async function post(e,headers={}){const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,'Sec-Fetch-Site':'same-origin',...headers},body:JSON.stringify(e)});return{status:r.status,body:await r.json()};}
async function runtime(mode){ctl('runtime',mode);execFileSync('docker',['restart',container],{stdio:'pipe'});for(let i=0;i<40;i++){try{if((await fetch(endpoint)).status===405)return;}catch{}await delay(200);}throw Error('Local server did not restart');}
const browser=await chromium.launch();
async function session(){
 const context=await browser.newContext(), external=[],errors=[];
 await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin===origin)return r.continue();external.push(r.request().url());return r.fulfill({contentType:r.request().resourceType()==='document'?'text/html':'application/javascript',body:''});});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));return{context,page,external,errors};
}
async function navigate(s,lang,mode){const r=await s.page.goto(`${origin}/fenom.php?ctx=fenom-${lang}&id=${ids[lang][mode]}`,{waitUntil:'networkidle'});eq(r.status(),200);eq(await s.page.locator('#cookie-block').count(),1);eq(await s.page.locator('#cc-service-registry').count(),1);}
async function browserAccept(s,visible,expectedProviders){
 const response=s.page.waitForResponse(r=>r.url()===endpoint&&r.request().postDataJSON()?.event==='accept_all');
 await s.page.locator('[data-cc-action=accept-all]').click();const ack=await response,payload=ack.request().postDataJSON(),body=await ack.json();
 eq(ack.status(),200,'Actual HTTP receiver accepts browser event');eq(body.ok,true);eq(body.event_id,payload.event_id,'ACK matches exact event ID');
 for(const[c,v]of Object.entries(visible))eq(payload[c],v,'Browser grants only visible category '+c);
 eq(payload.providers,expectedProviders,'Exact enabled and visible provider permissions');eq(payload.provider,null);
 const stored=record(payload.event_id);eq(stored.records.length,1,'Physically appended exactly one monthly JSONL event');
 eq(stored.file,new Date().toISOString().slice(0,7)+'-cookie-consent.log');
 const r=stored.records[0];eq(r.event,'accept_all');eq(r.event_id,payload.event_id);eq(r.consent_id,payload.consent_id);eq(r.providers,payload.providers);
 for(const[c,v]of Object.entries(visible))eq(r.categories[c],v,'Persisted category '+c);
 eq(s.errors,[]);return{status:ack.status(),event_id:body.event_id,monthlyFile:stored.file};
}
try{
 ctl('registry','production');ctl('visibility','5');await runtime('baseline');
 await test('reproduced-production-400-without-a-log-write',async()=>{const e=event(),before=record(e.event_id).bytes,r=await post(e);eq(r,{status:400,body:{ok:false,error:'invalid_payload'}});eq(record(e.event_id).records,[]);eq(record(e.event_id).bytes,before);return{status:r.status};});
 await runtime('fixed');
 await test('exact-production-payload-200-ACK-and-physical-log',async()=>{const e=event(),r=await post(e);eq(r.status,200);eq(r.body.ok,true);eq(r.body.event_id,e.event_id);const stored=record(e.event_id);eq(stored.records.length,1);eq(stored.records[0].categories,{necessary:true,analytics:true,marketing:false,external_content:true});eq(stored.records[0].providers,e.providers);eq((await post(e)).status,409,'Replay protection retained');eq(record(e.event_id).records.length,1);return{response:r,monthlyFile:stored.file};});
 for(const lang of ['ru','en'])for(const mode of ['standard-split','fenom-split','fenom-legacy'])await test(`production-browser-${lang}-${mode}-cold-warm`,async()=>{
  ctl('clear');const sources=[],acks=[];
  for(let warm=0;warm<2;warm++){
   const s=await session();try{await navigate(s,lang,mode);const source=await s.page.locator('#cache-source').textContent();sources.push(source);eq(source,warm?'cache':'database');eq(s.external,[],'No vendor requests before consent');
    acks.push(await browserAccept(s,{analytics:true,marketing:false,external_content:true},{yandex:true,mailru:true,yandex_maps:true}));
    eq(await s.page.locator('[data-cc-category-row=marketing]').getAttribute('hidden'),'','Marketing stays hidden');
   }finally{await s.context.close();}
  }return{sources,acks};
 });
 ctl('registry','all');
 for(let mask=0;mask<8;mask++)await test(`visibility-mask-${mask}-Fenom-cold-warm`,async()=>{
  ctl('visibility',String(mask));const visible={analytics:Boolean(mask&1),marketing:Boolean(mask&2),external_content:Boolean(mask&4)},providers={yandex:visible.analytics,mailru:visible.analytics,google_ads:visible.marketing,yandex_maps:visible.external_content};
  const sources=[];for(let warm=0;warm<2;warm++){const s=await session();try{await navigate(s,'en','fenom-split');const source=await s.page.locator('#cache-source').textContent();sources.push(source);eq(source,warm?'cache':'database');eq(s.external,[]);await browserAccept(s,visible,providers);}finally{await s.context.close();}}
  return{visible,sources};
 });
 ctl('registry','production');ctl('visibility','5');
 await test('forged-and-inconsistent-events-rejected-with-no-append',async()=>{
  const cases=[e=>{e.marketing=true;},e=>{e.analytics=false;},e=>{e.external_content=false;},e=>{e.providers.yandex=false;},e=>{delete e.providers.mailru;},e=>{e.providers.google_ads=true;},e=>{e.providers.unknown=false;},e=>{e.providers.yandex='true';},e=>{e.categoryVisibility={analytics:true,marketing:false,external_content:true};},e=>{e.stage='draft';},e=>{e.provider='yandex';},e=>{e.event_id='forged';}];
  for(const change of cases){const e=event();change(e);const before=record(e.event_id).bytes,r=await post(e);eq(r.status,400);eq(r.body,{ok:false,error:'invalid_payload'});eq(record(e.event_id).records.length,0);eq(record(e.event_id).bytes,before);}
  const e=event();eq((await post(e,{Origin:'https://forged.test'})).status,403);eq(record(e.event_id).records.length,0);
 });
 await test('fresh-system-visibility-overrides-cached-page',async()=>{
  const s=await session();try{
   await navigate(s,'en','fenom-split');await navigate(s,'en','fenom-split');eq(await s.page.locator('#cache-source').textContent(),'cache');
   ctl('visibility','1','stale'); // No cache clear: old page allowed Maps, authoritative DB now hides it.
   const e=event();const r=await post(e);eq(r.status,400);eq(record(e.event_id).records,[]);
   e.external_content=false;e.providers.yandex_maps=false;const corrected=await post(e);eq(corrected.status,200);eq(corrected.body.event_id,e.event_id);
   eq(record(e.event_id).records[0].categories.external_content,false);
  }finally{await s.context.close();ctl('visibility','5');}
 });
 await test('system-visibility-cannot-be-overridden-by-context',async()=>{
  ctl('visibility','7');ctl('context-visibility','5');try{const e=event();eq((await post(e)).status,400);eq(record(e.event_id).records,[]);e.marketing=true;const r=await post(e);eq(r.status,200);eq(r.body.event_id,e.event_id);eq(record(e.event_id).records[0].categories.marketing,true);}finally{ctl('visibility','5');ctl('context-visibility','0');}
 });
 await test('legacy-options-fallback-and-schema-1-compatibility-over-HTTP',async()=>{
  ctl('visibility','5','legacy');const e=event();const r=await post(e);eq(r.status,200);eq(r.body.event_id,e.event_id);eq(record(e.event_id).records.length,1);
  const legacy=event();delete legacy.schema;delete legacy.external_content;delete legacy.providers;delete legacy.provider;legacy.marketing=true;
  const old=await post(legacy);eq(old.status,200);eq(old.body.event_id,legacy.event_id);eq(record(legacy.event_id).records[0].schema,1);
  legacy.event_id=randomUUID();legacy.marketing=false;eq((await post(legacy)).status,400);eq(record(legacy.event_id).records.length,0);
 });
}catch(e){console.error(e);process.exitCode=1;}finally{
 ctl('visibility','5');ctl('registry','production');await runtime('fixed');await browser.close();
 const report={suite:'Genuine MODX 2 visibility-aware audit HTTP/browser/JSONL',metadata,tests:results.length,assertions,failed:results.filter(r=>r.result==='FAIL').length,production:'NOT RUN: no production access supplied; exact reported selection reproduced locally',network:'Vendor requests intercepted locally; audit POSTs reach genuine endpoint and write actual files',results};
 writeFileSync(out+'/results.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({tests:report.tests,assertions,failed:report.failed}));
}
