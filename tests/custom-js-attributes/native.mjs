import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,dirname,basename} from 'node:path';
import {chromium} from 'playwright';
const [casePath,zip]=process.argv.slice(2);assert.ok(casePath&&zip,'Usage: native.mjs CASE_DIR CONTAINER_ZIP');
const directory=resolve(casePath),service=basename(directory),compose=['compose','--env-file',resolve(dirname(directory),'compose.env'),'-f',resolve(directory,'compose.json')];
const cli=(script,...args)=>execFileSync('docker',[...compose,'exec','-T','-u','www-data',service,'php','/opt/cc-source/tests/'+script+'/fixture.php',...args],{encoding:'utf8'}).trim();
const ctl=(...args)=>cli('custom-js-attributes',...args),read=()=>JSON.parse(ctl('read'));
const product=JSON.parse(readFileSync('_build/package.json')).name;
const port=JSON.parse(readFileSync(resolve(directory,'compose.json'))).services[service].environment.CC_MODSTORE_PORT;
const origin='http://127.0.0.1:'+port,out=resolve(directory,'evidence/custom-js-attributes');mkdirSync(out,{recursive:true});
let assertions=0;const checks=[];const eq=(a,b,m)=>{assertions++;assert.deepEqual(a,b,m);};
const record=name=>{checks.push(name);console.log('PASS '+name);};
cli('modstore','install',zip);cli('modstore','configure');ctl('seed');
const installed=JSON.parse(ctl('installed',zip.replace('.transport.zip','.inventory.json')));record('native transport installation, exact payload and MODX-generated production bundle');
const browser=await chromium.launch();const manager=await browser.newContext({viewport:{width:1440,height:1100}}),page=await manager.newPage();
const external=[],errors=[],fixtures=[];
await manager.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin===origin){if(u.pathname==='/custom.js')fixtures.push(u.href);return route.continue();}external.push(u.hostname);return route.abort();});
page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.type()==='beforeunload'?d.accept():d.dismiss());
const credentials=JSON.parse(readFileSync(resolve(directory,'private/manager.json')));
let visitor;
try{
 await page.goto(origin+'/manager/');await page.locator('#modx-login-username').fill(credentials.username);await page.locator('#modx-login-password').fill(credentials.password);await page.locator('#modx-login-btn').click();await page.waitForFunction(()=>window.MODx?.siteId);
 await page.goto(origin+'/manager/?a=index&namespace=cookie_consent');await page.locator('#ccm-save').waitFor();
 const token=await page.evaluate(()=>window.CookieConsentManagerBootstrap.auth),connector=origin+'/assets/components/'+product+'/connector.php';
 const api=async(action,values={})=>{const response=await manager.request.post(connector,{headers:{modAuth:token,Origin:origin,Referer:origin+'/manager/'},form:{action,HTTP_MODAUTH:token,...values}});eq(response.status(),200);return response.json();};
 const draftOf=data=>({registry:data.registry,options:data.options,texts:data.texts,log_dir:data.log_dir,audit_config_file:data.audit_config_file});
 const custom={key:'custom',loader:'custom_js',name:'Ahrefs Web Analytics',purpose:'Site statistics',category:'analytics',enabled:true,config:{path:'/custom.js'}};
 const other={...structuredClone(custom),key:'other',name:'Other category',category:'marketing',config:{path:'/other.js'}};
 async function saveRegistry(registry){const data=(await api('get')).object;const result=await api('save',{revision:data.revision,site_origin:origin,draft:JSON.stringify({...draftOf(data),registry})});eq(result.success,true,'Real API accepts valid registry');return result.object;}
 const seed=read();const base=seed.registry;
 // Invalid authenticated requests must fail atomically, including raw duplicate members.
 const initial=ctl('snapshot');
 const badAttributes=[null,[],1,'x',{'src':'x'},{'onload':'x'},{'DATA-key':'x'},{'data-key':1},{'data-key':[]},{'data-key':{}},{'data-key':null},{'data-key':'x\t'},{'data-key':'x'.repeat(2049)},Object.fromEntries(Array.from({length:21},(_,i)=>['data-'+i,'x']))];
 for(const attributes of badAttributes){const r=structuredClone(base);r.services.push({...custom,config:{path:'/custom.js',attributes}});const result=await api('save',{revision:seed.revision,site_origin:origin,draft:JSON.stringify({...draftOf(seed),registry:r})});eq(result.success,false);eq(ctl('snapshot'),initial,'Invalid request saves no partial settings');}
 const duplicate=JSON.stringify({...draftOf(seed),registry:{schema:1,services:[{...custom,config:{path:'/custom.js',attributes:{'data-key':'x'}}}]}}).replace('"data-key":"x"','"data-key":"x","data-\\u006bey":"y"');
 eq((await api('save',{revision:seed.revision,draft:duplicate,site_origin:origin})).success,false);eq(ctl('snapshot'),initial);
 const foreign=structuredClone(base);foreign.services[0].config.attributes={'data-key':'x'};eq((await api('save',{revision:seed.revision,draft:JSON.stringify({...draftOf(seed),registry:foreign}),site_origin:origin})).success,false);eq(ctl('snapshot'),initial);record('authenticated API rejects malformed attributes, duplicates and other adapters atomically');
 await page.locator('#ccm-tab-services').click();
 await page.locator('#ccm-add-service').click();
 await page.locator('#ccm-service-name').fill('Ahrefs Web Analytics');await page.locator('#ccm-service-purpose').fill('Site statistics');await page.locator('#ccm-service-path').fill(origin+'/custom.js');
 // Local root-relative fixture uses the same adapter as the documented Ahrefs HTTPS URL.
 await page.locator('#ccm-service-path').fill('/custom.js');await page.locator('#ccm-service-category').selectOption('analytics');
 const editor=page.locator('#ccm-service-attributes');await editor.locator('[data-attribute-add]').click();await editor.locator('[data-attribute-name]').fill('data-key');await editor.locator('[data-attribute-value]').fill('public-site-key');
 await editor.locator('[data-attribute-add]').click();await editor.locator('[data-attribute-name]').nth(1).fill('data-domain');await editor.locator('[data-attribute-value]').nth(1).fill('example.test');
 eq(await editor.locator('script').count(),0);eq(fixtures,[],'Create preview never fetches script');
 await page.locator('#ccm-service-create').click();
 const card=page.locator('[data-service="custom_js"]');await card.waitFor();await page.locator('#ccm-enable-custom_js').check();
 async function uiSave(){const response=page.waitForResponse(r=>r.url().includes('connector.php')&&new URLSearchParams(r.request().postData()||'').get('action')==='save');await page.locator('#ccm-save').click();const value=await(await response).json();eq(value.success,true);await page.waitForFunction(()=>document.getElementById('ccm-status').dataset.state==='saved');}
 await uiSave();let saved=read();eq(saved.registry.services.find(s=>s.key==='custom_js').config.attributes,{'data-domain':'example.test','data-key':'public-site-key'});record('Manager creation saves multiple attributes');
 await page.reload();await page.locator('#ccm-tab-services').click();await page.locator('[data-settings="custom_js"] summary').click();
 let edit=page.locator('#ccm-custom_js-attributes');eq(await edit.locator('[data-attribute-name]').evaluateAll(inputs=>inputs.map(input=>input.value)),['data-domain','data-key']);eq(await edit.locator('[data-attribute-value]').evaluateAll(inputs=>inputs.map(input=>input.value)),['example.test','public-site-key']);
 const special='Ключ 日本語 😀 " & </script><script>window.__bad=1</script>';
 await edit.locator('[data-attribute-value]').nth(1).fill(special);await edit.locator('[data-attribute-add]').click();await edit.locator('[data-attribute-name]').nth(2).fill('data-empty');
 await uiSave();eq(read().registry.services.find(s=>s.key==='custom_js').config.attributes['data-key'],special);eq(await page.evaluate(()=>window.__bad),undefined);eq(fixtures,[],'Text preview loads nothing');record('Manager reload, edit, empty value and inert escaped preview');
 await page.locator('[data-settings="custom_js"] summary').click().catch(()=>{}); // Keep the settings open for visible screenshot below.
 if(!await edit.isVisible())await page.locator('[data-settings="custom_js"] summary').click();
 await edit.screenshot({path:out+'/manager-attributes.png'});await page.screenshot({path:out+'/manager-services.png',fullPage:true});
 // Invalid rows stay visible, including duplicates, and cannot be saved.
 const beforeBad=ctl('snapshot');await edit.locator('[data-attribute-name]').nth(1).fill('data-domain');await page.locator('#ccm-save').click();eq(ctl('snapshot'),beforeBad);eq(await page.locator('#ccm-status').getAttribute('data-state'),'error');eq(await page.locator('#ccm-custom_js-attributes [data-attribute-name]').count(),3);
 edit=page.locator('#ccm-custom_js-attributes');await edit.locator('[data-attribute-name]').nth(1).fill('data-empty');await uiSave();record('Manager blocks invalid duplicate rows and retains them for correction');
 // Native server owns the category version change; test both old and new browser consent.
 let r={schema:1,services:[custom,other]};await saveRegistry(r);
 visitor=await browser.newContext();const publicPage=await visitor.newPage();const outside=[];
 await visitor.route('**/*',route=>{if(new URL(route.request().url()).origin===origin)return route.continue();outside.push(route.request().url());return route.abort();});
 const visit=()=>publicPage.goto(origin+'/',{waitUntil:'networkidle'});
 const runs=()=>publicPage.evaluate(()=>window.__customScriptRuns||[]);
 const grant=async()=>{await publicPage.locator('[data-cc-action=accept-all]').click();await publicPage.waitForFunction(()=>window.__customScriptRuns?.length===2);};
 await visit();eq(await runs(),[],'Native Strict blocks before consent');await grant();const oldRaw=await publicPage.evaluate(()=>localStorage.getItem('web86_cookie_consent'));const versions=read().options.category_versions;
 r.services[0].config.attributes={};const unchanged=await saveRegistry(r);eq(unchanged.options.category_versions,versions,'Empty attrs do not bump category');await visit();eq(await publicPage.evaluate(()=>localStorage.getItem('web86_cookie_consent')),oldRaw,'Unchanged native configuration retains consent bytes');
 for(const attrs of [{'data-key':'public'},{'data-key':special,'data-empty':''},{'data-empty':'','data-key':'changed'},Object.fromEntries(Array.from({length:10},(_,i)=>['data-'+i,'<'.repeat(2048)])),{}]){
  r.services[0].config={path:'/custom.js',attributes:attrs};const before=read().options.category_versions;const next=await saveRegistry(r);eq(next.options.category_versions,{...before,analytics:before.analytics+1});
  await visit();eq((await runs()).map(x=>x.path),['/other.js'],'Native reconsent blocks only changed category');await grant();eq((await runs()).find(x=>x.path==='/custom.js').attributes,attrs,'Exact attributes before execution');
  await publicPage.evaluate(()=>{web86Providers.apply(web86CookieConsent.getConsent(),'live');web86Providers.apply(web86CookieConsent.getConsent(),'live');});eq((await runs()).length,2,'No duplicate execution after consent');
 }
 r.services[0].config.attributes={'data-z':'z','data-a':'a'};await saveRegistry(r);await visit();await grant();const reorder=read().options.category_versions;r.services[0].config.attributes={'data-a':'a','data-z':'z'};eq((await saveRegistry(r)).options.category_versions,reorder,'Native order-only update retains category version');
 eq(outside,[]);record('native category versions: add, edit, remove, reorder, old consent, independent marketing and dedup');
 await visitor.close();visitor=null;
 // Keyboard labels and delete-to-legacy path through the Manager, then reload.
 await page.reload();await page.locator('#ccm-tab-services').click();await page.locator('[data-settings="custom"] summary').click();edit=page.locator('#ccm-custom-attributes');
 eq(await edit.locator('label').count(),4);await edit.locator('[data-attribute-name]').first().focus();await page.keyboard.press('Tab');eq(await edit.locator('[data-attribute-value]').first().evaluate(el=>el===document.activeElement),true);
 while(await edit.locator('[data-attribute-remove]').count())await edit.locator('[data-attribute-remove]').first().click();await uiSave();eq(Object.hasOwn(read().registry.services.find(s=>s.key==='custom').config,'attributes'),false);await page.reload();await page.locator('#ccm-tab-services').click();eq(await page.locator('#ccm-custom-attributes [data-attribute-name]').count(),0);record('keyboard navigation, delete last attribute and reload');
 eq(external.filter(host=>!['www.gravatar.com','misc.modx.com'].includes(host)),[]);eq(errors,[]);
}catch(e){console.error(e.stack);process.exitCode=1;}finally{await visitor?.close();await browser.close();writeFileSync(out+'/native.json',JSON.stringify({product,installed,assertions,interceptedCoreRequests:external,failed:process.exitCode?1:0,checks},null,2)+'\n');}
