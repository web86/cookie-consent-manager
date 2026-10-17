/** Manager persistence and installed frontend on a NEW disposable MODX fixture only. */
import {chromium} from 'playwright';
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const major=process.env.CC_UI_MODX||'2',name=process.env.CC_UI_CASE;
assert.match(name,new RegExp('^ui-refinement-banner'+major+'-[a-z0-9-]+$'));
const container='cookie-consent-'+(major==='3'?'modx3-':'')+'adapter-updates-web-1',origin='http://127.0.0.1:'+(major==='3'?'23888':'22888');
const ref='/opt/cc-reference/.local/banner-layout/modx'+major,out=process.env.CC_BANNER_NATIVE_OUT||'.local/banner-layout/native';mkdirSync(out,{recursive:true});
const ctl=(op,...args)=>JSON.parse(execFileSync('docker',['exec',container,'runuser','-u','www-data','--','php','/opt/cc-source/tests/adapter-updates/control.php',name,op,...args],{encoding:'utf8'}));
const setting=(key,value)=>JSON.parse(execFileSync('docker',['exec','-i',container,'runuser','-u','www-data','--','php',ref+'/tests/ui-refinement/control.php',name,'setting',key,value===undefined?'get':'set'],{input:value,encoding:'utf8'})).value;
let n=0;const results=[],eq=(a,b,m)=>{n++;assert.deepEqual(a,b,m);},ok=(a,m)=>{n++;assert.ok(a,m);};
const browser=await chromium.launch();let ctx,p,visitorCtx,visitor;const errors=[];
async function route(ctx){await ctx.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.fulfill({contentType:r.request().resourceType()==='script'?'text/javascript':'text/html',body:r.request().resourceType()==='script'?'/* controlled SDK */':'<p>Controlled player</p>'}));}
async function open(language){if(ctx)await ctx.close();ctl('language',language);ctx=await browser.newContext({viewport:{width:1440,height:1000}});await route(ctx);p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));const credentials=ctl('credentials');await p.goto(origin+'/manager/');await p.locator('#modx-login-username').fill(credentials.username);await p.locator('#modx-login-password').fill(credentials.password);await p.locator('#modx-login-btn').click();await p.waitForFunction(()=>window.MODx?.siteId);await p.goto(origin+'/manager/?a=index&namespace=cookie_consent');await p.locator('#ccm-save').waitFor();await p.frameLocator('#ccm-preview-frame').locator('section.cookie-warning').waitFor();}
async function save(){const response=p.waitForResponse(r=>new URLSearchParams(r.request().postData()||'').get('action')==='save');await p.locator('#ccm-save').click();const data=await(await response).json();eq(data.success,true);eq(data.object.partial,false);await p.waitForFunction(()=>document.querySelector('#ccm-status').dataset.state==='saved');return data.object;}
async function previewChange(fn){const response=p.waitForResponse(r=>new URLSearchParams(r.request().postData()||'').get('action')==='preview');await fn();await response;await p.waitForTimeout(100);}
async function test(name,fn){const before=n;await fn();results.push({name,result:'PASS',assertions:n-before});console.log('PASS '+name);}
const initial={};
try{
 const pageId=ctl('production','strict').id;
 for(const key of ['cookie_consent.options','cookie_consent.services','cookie_consent.texts','cookie_consent.log_dir','manager_language'])initial[key]=setting(key);
 const initialState=ctl('state');
 const ownState=()=>JSON.parse(execFileSync('docker',['exec',container,'runuser','-u','www-data','--','php',ref+'/tests/release-test/control.php',name,'state'],{encoding:'utf8'}));
 const initialPhp=ownState().php_error_count;
 for(const language of ['ru','en']){
  await open(language);
  await test(language+'-title-translation-and-preview',async()=>{
   await previewChange(()=>p.locator('#ccm-tab-texts').click());
   if(await p.locator('#ccm-edit-language').inputValue()!==language)await previewChange(()=>p.locator('#ccm-edit-language').selectOption(language));
   const field=p.locator('[data-text-key=banner_title]');eq(await field.inputValue(),language==='ru'?'':'Мы используем файлы cookie','Missing translation inherits base title');
   const baseline=await p.locator('#ccm-preview-frame').getAttribute('srcdoc');
   const title=language==='ru'?'Мы используем файлы cookie':'We use cookies';
   await previewChange(()=>field.fill(title));eq(await p.locator('#ccm-preview-frame').getAttribute('srcdoc'),baseline,'Sidebar preview unchanged by title');
   eq(await field.locator('..').textContent(),(language==='ru'?'Заголовок баннераЕсли поле пустое, заголовок не отображается':'Banner titleLeave empty to hide the title'));
   const saved=await save();eq(saved.texts.locales[language].banner_title,title);
   await p.reload();await p.locator('#ccm-tab-texts').click();eq(await p.locator('[data-text-key=banner_title]').inputValue(),title,'Title persists after Manager reload');
  });
  await test(language+'-positions-save-reload-and-consent',async()=>{
   await p.locator('#ccm-tab-main').click();await p.locator('#ccm-advanced>summary').click();
   eq(await p.locator('#ccm-advanced-content>section').evaluateAll(es=>es.map(e=>e.id)),['ccm-banner-appearance','ccm-log-storage','ccm-adapters-build']);
   eq(await p.locator('#ccm-banner-position option').allTextContents(),language==='ru'?['Внизу (панель)','Справа внизу (компактный)','Слева внизу (компактный)']:['Bottom (bar)','Bottom right (compact)','Bottom left (compact)']);
   const policy=JSON.parse(setting('cookie_consent.options'));
   visitorCtx=await browser.newContext({viewport:{width:1440,height:900}});await route(visitorCtx);visitor=await visitorCtx.newPage();visitor.on('pageerror',e=>errors.push(e.message));
   for(const position of ['bottom','bottom-right','bottom-left']){
    await p.frameLocator('#ccm-preview-frame').locator('section.cookie-warning').waitFor();
    const before=await p.locator('#ccm-preview-frame').getAttribute('srcdoc');
    await previewChange(()=>p.locator('#ccm-banner-position').selectOption(position));eq(await p.locator('#ccm-preview-frame').getAttribute('srcdoc'),before,'Sidebar preview unchanged by position');
    const saved=await save();eq(saved.options.banner_position,position);eq(saved.options.policy_version,policy.policy_version);eq(saved.options.category_versions,policy.category_versions,'Layout/title save does not reset consent');
    await p.reload();await p.locator('#ccm-save').waitFor();await p.locator('#ccm-advanced>summary').click();eq(await p.locator('#ccm-banner-position').inputValue(),position,'Position persists');
    await visitor.goto(origin+'/?id='+pageId);await visitor.waitForFunction(()=>!!window.web86CookieConsent);
    if(position==='bottom'){
     eq(await visitor.locator('iframe').count(),0,'Installed Strict blocks services');await visitor.locator('[data-cc-action=accept-all]').click();await visitor.waitForFunction(()=>!!localStorage.getItem('web86_cookie_consent'));
    }else{eq(await visitor.locator('#cookie-block').isVisible(),false,'Existing consent survives visual change and reload');eq(await visitor.locator('iframe').count(),5);}
    const title=await visitor.locator('.cookie-warning-title').textContent();ok(title.length>0);
    eq(await visitor.locator('#cookie-block').getAttribute('class').then(c=>c.includes('cookie-warning--'+position)),position!=='bottom');
   }
   await visitorCtx.close();visitorCtx=null;
  });
 }
 await test('explicit-empty-translation-and-missing-language',async()=>{
  await p.locator('#ccm-tab-texts').click();await previewChange(()=>p.locator('#ccm-edit-language').selectOption('en'));await p.locator('[data-text-key=banner_title]').fill('');await save();
  const texts=JSON.parse(setting('cookie_consent.texts'));eq(texts.locales.en.banner_title,'');ok(texts.locales.ru.banner_title.length>0);
  const draft=JSON.parse(setting('cookie_consent.options'));eq(draft.category_versions,JSON.parse(initial['cookie_consent.options']).category_versions);eq(JSON.parse(setting('cookie_consent.services')),JSON.parse(initial['cookie_consent.services']),'Service data unchanged after normal JSON serialization');eq(setting('cookie_consent.log_dir'),initial['cookie_consent.log_dir']);
 });
 const after=ctl('state');eq(after.files,initialState.files,'No adapter changes');eq(after.bundle,initialState.bundle,'Visual settings do not rebuild JS');eq(ownState().php_error_count,initialPhp,'No PHP errors from title/layout saves');eq(errors,[],'No browser JS errors');
}catch(e){results.push({result:'FAIL',error:e.stack});console.error(e);process.exitCode=1;}
finally{if(visitorCtx)await visitorCtx.close();if(ctx)await ctx.close();await browser.close();for(const [key,value]of Object.entries(initial))setting(key,value);writeFileSync(out+'/results.json',JSON.stringify({tests:results.length,assertions:n,failed:results.filter(r=>r.result==='FAIL').length,results},null,2)+'\n');}
