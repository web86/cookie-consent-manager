import {chromium} from 'playwright';import assert from 'node:assert/strict';import {origin,docker,evidence} from './helpers.mjs';
docker(['web','php','/opt/cc-source/tests/local/restricted-manager.php']);const c=JSON.parse(docker(['web','php','-r','echo file_get_contents("/opt/cc-private/restricted-manager.json");']));
const b=await chromium.launch();const ctx=await b.newContext();await ctx.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());const p=await ctx.newPage();
let assertions=0;const eq=(a,b)=>{assertions++;assert.deepEqual(a,b);};
try{await p.goto(origin+'/manager/',{waitUntil:'networkidle'});await p.locator('#modx-login-username').fill(c.username);await p.locator('#modx-login-password').fill(c.password);await p.locator('#modx-login-btn').click();await p.waitForTimeout(700);
 await p.waitForFunction(()=>typeof window.MODx?.siteId==='string'&&MODx.siteId.length>0);
 const token=await p.evaluate(()=>MODx.siteId);eq(typeof token==='string'&&token.length>0,true);
 const result=await p.evaluate(async token=>{const r=await fetch('/assets/components/cookieconsent/connector.php',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','modAuth':token},body:new URLSearchParams({action:'get',HTTP_MODAUTH:token})});return r.json();},token);eq(result.success,false);eq(result.object?.code===401,false);
 const denied=await ctx.request.post(origin+'/assets/components/cookieconsent/connector.php',{headers:{modAuth:token},form:{action:'bundle_rebuild',HTTP_MODAUTH:token}});eq((await denied.json()).success,false,'Rebuild requires cookie_consent_manage');
 await p.goto(origin+'/manager/?a=index&namespace=cookie_consent',{waitUntil:'networkidle'});eq(await p.locator('#ccm-save').count(),0);
 evidence('manager-permissions-results',{tests:1,assertions,failed:0,results:[{name:'authenticated-mgr-without-component-permission-denied',result:'PASS'}]});console.log(`PASS limited mgr permission (${assertions} assertions)`);
}catch(e){evidence('manager-permissions-results',{tests:1,assertions,failed:1,error:e.message});console.error(e.message);process.exitCode=1;}finally{await b.close();}
