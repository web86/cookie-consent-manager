// Replay TLS-verified real SDK bytes in Chromium, comparing direct install and CMP.
// Public JS is fetched with curl using system certificate trust. Every telemetry
// request is locally answered: no analytics events leave the disposable browser.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {origin,docker} from '../helpers.mjs';
const out='.local/legacy-autoload-evidence';mkdirSync(out,{recursive:true});
const ctl=(a,input)=>docker(['web','php','/opt/cc-source/tests/local/manager-i18n-control.php',...a],input).trim();
const saved=Object.fromEntries(['cookie_consent.options','cookie_consent.services'].map(k=>[k,ctl(['setting',k,'get'])]));
const ids=JSON.parse(docker(['web','php','/opt/cc-source/tests/beta31/fixture.php']));
const b=await chromium.launch(),admin=await b.newContext(),p=await admin.newPage(),results=[],cache=new Map();let n=0,token;
const eq=(a,b,m)=>{n++;assert.deepEqual(a,b,m)},ok=(x,m)=>{n++;assert.ok(x,m)};
const api=async(action,form={})=>(await admin.request.post(origin+'/assets/components/cookieconsent/connector.php',{headers:{modAuth:token},form:{action,HTTP_MODAUTH:token,...form}})).json();
const specimens=[
 {loader:'google_ga4',id:process.env.CC_TEST_GA4_ID||'G-LEGACY0001',config:{send_page_view:true,allow_google_signals:true,allow_ad_personalization_signals:true}},
 {loader:'google_ads',id:process.env.CC_TEST_ADS_ID||'AW-000000000',config:{allow_ad_personalization_signals:true,restricted_data_processing:false}},
 {loader:'google_gtm',id:process.env.CC_TEST_GTM_ID||'GTM-LEGACY0001',config:{}},
 {loader:'yandex',id:process.env.CC_TEST_YANDEX_ID||'999999999',config:{webvisor:true,clickmap:true,trackLinks:true,accurateTrackBounce:true}}
];
function download(url){if(!cache.has(url)){
 const output=execFileSync('curl',['--silent','--show-error','--location','--max-time','25','--write-out','\n%{http_code}',url],{encoding:'utf8',maxBuffer:8*1024*1024});
 const i=output.lastIndexOf('\n'),body=output.slice(0,i),status=Number(output.slice(i+1));cache.set(url,{status,body,sha256:createHash('sha256').update(body).digest('hex')});
 }return cache.get(url)}
function sdkUrl(s){return s.loader==='yandex'?'https://mc.yandex.ru/metrika/tag.js':`https://www.googletagmanager.com/${s.loader==='google_gtm'?'gtm.js':'gtag/js'}?id=${s.id}`}
function direct(s){const url=JSON.stringify(sdkUrl(s)),id=JSON.stringify(s.id),config=JSON.stringify(s.config);
 const init=s.loader==='yandex'?`window.ym=function(){(ym.a=ym.a||[]).push(arguments)};ym.l=Date.now();ym(Number(${id}),'init',${config});`:s.loader==='google_gtm'?`window.dataLayer=window.dataLayer||[];dataLayer.push({'gtm.start':Date.now(),event:'gtm.js'});`:`window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments)};gtag('js',new Date());gtag('config',${id},${config});`;
 return `<!doctype html><html><head><meta charset="UTF-8"><title>SDK comparison</title></head><body><script>${init}const el=document.createElement('script');el.async=true;el.src=${url};document.head.appendChild(el);</script></body></html>`;
}
async function run(s,html,mode,existing){const ctx=await b.newContext(),page=await ctx.newPage(),requests=[],snapshots=[],scripts=[],errors=[];
 if(existing)await ctx.addInitScript(value=>{window.dataLayer=[];window.gtag=function(){dataLayer.push(arguments)};gtag('consent','default',{analytics_storage:value,ad_storage:value,ad_user_data:value,ad_personalization:value});},existing);
 page.on('pageerror',e=>errors.push(e.message));
 await ctx.route('**/*',async route=>{const req=route.request(),u=new URL(req.url());
  if(u.origin===origin){if(req.isNavigationRequest())return route.fulfill({contentType:'text/html',body:html});if(u.pathname.endsWith('/audit.php'))await new Promise(resolve=>setTimeout(resolve,350));return route.continue()}
  const permitted=req.resourceType()==='script'&&((u.origin==='https://www.googletagmanager.com'&&['/gtag/js','/gtag/destination','/gtm.js'].includes(u.pathname)&&u.searchParams.get('id')===s.id)||u.href==='https://mc.yandex.ru/metrika/tag.js');
  if(permitted){const sdk=download(u.href);scripts.push({url:u.href,status:sdk.status,sha256:sdk.sha256});
   snapshots.push(await page.evaluate(()=>({google:(window.dataLayer||[]).map(x=>x.event?x:Array.from(x)),yandex:(window.ym?.a||[]).map(x=>Array.from(x))})));
   return route.fulfill({status:sdk.status,contentType:'application/javascript',body:sdk.body});
  }
  requests.push({host:u.hostname,path:u.pathname.replace(/\/[0-9]+(?=\/|$)/g,'/:id'),event:u.searchParams.get('en'),type:req.resourceType()});
  return route.fulfill({status:204,body:''});
 });
 await page.goto(origin+'/legacy-sdk-compare?gclid=TEST-LEGACY',{waitUntil:'domcontentloaded'});await page.waitForTimeout(3000);
 const initialized=await page.evaluate(s=>{if(s.loader==='yandex')return typeof window.Ya?.Metrika2==='function';return Boolean(window.google_tag_manager?.[s.id])},s);
 const cookies=(await ctx.cookies()).filter(c=>/^_(?:ga|gcl|ym)/.test(c.name)).map(c=>({name:c.name,secure:c.secure,httpOnly:c.httpOnly,sameSite:c.sameSite})).sort((a,b)=>a.name.localeCompare(b.name));
 const consentState=await page.evaluate(()=>Object.fromEntries(['analytics_storage','ad_storage','ad_user_data','ad_personalization'].map(k=>{const e=window.google_tag_data?.ics?.entries?.[k];return[k,e?{default:e.default,update:e.update}:null]})));
 const commands=await page.evaluate(()=>Array.from(window.dataLayer||[]).filter(x=>x[0]==='consent').map(x=>[x[1],x[2]]));
 let clientId=null;if(s.loader==='yandex')clientId=await page.evaluate(id=>new Promise(resolve=>{ym(Number(id),'getClientID',resolve);setTimeout(()=>resolve(null),500)}),s.id);
 const initialRequests=[...requests];let rejection=null;
 if(mode==='cmp'){
  eq(await page.evaluate(()=>web86CookieConsent.getConsent()),null);eq(await page.evaluate(()=>localStorage.getItem('web86_cookie_consent')),null);
  await page.evaluate(()=>web86CookieConsent.onAllowed('analytics',guard=>window.__guard=guard));
  const before=scripts.filter(x=>x.url===sdkUrl(s)).length,nav=page.waitForNavigation({waitUntil:'networkidle'});
  eq(await page.evaluate(()=>{document.querySelector('[data-cc-action=reject]').click();return __guard()}),false,'Real SDK session loses managed permission immediately');
  await page.waitForTimeout(90);
  if(s.loader!=='yandex')eq(await page.evaluate(()=>['analytics_storage','ad_storage','ad_user_data','ad_personalization'].map(k=>google_tag_data.ics.entries[k]?.update)),[false,false,false,false],'Real Google runtime receives explicit denial');
  await nav;await page.waitForTimeout(150);eq(scripts.filter(x=>x.url===sdkUrl(s)).length,before,'No CMP SDK bootstrap after rejected reload: '+JSON.stringify(scripts.map(x=>x.url)));eq(await page.evaluate(s=>s.loader==='yandex'?typeof window.Ya?.Metrika2==='function':Boolean(window.google_tag_manager?.[s.id]),s),false,'Actual SDK absent in the rejected document');eq(await page.evaluate(()=>web86CookieConsent.getConsent().categories.analytics),false);rejection={guard:false,reloaded:true,newCMPBootstraps:0,runtimeInactiveAfterReload:true};
 }

 const requestKinds=[...new Set(initialRequests.map(r=>`${r.host}${r.path}:${r.event||''}`))].sort();
 await ctx.close();return{mode,initialized,cookies,commands,snapshots,scripts,requests:initialRequests.length,requestKinds,clientId:clientId?true:false,consentState,rejection,errors};}
try{
 await admin.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());const creds=JSON.parse(docker(['web','php','/opt/cc-source/tests/transport/control.php','credentials','/opt/cc-private']));await p.goto(origin+'/manager/');await p.locator('#modx-login-username').fill(creds.username);await p.locator('#modx-login-password').fill(creds.password);await p.locator('#modx-login-btn').click();await p.waitForFunction(()=>window.MODx?.siteId);token=await p.evaluate(()=>MODx.siteId);
 for(const {s,existing} of specimens.flatMap(s=>(s.loader==='yandex'?[null]:[null,'denied','granted']).map(existing=>({s,existing})))){const name=s.loader+'-'+(existing||'no-site-consent'),start=n;try{
  const sdk=download(sdkUrl(s));if(sdk.status!==200){results.push({name,result:'SKIP',reason:'Public SDK/container unavailable for synthetic ID (HTTP '+sdk.status+'); no owned test ID provided'});console.log('SKIP '+s.loader+' HTTP '+sdk.status);continue;}
  const g=(await api('get')).object,draft=Object.fromEntries(['options','registry','texts','log_dir','audit_config_file'].map(k=>[k,structuredClone(g[k])]));
  draft.options.buttons={reject:true,configure:false,accept_all:false,accept:true};draft.options.categories={analytics:true,marketing:false,external_content:false};
  // Deliberately assign Ads/GTM to analytics with marketing hidden. Legacy must
  // retain ordinary options, without resurrecting hardcoded adapter categories.
  draft.registry={schema:1,services:[{key:'test_service',loader:s.loader,category:'analytics',enabled:true,name,purpose:'SDK parity test',config:{id:s.id,...s.config}}]};eq((await api('save',{revision:g.revision,draft:JSON.stringify(draft)})).success,true);
  const html=await(await admin.request.get(origin+'/?id='+ids.split)).text();
  const a=await run(s,direct(s),'direct',existing),c=await run(s,html,'cmp',existing);
  ok(a.initialized,'Actual direct SDK initialized');eq(c.initialized,a.initialized,'Actual SDK initialization parity');eq(c.cookies,a.cookies,'Same real first-party cookie names and attributes');eq(c.commands,a.commands,'No CMP Consent Mode restrictions');eq(c.commands.length,existing?1:0);eq(c.consentState,a.consentState,'Actual SDK preserves independent site consent state');
  eq(c.requestKinds.filter(x=>!x.startsWith('www.googletagmanager.com/td:')),a.requestKinds.filter(x=>!x.startsWith('www.googletagmanager.com/td:')),'Same processing request kinds (sporadic /td recorded separately)');eq(c.errors,a.errors,'No additional CMP SDK errors');
  if(s.loader==='yandex'){eq(c.clientId,a.clientId,'Actual getClientID callback parity');ok(c.clientId,'Real SDK returns a client ID');eq(c.snapshots[0].yandex[0].slice(0,3),a.snapshots[0].yandex[0].slice(0,3));}
  else if(s.loader!=='google_gtm'){eq(c.snapshots[0].google.find(x=>x[0]==='config'),a.snapshots[0].google.find(x=>x[0]==='config'),'Ordinary config unmodified');}
  if(s.loader==='google_ga4'){if(existing!=='denied')ok(a.cookies.some(x=>x.name==='_ga'),'Real GA4 writes _ga');else eq(a.cookies.some(x=>x.name==='_ga'),false,'Independent denied is respected');ok(c.requests>0,'Actual GA4 makes collection requests');}
  if(s.loader==='google_ads')ok(c.requests>0,'Actual Ads attempts requests');
  results.push({name,result:'PASS',assertions:n-start,direct:a,legacy:c});console.log('PASS real '+name+' direct/CMP cookies/init/requests');
 }catch(e){results.push({name,result:'FAIL',assertions:n-start,error:e.stack});console.error('FAIL '+name+': '+e.message);process.exitCode=1;}}
}catch(e){console.error(e.stack);process.exitCode=1}finally{await b.close();for(const[k,v]of Object.entries(saved))ctl(['setting',k],v);writeFileSync(out+'/direct-vendors.json',JSON.stringify({tests:results.length,assertions:n,failed:results.filter(x=>x.result==='FAIL').length,skipped:results.filter(x=>x.result==='SKIP').length,telemetry:'Locally answered; public JS downloaded over verified TLS and replayed unchanged',results},null,2)+'\n')}
