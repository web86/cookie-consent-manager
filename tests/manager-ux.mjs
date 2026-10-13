import {chromium} from 'playwright';
import {execFileSync} from 'node:child_process';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
const dir='.local/manager-ux-evidence';mkdirSync(dir,{recursive:true});
const dc=['compose','--env-file','.local/private/compose.env','-f','tests/local/compose.yaml','-f','tests/transport/compose.yaml','exec','-T'];
const privateDir=s=>s==='web'?'/opt/cc-private':'/opt/cc-clean';
const cli=(s,args,input)=>execFileSync('docker',[...dc,s,...args],{input,encoding:'utf8',maxBuffer:8*1024*1024}).trim();
const control=(s,op,key,input)=>cli(s,['php','/opt/cc-source/tests/transport/control.php',op,privateDir(s),...(key?[key]:[])],input);
const fixture=(s,op,input,arg)=>cli(s,['php','/opt/cc-source/tests/local/ux-control.php',op,...(arg?[arg]:[])],input);
let assertions=0;const results=[],external=[],errors=[];const browser=await chromium.launch();const contexts=[];const snapshots={};
const eq=(a,b,m)=>{assertions++;assert.deepEqual(a,b,m);};const ok=(a,m)=>{assertions++;assert.ok(a,m);};
async function test(name,fn){let n=assertions;try{await fn();results.push({name,result:'PASS',assertions:assertions-n});console.log('PASS '+name);}catch(e){results.push({name,result:'FAIL',assertions:assertions-n,error:e.message});console.error('FAIL '+name+' '+e.message);}}
async function manager(s,port){const origin='http://127.0.0.1:'+port,ctx=await browser.newContext({viewport:{width:1440,height:900}});contexts.push(ctx);await ctx.route('**/*',r=>{if(new URL(r.request().url()).origin!==origin){external.push(new URL(r.request().url()).hostname);return r.abort();}return r.continue();});const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));const creds=JSON.parse(control(s,'credentials'));await p.goto(origin+'/manager/');await p.locator('#modx-login-username').fill(creds.username);await p.locator('#modx-login-password').fill(creds.password);await p.locator('#modx-login-btn').click();await p.waitForFunction(()=>window.MODx?.siteId);await p.goto(origin+'/manager/?a=index&namespace=cookie_consent');await p.locator('#ccm-save').waitFor();await p.frameLocator('#ccm-preview-frame').locator('section.cookie-warning').waitFor();const token=await p.evaluate(()=>window.CookieConsentManagerBootstrap.auth);const api=async(action,form={},auth=true)=>{const r=await ctx.request.post(origin+'/assets/components/cookieconsent/connector.php',{form:{action,...(auth?{HTTP_MODAUTH:token}:{}),...form},headers:auth?{modAuth:token}:{}});return {status:r.status(),...(await r.json())};};return {p,ctx,origin,api};}
const keys=['cookie_consent.options','cookie_consent.services','cookie_consent.texts','cookie_consent.log_dir','cookie_consent.audit_config_file','cookie_consent.audit'];
for(const s of ['web','clean'])snapshots[s]=Object.fromEntries(keys.map(k=>[k,control(s,'get',k)]));
const context=fixture('web','context',undefined,'get');
const event=()=>({event_id:randomUUID(),consent_id:randomUUID(),event:'reject',stage:'committed',analytics:false,marketing:false,policy_version:'1',page:'/cookie-consent-audit-check',timestamp:new Date().toISOString()});
try{
 const m=await manager('web',8888);
 await test('desktop-long-texts-and-services-scroll-with-sticky-preview',async()=>{
  await m.p.locator('#ccm-tab-texts').click();await m.p.locator('[data-text-key]').last().scrollIntoViewIfNeeded();const last=await m.p.locator('[data-text-key]').last().boundingBox();ok(last.y>=0&&last.y+last.height<=900);ok(await m.p.evaluate(()=>document.body.scrollTop>0||document.documentElement.scrollTop>0));const aside=await m.p.locator('.ccm-preview').boundingBox();ok(aside.y>=0&&aside.y<100,'Preview stays visible');
  await m.p.screenshot({path:dir+'/desktop-texts-bottom.png'});
  await m.p.locator('#ccm-tab-services').click();await m.p.locator('#ccm-add-counter summary').click();await m.p.locator('#ccm-counter-add').scrollIntoViewIfNeeded();const end=await m.p.locator('#ccm-counter-add').boundingBox();ok(end.y+end.height<=900);await m.p.screenshot({path:dir+'/desktop-services-bottom.png'});
 });
 await test('mobile-long-tabs-scroll-and-preview-below-form',async()=>{
  await m.p.setViewportSize({width:390,height:844});await m.p.waitForTimeout(250);await m.p.locator('#ccm-tab-texts').click();await m.p.locator('[data-text-key]').last().scrollIntoViewIfNeeded();const last=await m.p.locator('[data-text-key]').last().boundingBox();ok(last.y>=0&&last.y+last.height<=844);const main=await m.p.locator('.ccm-main').boundingBox(),aside=await m.p.locator('.ccm-preview').boundingBox();ok(aside.y>=main.y+main.height);ok(main.x>=0 && main.x+main.width<=390);await m.p.screenshot({path:dir+'/mobile-texts.png'});await m.p.setViewportSize({width:1440,height:900});
 });
 await test('technical-fields-hidden-one-language-select-short-integration',async()=>{
  eq(await m.p.locator('#ccm-policy,#ccm-audit-config,#ccm-preview-language,#ccm-base-language,#ccm-stock-language,#ccm-custom-language,[id^=ccm-purpose-],[data-restore]').count(),0);
  await m.p.locator('#ccm-tab-texts').click();eq(await m.p.locator('#ccm-panel-texts select').count(),1);const names=await m.p.locator('[data-text-key]').evaluateAll(xs=>xs.map(x=>x.dataset.textKey));ok(names.every(k=>k==='notice_html'||/^(necessary|analytics|marketing|external_content)_(name|description)$/.test(k)));
  await m.p.locator('#ccm-tab-logs').click();eq(await m.p.locator('#ccm-integration-help pre').textContent(),'[[!CookieConsent]]');ok(!(await m.p.locator('#ccm-page').textContent()).includes('upgrade_elements'));
 });
 await test('two-counters-generated-keys-confirmation-save-only-and-auto-preview-locale',async()=>{
  await m.p.locator('#ccm-tab-services').click();const before=control('web','get','cookie_consent.services');
  for(const [n,id]of [[2,'G-EXTRA1234'],[3,'G-NEXT1234']]){if(!(await m.p.locator('#ccm-add-counter').evaluate(x=>x.open)))await m.p.locator('#ccm-add-counter summary').click();await m.p.locator('#ccm-counter-adapter').selectOption('google_ga4');await m.p.locator('#ccm-counter-name').fill('Counter '+n);await m.p.locator('#ccm-counter-id').fill(id);await m.p.locator('#ccm-counter-add').click();eq(await m.p.locator('[data-service=google_ga4_'+n+']').count(),1);eq(await m.p.locator('#ccm-enable-google_ga4_'+n).isChecked(),false);ok((await m.p.locator('#ccm-status').textContent()).length>20);eq(control('web','get','cookie_consent.services'),before);}
  const saved=m.p.waitForResponse(r=>new URLSearchParams(r.request().postData()).get('action')==='save');await m.p.locator('#ccm-save').click();eq((await(await saved).json()).success,true);const services=JSON.parse(control('web','get','cookie_consent.services')).services;for(const n of [2,3]){const s=services.find(x=>x.key==='google_ga4_'+n);eq(s.purpose_id,s.key);eq(s.category,'analytics');}
  await m.p.locator('#ccm-tab-texts').click();await m.p.locator('#ccm-edit-language').selectOption('ru');await m.p.waitForTimeout(500);eq(await m.p.frameLocator('#ccm-preview-frame').locator('html').getAttribute('lang'),'ru');
  for(const k of ['cookie_consent.services','cookie_consent.texts'])control('web','set',k,snapshots.web[k]);await m.p.reload();await m.p.locator('#ccm-save').waitFor();
 });
 await test('diagnostic-HTTP-invalid-JSON-and-draft-preserved',async()=>{
  await m.p.locator('#ccm-tab-main').click();await m.p.locator('#ccm-ttl').fill('121');await m.p.route('**/cookieconsent/connector.php',r=>new URLSearchParams(r.request().postData()).get('action')==='save'?r.fulfill({status:502,contentType:'text/html',body:'<h1>gateway</h1>'}):r.continue());
  await m.p.locator('#ccm-save').click();await m.p.waitForFunction(()=>document.querySelector('#ccm-status').dataset.state==='error');ok((await m.p.locator('#ccm-status').textContent()).includes('save, HTTP 502, invalid_response'));eq(await m.p.locator('#ccm-ttl').inputValue(),'121');await m.p.frameLocator('#ccm-preview-frame').locator('section.cookie-warning').waitFor();await m.p.screenshot({path:dir+'/request-diagnostic.png'});await m.p.unroute('**/cookieconsent/connector.php');await m.p.reload();await m.p.locator('#ccm-save').waitFor();
 });
 await test('backend-validation-correlated-id-and-no-MODAUTH-refused',async()=>{
  const get=await m.api('get');const d=get.object;const draft={options:d.options,registry:d.registry,texts:d.texts,log_dir:d.log_dir,audit_config_file:d.audit_config_file};draft.options={...draft.options,ttl_days:99999};
  const bad=await m.api('save',{revision:get.object.revision||'0'.repeat(64),draft:JSON.stringify(draft)});eq(bad.success,false);ok(/^[a-f0-9]{16}$/.test(bad.object.request_id));eq(bad.object.code,'validation');eq((await m.api('audit_setup',{},false)).success,false);eq((await m.api('audit_protect',{log_dir:'/var/www/html'},false)).success,false);eq((await m.api('reconsent',{},false)).success,false);
 });
 await test('policy-reconsent-confirmation-and-explicit-change',async()=>{
  const vctx=await browser.newContext();contexts.push(vctx);await vctx.route('**/*',r=>new URL(r.request().url()).origin===m.origin?r.continue():r.abort());const visitor=await vctx.newPage(),loads=[];visitor.on('request',r=>{if(r.url().includes('/mock/'))loads.push(r.url());});await visitor.goto(m.origin,{waitUntil:'networkidle'});const audit=visitor.waitForResponse(r=>r.url().endsWith('/audit.php')&&r.status()===200);await visitor.locator('[data-cc-action=accept-all]').click();await audit;ok(await visitor.evaluate(()=>!!window.web86CookieConsent.getConsent()));
  await m.p.locator('#ccm-tab-main').click();const before=JSON.parse(control('web','get','cookie_consent.options'));await m.p.locator('#ccm-advanced summary').click();m.p.once('dialog',d=>d.dismiss());await m.p.locator('#ccm-reconsent').click();eq(JSON.parse(control('web','get','cookie_consent.options')),before);m.p.once('dialog',d=>d.accept());const done=m.p.waitForResponse(r=>(r.request().postData()||'').includes('action=reconsent'));await m.p.locator('#ccm-reconsent').click();eq((await(await done).json()).success,true);const after=JSON.parse(control('web','get','cookie_consent.options'));ok(after.policy_version!==before.policy_version);eq(after.ttl_days,before.ttl_days);loads.length=0;await visitor.reload({waitUntil:'networkidle'});eq(await visitor.evaluate(()=>window.web86CookieConsent.getConsent()),null);eq(await visitor.locator('#cookie-block').isVisible(),true);eq(loads,[]);await visitor.close();control('web','set','cookie_consent.options',snapshots.web['cookie_consent.options']);
 });
 await test('unified-uncached-snippet-order-cache-culture-duplicates-inert-maps',async()=>{
  const id=fixture('web','resource','<!doctype html><html><head><title>UX</title></head><body>[[!CookieConsent]][[!CookieConsent]][[!CookieConsentMap? &provider=`google_maps` &src=`https://www.google.com/maps/embed?pb=test`]][[!CookieConsentMap? &provider=`yandex_maps` &src=`https://yandex.ru/map-widget/v1/?um=test`]]</body></html>');
  const p=await m.ctx.newPage();const network=[];p.on('request',r=>network.push(r.url()));
  for(const language of ['en','ru','en']){fixture('web','context',language);await p.waitForTimeout(2300);network.length=0;await p.goto(m.origin+'/?id='+id,{waitUntil:'networkidle'});eq(await p.locator('#cookie-block').count(),1);eq(await p.locator('#cc-service-registry').count(),1);eq(await p.locator('script[src*="cookie-consent.min.js"]').count(),1);eq(await p.locator('[data-cc-map-provider]').count(),2);eq(await p.locator('[data-cc-map-provider] iframe').count(),0);eq(await p.locator('#cookie-block').getAttribute('data-cc-mode'),'live');const config=JSON.parse(await p.locator('#cc-public-config').textContent());eq(config.locale,language);eq(Object.hasOwn(config,'strings'),false);eq(await p.locator('[data-cc-action=reject]').textContent(),({en:'Reject',ru:'Отклонить'}[language]));ok(network.every(u=>new URL(u).origin===m.origin));const html=await p.content();ok(html.indexOf('cc-service-registry')<html.indexOf('cookie-consent.min.js'));eq((await p.locator('script[src]').evaluateAll(xs=>xs.map(x=>x.src))).filter(s=>/\/(i18n|provider-registry|consent-manager)\.js/.test(s)).length,0);}
  const cache=await p.reload({waitUntil:'networkidle'});eq(cache.status(),200);eq(await p.locator('#cookie-block').count(),1);await p.screenshot({path:dir+'/unified-map-placeholders.png'});await p.close();fixture('web','resource',undefined,'remove');
 });
 const c=await manager('clean',8889);
 await test('managed-audit-init-idempotent-key-never-in-CMP-public-config',async()=>{
  eq((await c.api('audit_setup')).success,true);const first=JSON.parse(fixture('clean','managed-check'));eq(first.key_length,64);eq(first.origin,c.origin);eq(first.limit,60);eq((await c.api('audit_setup')).success,true);eq(JSON.parse(fixture('clean','managed-check')).key_hash,first.key_hash);const raw=await c.api('get');ok(!JSON.stringify(raw).includes('rate_limit_key'));ok(!Object.hasOwn(raw.object,'audit'));await c.p.reload();await c.p.locator('#ccm-save').waitFor();ok(!(await c.p.evaluate(()=>JSON.stringify(window.MODx.config))).includes('rate_limit_key'));ok(!control('clean','get','cookie_consent.audit').includes('rate_limit_key'));
 });
 await test('native-registry-read-send-cannot-read-or-mutate-private-key',async()=>{
  const before=JSON.parse(fixture('clean','managed-check')),token=await c.p.evaluate(()=>MODx.siteId);
  for(const action of ['read','send']){const r=await c.ctx.request.post(c.origin+'/connectors/index.php',{headers:{modAuth:token},form:{action:'system/registry/register/'+action,HTTP_MODAUTH:token,register:'cookieconsent-audit-private',register_class:'registry.modDbRegister',topic:'/configuration/',message:'probe',poll_limit:'1',time_limit:'1',remove_read:'0'}});eq((await r.json()).success,false);}
  eq(JSON.parse(fixture('clean','managed-check')).key_hash,before.key_hash);
 });
 await test('public-log-directory-JSONL-rate-and-real-POST',async()=>{
  cli('clean',['sh','-c','mkdir -p /var/www/html/logs/cookies; chown -R www-data:www-data /var/www/html/logs; printf "historical safe sentinel\\n" > /var/www/html/logs/cookies/2020-01-cookie-consent.log; chown www-data:www-data /var/www/html/logs/cookies/2020-01-cookie-consent.log']);
  eq((await c.api('audit_protect',{log_dir:'/var/www/html/logs/cookies'})).success,true);const get=await c.api('get');const draft=Object.fromEntries(['options','registry','texts','log_dir','audit_config_file'].map(k=>[k,get.object[k]]));draft.log_dir='/var/www/html/logs/cookies';eq((await c.api('save',{draft:JSON.stringify(draft),revision:get.object.revision})).success,true);eq((await c.api('audit_test')).success,true);
  eq(cli('clean',['php','-r','echo file_get_contents("/var/www/html/logs/cookies/2020-01-cookie-consent.log");']),'historical safe sentinel');
  await c.p.reload();await c.p.locator('#ccm-save').waitFor();await c.p.locator('#ccm-tab-main').click();await c.p.frameLocator('#ccm-preview-frame').locator('section.cookie-warning').waitFor();await c.p.screenshot({path:dir+'/managed-audit-ready.png'});
 });
 await test('managed-key-config-and-public-JSONL-retained-native-uninstall-reinstall',async()=>{
  const before=JSON.parse(fixture('clean','audit-state')),token=await c.p.evaluate(()=>MODx.siteId);
  const native=async action=>(await c.ctx.request.post(c.origin+'/connectors/index.php',{headers:{modAuth:token},form:{action:'workspace/packages/'+action,HTTP_MODAUTH:token,signature:'cookieconsent-0.1.0-beta'+(JSON.parse(readFileSync('_build/package.json')).release_index+1)+'',preexisting_mode:'0'}})).json();
  eq((await native('install')).success,true);eq(JSON.parse(fixture('clean','audit-state')),before);
  eq((await native('uninstall')).success,true);eq(JSON.parse(fixture('clean','audit-state')),before);
  eq((await native('install')).success,true);eq(JSON.parse(fixture('clean','audit-state')),before);eq((await c.api('get')).object.auditStatus.state,'ready');
 });
 await test('disabled-AllowOverride-no-block-real-POST',async()=>{
  cli('clean',['sh','-c','printf "<Directory /var/www/html/logs/cookies>\\nAllowOverride None\\n</Directory>\\n" > /etc/apache2/conf-enabled/cc-ux-unsafe.conf; apachectl -k graceful']);
  try{await c.p.waitForTimeout(750);const exposed=await fetch(c.origin+'/logs/cookies/2020-01-cookie-consent.log',{headers:{Connection:'close'}});eq(exposed.status,200);eq((await c.api('audit_protect',{log_dir:'/var/www/html/logs/cookies'})).success,true);const r=await c.ctx.request.post(c.origin+'/assets/components/cookieconsent/audit.php',{headers:{Origin:c.origin},data:event()});eq(r.status(),200);eq((await c.api('get')).object.auditStatus.state,'ready');}
  finally{cli('clean',['sh','-c','rm /etc/apache2/conf-enabled/cc-ux-unsafe.conf; apachectl -k graceful']);await c.p.waitForTimeout(750);}
  eq((await c.api('audit_protect',{log_dir:'/var/www/html/logs/cookies'})).success,true);
 });
 await test('public-log-symlink-traversal-refused-proxy-allowed-old-logs-retained',async()=>{
  cli('clean',['sh','-c','ln -sfn /var/www/html/logs/cookies /var/www/html/logs/cookie-alias']);
  for(const log_dir of ['/var/www/html/logs/cookie-alias','/var/www/html/logs/../logs/cookies','/var/www/html'])eq((await c.api('audit_protect',{log_dir})).success,false);
  const token=await c.p.evaluate(()=>window.CookieConsentManagerBootstrap.auth);const proxied=await c.ctx.request.post(c.origin+'/assets/components/cookieconsent/connector.php',{headers:{modAuth:token,'X-Forwarded-Proto':'https'},form:{action:'audit_protect',HTTP_MODAUTH:token,log_dir:'/var/www/html/logs/cookies'}});eq((await proxied.json()).success,true);
  eq(cli('clean',['php','-r','echo file_get_contents("/var/www/html/logs/cookies/2020-01-cookie-consent.log");']),'historical safe sentinel');
 });
 await test('runtime-no-errors-or-unexpected-Manager-external-hosts',async()=>{eq(errors,[]);eq(external.filter(h=>h!=='www.gravatar.com'),[]);});
}finally{
 for(const ctx of contexts)await ctx.close();await browser.close();fixture('web','resource',undefined,'remove');fixture('web','context',JSON.parse(context).value||'__REMOVE__');
 for(const [s,values]of Object.entries(snapshots))for(const [k,v]of Object.entries(values))control(s,'set',k,v);
 writeFileSync(dir+'/results.json',JSON.stringify({suite:'Manager UX / native integration',tests:results.length,assertions,failed:results.filter(x=>x.result==='FAIL').length,results},null,2));
}
if(results.some(x=>x.result==='FAIL'))process.exitCode=1;
