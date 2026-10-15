import {chromium} from 'playwright';import {manager,cli} from './helpers.mjs';import assert from 'node:assert/strict';import {readFileSync,writeFileSync} from 'node:fs';
const browser=await chromium.launch(),results=[];let assertions=0;const meta=JSON.parse(readFileSync('_build/package.json')),signature=meta.name+'-'+meta.version+'-'+meta.release+meta.release_index;
for(const language of ['en','ru']){const s=await manager(browser,'web',language);try{
 await s.p.goto(s.origin+'/manager/?a=index&namespace=cookie_consent');await s.p.locator('#ccm-save').waitFor();
 const r=await s.api('get');assertions+=2;assert.equal(r.success,true);assert.equal(r.object.managerLanguage,language);
 const preview=s.p.frameLocator('#ccm-preview-frame');await preview.locator('section.cookie-warning .cookie-warning-text').waitFor();
 assert.ok((await preview.locator('.cookie-warning-text').textContent()).length>20);assertions++;
 await s.p.screenshot({path:'.local/modx3/evidence/final-manager-'+language+'.png',fullPage:true});
 const pkg=await s.core('workspace/packages/get',{signature});assert.ok(pkg.success&&pkg.object.installed);assertions++;
 cli('web',['php','/opt/cc-source/tests/modx3/guard.php']);assertions++;
 results.push({name:signature+'-manager-preview-'+language+'-aliases-off',result:'PASS'});console.log('PASS '+language);
}catch(e){results.push({name:language,result:'FAIL',error:e.message});console.error(e.message);process.exitCode=1;}finally{await s.ctx.close();}}
await browser.close();writeFileSync('.local/modx3/evidence/final.json',JSON.stringify({signature,tests:results.length,assertions,failed:results.filter(x=>x.result==='FAIL').length,results},null,2));
