import {chromium} from 'playwright';import {manager,control} from './helpers.mjs';import {writeFileSync,mkdirSync} from 'node:fs';import assert from 'node:assert/strict';
const signature=process.argv[2]||'cookieconsent3-0.1.0-beta1',folder=process.argv[3]||'.local/modx3/artifacts/beta1-a';
const browser=await chromium.launch(),results=[];let assertions=0;
for(const service of ['web','clean']){const s=await manager(browser,service);try{
 const before=service==='clean'?control(service,'seed'):control(service,'snapshot');
 const install=await s.install(signature,folder);assertions++;assert.equal(install.result.success,true);
 const after=control(service,'snapshot');assertions++;assert.equal(Object.keys(after.elements).length,5);
 if(service==='clean'){for(const name of Object.keys(before.elements)){assertions+=4;assert.equal(after.elements[name].id,before.elements[name].id);assert.deepEqual(after.elements[name].metadata,before.elements[name].metadata);assert.equal(after.elements[name].count,1);assert.equal(after.elements[name].static,false);}for(const[key,hash]of Object.entries(before.relations)){assertions++;assert.equal(after.relations[key],hash);}}
 await s.p.goto(s.origin+'/manager/?a=index&namespace=cookie_consent');await s.p.locator('#ccm-save').waitFor();assertions++;assert.equal((await s.api('get')).success,true);
 results.push({name:service==='web'?(Object.keys(before.elements).length?'native-reinstall-aliases-off':'native-fresh-install-aliases-off'):'native-install-over-five-owner-elements-retains-metadata-relations',result:'PASS',before,after});
 mkdirSync('.local/modx3/evidence',{recursive:true});await s.p.screenshot({path:'.local/modx3/evidence/install-'+service+'.png',fullPage:true});
 console.log('PASS '+service+' native install');
}catch(e){results.push({name:service,result:'FAIL',error:e.message});process.exitCode=1;console.error(e.message);}finally{await s.ctx.close();}}
await browser.close();writeFileSync('.local/modx3/evidence/install.json',JSON.stringify({signature,tests:results.length,assertions,failed:results.filter(r=>r.result==='FAIL').length,results},null,2));
