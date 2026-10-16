import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {cli} from '../modx3/helpers.mjs';
const ctl=(...a)=>JSON.parse(cli('clean',['php','/opt/cc-source/tests/modx3-beta3/control.php',...a]));
const origin='http://127.0.0.1:20889',ids=ctl('pages','20889'),offset=ctl('log-size'),browser=await chromium.launch(),ctx=await browser.newContext();
await ctx.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
const results=[];try{
 for(const mode of ['standard-split','fenom-split']){const p=await ctx.newPage();const r=await p.goto(`${origin}/beta3.php?ctx=beta3-en&id=${ids.en[mode]}`,{waitUntil:'networkidle'});const body=await r.text();results.push({name:'beta2-Fenom-full-brace-'+mode,http:r.status(),bytes:Buffer.byteLength(body),registryCount:await p.locator('#cc-service-registry').count(),readyCount:await p.locator('#fixture-ready').count()});await p.close();}
 const log=ctl('log',String(offset));assert.match(log,/Unexpected token.*:/s,'Actual beta2 JSON Fenom compile error');assert.ok(results.some(r=>r.readyCount===0),'Actual blank page reproduction');
 const payload={schema:2,event_id:randomUUID(),consent_id:randomUUID(),event:'accept_all',stage:'committed',analytics:true,marketing:false,external_content:true,providers:{yandex:true,mailru:true,yandex_maps:true},provider:null,policy_version:'1',page:'/',timestamp:new Date().toISOString()};
 const r=await fetch(origin+'/assets/components/cookieconsent/audit.php',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(payload)}),body=await r.json();assert.equal(r.status,400);assert.equal(body.error,'invalid_payload');assert.equal(ctl('record',payload.event_id).records.length,0);results.push({name:'beta2-hidden-marketing-production-audit-reproduction',http:r.status,body,event_id:payload.event_id});
 writeFileSync('.local/modx3/evidence/beta3-baseline.json',JSON.stringify({result:'PASS',results,fenomErrorExcerpt:log.match(/.{0,100}Unexpected token.{0,140}/s)?.[0],metadata:ctl('metadata')},null,2)+'\n');console.log(JSON.stringify(results));
}finally{await ctx.close();await browser.close();}
