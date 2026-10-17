import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const local=process.env.CC_MATRIX_DIRECTORY||'.local/modx2-compatibility',expectedVersion=process.env.CC_MATRIX_EXPECTED_VERSION||'1.0.8-pl3',b=await chromium.launch();
try{for(const name of process.argv.slice(2)){
 const c=JSON.parse(readFileSync(local+'/cases.json')).find(c=>c.name===name),f=local+'/'+name,origin='http://127.0.0.1:'+c.port;
 let n=0;const eq=(a,v)=>{n++;assert.deepEqual(a,v)};
 const cli=(op)=>JSON.parse(execFileSync('docker',['compose','--env-file',f+'/private/compose.env','-f',f+'/compose.yaml','exec','-T','web','php','/opt/cc-source/tests/modx2-compatibility/fixture.php',op],{encoding:'utf8'}));
 const info=cli('info');eq(info.modx,'2.8.8-pl');eq(info.xpdo,'2.8.6-pl');const original=JSON.parse(readFileSync(f+'/evidence/cms-before.json'));eq(cli('snapshot'),original);const legacy=JSON.parse(original.settings['cookie_consent.options']).buttons.accept;
 const ctx=await b.newContext();await ctx.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.fulfill({contentType:r.request().resourceType()==='document'?'text/html':'application/javascript',body:''}));
 await ctx.addInitScript(()=>{window.__upgradeDeliveries=[];addEventListener('web86:consent-audit-delivery',e=>__upgradeDeliveries.push(e.detail));});
 const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 for(const cold of [true,false]){
  await p.goto(origin,{waitUntil:'networkidle'});eq(await p.locator('[data-cc-map-provider] iframe,[data-cc-embed] iframe').count(),legacy?6:0);
  await p.locator(legacy?'[data-cc-action=accept]':'[data-cc-action=accept-all]').click();await p.waitForFunction(()=>window.__matrixCustom===1);await p.waitForFunction(()=>__upgradeDeliveries.some(e=>e.ok));const ack=await p.evaluate(()=>__upgradeDeliveries.find(e=>e.ok));eq(cli('audit-ids').includes(ack.event_id),true);eq(await p.locator('[data-cc-map-provider] iframe,[data-cc-embed] iframe').count(),6);
  const raw=await p.evaluate(()=>localStorage.getItem('web86_cookie_consent'));await p.reload({waitUntil:'networkidle'});eq(await p.evaluate(()=>localStorage.getItem('web86_cookie_consent')),raw);
  cli('cache');await p.reload({waitUntil:'networkidle'});eq(await p.locator('[data-cc-map-provider] iframe,[data-cc-embed] iframe').count(),6);
  await p.evaluate(()=>web86CookieConsent.openSettings());for(const k of ['analytics','marketing','external_content'])await p.locator('[data-cc-category='+k+']').uncheck();await Promise.all([p.waitForNavigation({waitUntil:'networkidle'}),p.locator('[data-cc-action=save]').click()]);eq(await p.locator('[data-cc-map-provider] iframe,[data-cc-embed] iframe').count(),0);
  await p.evaluate(()=>localStorage.removeItem('web86_cookie_consent'));
 }
 const credentials=JSON.parse(readFileSync(f+'/private/manager.json'));await p.goto(origin+'/manager/');await p.locator('#modx-login-username').fill(credentials.username);await p.locator('#modx-login-password').fill(credentials.password);await p.locator('#modx-login-btn').click();await p.waitForFunction(()=>window.MODx?.siteId);const token=await p.evaluate(()=>MODx.siteId);
 await p.goto(origin+'/manager/?a=index&namespace=cookie_consent');await p.locator('#ccm-save').waitFor();eq(await p.locator('[role=tab]').count(),4);
 const api=async(action)=>(await ctx.request.post(origin+'/assets/components/cookieconsent/connector.php',{headers:{modAuth:token},form:{action,HTTP_MODAUTH:token}})).json();
 const data=(await api('get')).object;eq(data.packageVersion,expectedVersion);eq(data.adapterBuild.state,'ready');eq(data.texts.locales.ru.banner_title,'Матрица совместимости');eq((await api('logs_list')).success,true);eq(errors,[]);
 const after=cli('snapshot'),before=JSON.parse(readFileSync(f+'/evidence/cms-before.json'));eq(after.settings,before.settings);eq(after.adapter,before.adapter);eq(after.elements,before.elements);
 writeFileSync(f+'/evidence/cms-browser.json',JSON.stringify({result:'PASS',assertions:n,info,component_reinstalled:false,mode:legacy?'Legacy':'Strict'},null,2)+'\n');console.log('PASS CMS upgrade browser '+name+' '+n);await ctx.close();
}}finally{await b.close();}
