import {chromium} from 'playwright';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const repo=new URL('../../../../',import.meta.url).pathname.replace(/\/$/,'');const local=repo+'/.local/modstore-matrix';const cases=JSON.parse(readFileSync(local+'/cases.json'));
const docker=['compose','--env-file',local+'/private/compose.env','-f',local+'/compose.json'];
const cli=(c,...args)=>execFileSync('docker',[...docker,'exec','-T','--user','www-data',c.name,'php','/opt/cc-source/tests/modstore/fixture.php',...args],{encoding:'utf8'});
const browser=await chromium.launch();try{for(const c of cases){cli(c,'cms-paths');const origin='http://127.0.0.1:'+c.port,assets=c.custom?'/files/':'/assets/',product='cookieconsentmanager'+(c.major===3?'3':'');const context=await browser.newContext();const page=await context.newPage();try{
 const credentials=JSON.parse(readFileSync(local+'/'+c.name+'/private/manager.json'));await page.goto(origin+'/manager/');await page.locator('#modx-login-username').fill(credentials.username);await page.locator('#modx-login-password').fill(credentials.password);await page.locator('#modx-login-btn').click();await page.waitForFunction(()=>window.MODx?.siteId);
 await page.goto(origin+'/manager/?a=index&namespace=cookie_consent');await page.locator('#ccm-bundle-rebuild').waitFor({state:'attached'});const token=await page.evaluate(()=>window.MODx.siteId);
 const call=async(path,action)=>{const r=await context.request.post(origin+path,{headers:{modAuth:token,Origin:origin,Referer:origin+'/manager/'},form:{action,HTTP_MODAUTH:token}});assert.equal(r.status(),200);const data=await r.json();assert.equal(data.success,true,JSON.stringify(data));return data.object;};
 const before=await call(assets+'components/'+product+'/connector.php','get');assert.equal(before.assetsUrl,assets);assert.equal(Object.hasOwn(before.catalog,'mock_marketing'),false);
 await page.locator('#ccm-tab-services').click();const sourceText=await page.locator('.ccm-adapter-source').allTextContents();assert.ok(sourceText.some(t=>t.includes(assets+'components/'+product+'/js/cookie-consent/services/')),'Actual configured adapter source URL');
 const force=await call(assets+'components/'+product+'/connector.php','bundle_rebuild');assert.equal(force.state,'ready');assert.equal(force.rebuilt,true);
 cli(c,'probe-start');try{await call('/connectors/index.php','system/clearcache');cli(c,'probe-end');}finally{await call(assets+'components/'+product+'/connector.php','bundle_rebuild');}
 writeFileSync(local+'/'+c.name+'/evidence/manager.json',JSON.stringify({case:c,result:'PASS',checks:['authenticated CMP','configured adapter path','manual rebuild processor','native clearcache processor and OnSiteRefresh']},null,2)+'\n');console.log('PASS '+c.name+' real Manager rebuild and cache clear');
}finally{await context.close();}}}finally{await browser.close();}
