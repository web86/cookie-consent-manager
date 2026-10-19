import {chromium} from 'playwright';
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const local=process.env.CC_UNINSTALL_LOCAL||'.local/uninstall3',sig=process.env.CC_UNINSTALL_SIGNATURE||'cookieconsentmanager3-1.0.8-pl6';
const b=await chromium.launch();
for(const c of JSON.parse(readFileSync(local+'/cases.json'))){const f=local+'/'+c.name,origin='http://127.0.0.1:'+c.port,ctx=await b.newContext(),p=await ctx.newPage();try{
 const cred=JSON.parse(readFileSync(f+'/private/manager.json'));await p.goto(origin+'/manager/');await p.locator('#modx-login-username').fill(cred.username);await p.locator('#modx-login-password').fill(cred.password);await p.locator('#modx-login-btn').click();await p.waitForFunction(()=>window.MODx?.siteId);const token=await p.evaluate(()=>MODx.siteId),topic='/workspace/package/uninstall/'+sig+'/verification/';
 const request=async form=>ctx.request.post(origin+'/connectors/index.php',{headers:{modAuth:token,Origin:origin,Referer:origin+'/manager/'},form:{HTTP_MODAUTH:token,...form},timeout:120000});
 assert.equal((await(await request({action:'workspace/packages/uninstall',signature:sig,register:'mgr',topic})).json()).success,true);
 const body=JSON.stringify(await(await request({action:'system/console',register:'mgr',topic,show_filename:0,message_limit:2000})).json());
 assert.ok(body.includes('preserved changed/unknown shipped file'));assert.ok(body.includes('preserved unowned object'));assert.ok(body.includes('preserved category containing third-party elements'));
 writeFileSync(f+'/evidence/console.json',JSON.stringify({result:'PASS',assertions:4,warnings_visible:true,messages:body},null,2)+'\n');console.log('PASS '+c.name+' native-console-warnings');
}finally{await ctx.close();}}
await b.close();
