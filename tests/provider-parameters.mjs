import {chromium} from 'playwright';import assert from 'node:assert/strict';import {origin,registry,evidence} from './helpers.mjs';
let assertions=0;const results=[];const eq=(a,b)=>{assertions++;assert.deepEqual(a,b);};
const html=await(await fetch(origin)).text();const config=structuredClone(registry);
config.services[0].config={id:'12345678',clientId:false,webvisor:true,clickmap:false,trackLinks:false,accurateTrackBounce:false};
config.services.find(s=>s.loader==='google_ga4').config={id:'G-MOCK1234',send_page_view:false,allow_google_signals:true,allow_ad_personalization_signals:true};
config.services.find(s=>s.loader==='google_ads').config={id:'AW-12345678',allow_ad_personalization_signals:false,restricted_data_processing:true};
const body=html.replace(/(<script type="application\/json" id="cc-service-registry">)[\s\S]*?(<\/script>)/,'$1'+JSON.stringify(config)+'$2').replaceAll('data-cc-mode="mock"','data-cc-mode="live"');
const b=await chromium.launch();
for(const [name,selected]of [['yandex-options',['yandex']],['ga-privacy-without-marketing',['google_ga4']],['ga-ads-options',['google_ga4','google_ads']],['gtm-only-blocked',['google_gtm']]]){
 const ctx=await b.newContext();const external=[];await ctx.route('**/*',r=>{const url=r.request().url();if(url===origin+'/')return r.fulfill({contentType:'text/html',body});if(new URL(url).origin===origin)return r.continue();external.push(url);return r.fulfill({contentType:'text/javascript',body:'/* local SDK stub */'});});const p=await ctx.newPage();
 try{await p.goto(origin,{waitUntil:'networkidle'});eq(external,[]);await p.locator('[data-cc-action=configure]').click();for(const s of selected)await p.locator(`[data-cc-provider=${s}]`).check();await p.locator('[data-cc-action=save]').click();await p.waitForTimeout(150);
 if(name==='yandex-options'){const calls=await p.evaluate(()=>window.ym.a.map(a=>Array.from(a)));const init=calls.find(c=>c[1]==='init');eq(init[0],12345678);eq(init[2],{webvisor:true,clickmap:false,trackLinks:false,accurateTrackBounce:false});eq(calls.some(c=>c[1]==='getClientID'),false);}
 if(name.startsWith('ga-')){const calls=await p.evaluate(()=>window.dataLayer.map(a=>Array.from(a)));const ga=calls.find(c=>c[0]==='config'&&c[1]==='G-MOCK1234')[2];eq(ga.send_page_view,false);eq(ga.allow_google_signals,name==='ga-ads-options');eq(ga.allow_ad_personalization_signals,name==='ga-ads-options');if(name==='ga-ads-options'){const ads=calls.find(c=>c[0]==='config'&&c[1]==='AW-12345678')[2];eq(ads.restricted_data_processing,true);eq(ads.allow_ad_personalization_signals,false);eq(external.filter(u=>u.includes('gtag/js')).length,1);}}
 if(name==='gtm-only-blocked')eq(external,[]);
 results.push({name,result:'PASS',interceptedRequests:external.length});console.log('PASS '+name);
 }catch(e){results.push({name,result:'FAIL',error:e.message});console.log('FAIL '+name,e.message);}finally{await ctx.close();}
}
await b.close();evidence('provider-parameters-results',{tests:results.length,assertions,failed:results.filter(r=>r.result==='FAIL').length,results});if(results.some(r=>r.result==='FAIL'))process.exitCode=1;
