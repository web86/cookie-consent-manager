import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { origin, docker } from './helpers.mjs';
const dir = '.local/manager-i18n-evidence'; mkdirSync(dir, { recursive: true });
let assertions = 0; const results = [], external = [], publicErrors = [];
function equal(a,b,message) { assertions++; assert.deepEqual(a,b,message); }
function ok(a,message) { assertions++; assert.ok(a,message); }
function control(args,input) { return docker(['web','php','/opt/cc-source/tests/local/manager-i18n-control.php',...args],input); }
const saved = Object.fromEntries(['manager_language','cookie_consent.options','cookie_consent.services','cookie_consent.texts','cookie_consent.log_dir'].map(k => [k, control(['setting',k,'get'])]));
const contextSaved = JSON.parse(control(['context','get']));
const credentials = JSON.parse(docker(['web','php','-r','echo file_get_contents("/opt/cc-private/manager.json");']));
const browser = await chromium.launch();
let ctx, page;
async function openManager(language) {
  if (ctx) await ctx.close();
  control(['setting','manager_language'],language);
  ctx = await browser.newContext({ viewport:{width:1440,height:1000} });
  await ctx.route('**/*',r=>{if(new URL(r.request().url()).origin!==origin){external.push(new URL(r.request().url()).hostname);return r.abort();}return r.continue();});
  page = await ctx.newPage();page.on('dialog',d=>d.accept());page.on('pageerror',e=>publicErrors.push(e.message));
  await page.goto(origin+'/manager/?cultureKey='+language,{waitUntil:'networkidle'});await page.locator('#modx-login-username').fill(credentials.username);await page.locator('#modx-login-password').fill(credentials.password);await page.locator('#modx-login-btn').click();await page.waitForTimeout(500);
  await page.goto(origin+'/manager/?a=index&namespace=cookie_consent',{waitUntil:'networkidle'});await page.locator('#ccm-save').waitFor();
}
async function test(name,fn){try{await fn();results.push({name,result:'PASS'});console.log('PASS '+name);}catch(e){results.push({name,result:'FAIL',error:e.message});console.error('FAIL '+name+': '+e.message);}}
async function save(){await page.locator('#ccm-save').click();await page.waitForFunction(()=>document.querySelector('#ccm-status')?.dataset.state==='saved');}
async function state(name){await page.locator(`[data-preview-state="${name}"]`).click();await page.waitForTimeout(500);}
const frame=()=>page.frameLocator('#ccm-preview-frame');
async function front(language){control(['context'],language);const p=await ctx.newPage();p.on('pageerror',e=>publicErrors.push(e.message));await p.goto(origin,{waitUntil:'networkidle'});return p;}
try {
  await test('fresh-component-install-and-preserve-upgrade',async()=>{
    control(['fresh']);
    try {
      docker(['web','php','/opt/cc-source/server/bin/install-modx2.php','/var/www/html','/opt/cc-private/logs']);
      const registry=JSON.parse(control(['setting','cookie_consent.services','get']));equal(registry.services.every(s=>!s.enabled),true,'Fresh defaults');
      const before=control(['setting','cookie_consent.services','get']);docker(['web','php','/opt/cc-source/server/bin/install-modx2.php','/var/www/html','/opt/cc-private/logs']);equal(control(['setting','cookie_consent.services','get']),before,'Upgrade preserves');
      equal(JSON.parse(control(['setting','cookie_consent.options','get'])).ttl_days,90);
    }finally{control(['restore']);}
  });
  await openManager('ru');
  await test('ru-component-menu-tabs-and-system-language',async()=>{
    equal(await page.locator('[role=tab]').allTextContents(),['Основные','Сервисы','Тексты','Журнал']);
    equal(await page.locator('#ccm-edit-language').inputValue(),'ru');
    const menu = docker(['web','php','-r','define("MODX_API_MODE",true);ob_start();require "/var/www/html/index.php";while(ob_get_level())ob_end_clean();echo json_encode($modx->getObject("modMenu",["text"=>"Cookie Consent Manager"])->toArray());']);
    equal(JSON.parse(menu).namespace,'cookie_consent');equal(JSON.parse(menu).action,'index');
  });
  for(const tab of ['main','services','texts','logs']){await page.locator('#ccm-tab-'+tab).click();await page.screenshot({path:`${dir}/manager-ru-${tab}.png`});}
  await test('services-three-groups-individual-settings',async()=>{
    await page.locator('#ccm-tab-services').click();equal(await page.locator('.ccm-service-group').count(),3);equal(await page.locator('.ccm-service').count(),10);
    await page.locator('[data-settings=yandex] summary').click();equal(await page.locator('#ccm-yandex-webvisor').isChecked(),true);
    await page.screenshot({path:`${dir}/services-yandex-settings.png`});
  });
  await test('service-translations-retained-but-not-editable',async()=>{
    await page.locator('#ccm-tab-texts').click();equal(await page.locator('[data-text-key^="service."]').count(),0);equal(await page.locator('[data-text-key]').count(),9);
  });
  await test('legacy-mode-preview-and-preserved-values',async()=>{
    await page.locator('#ccm-tab-main').click();const configure=await page.locator('#ccm-show-configure').isChecked();
    await page.locator('#ccm-show-accept').check();equal(await page.locator('#ccm-show-configure').isDisabled(),true);equal(await page.locator('#ccm-show-accept_all').isDisabled(),true);
    await state('banner');equal(await frame().getByRole('button',{name:'Принять',exact:true}).count(),1);equal(await frame().getByRole('button',{name:'Настроить',exact:true}).count(),0);
    await save();const options=JSON.parse(control(['setting','cookie_consent.options','get']));equal(options.buttons.configure,configure);
    const p=await front('ru');equal(await p.locator('[data-cc-action=configure]').isVisible(),false);equal(await p.locator('[data-cc-action=accept-all]').isVisible(),false);equal(await p.locator('[data-cookie-settings-open]').count(),1);await p.close();
    await page.locator('#ccm-show-accept').uncheck();equal(await page.locator('#ccm-show-configure').isChecked(),configure);equal(await page.locator('#ccm-show-configure').isDisabled(),false);await save();
  });
  await test('languages-from-modx-single-select-and-preserved-draft',async()=>{
    await page.locator('#ccm-tab-texts').click();const languages=await page.locator('#ccm-edit-language option').evaluateAll(xs=>xs.map(x=>x.value));ok(languages.length>20,'MODX inventory');ok(languages.includes('tr')&&languages.includes('ja'));
    equal(await page.locator('#ccm-stock-language,#ccm-custom-language,#ccm-base-language,[data-restore]').count(),0);
    await page.locator('#ccm-edit-language').selectOption('tr');await page.locator('[data-text-key=analytics_name]').fill('Istatistik');
    await page.locator('#ccm-edit-language').selectOption('ru');await page.locator('#ccm-edit-language').selectOption('tr');equal(await page.locator('[data-text-key=analytics_name]').inputValue(),'Istatistik');await save();
  });
  await test('html-source-sanitization-preview-and-parser-tags',async()=>{
    await page.locator('#ccm-edit-language').selectOption('ru');
    const html='<p>Текст <strong>целиком</strong> <a href="/soglasie" target="_blank">ссылка</a> [[!CookieConsentRegistry]] {php}evil{/php}</p><script>window.__XSS=true</script><a href="javascript:alert(1)" onclick="alert(1)">bad</a><img src="https://evil.test/pixel">';
    await page.locator('#ccm-notice-html').fill(html);await state('banner');equal(await frame().locator('script,img,iframe').count(),0);equal(await frame().locator('a[href="/soglasie"]').count(),1);equal(await frame().locator('[onclick]').count(),0);equal(await page.evaluate(()=>window.__XSS),undefined);
    await page.screenshot({path:`${dir}/html-source-and-preview.png`});await save();
    const stored=JSON.parse(control(['setting','cookie_consent.texts','get']));ok(stored.locales.ru.notice_html.includes('<strong>целиком</strong>'));ok(!stored.locales.ru.notice_html.includes('<script>'));ok(!stored.locales.ru.notice_html.includes('onclick'));
    const p=await front('ru');ok((await p.locator('.cookie-warning-text').innerText()).includes('[[!CookieConsentRegistry]]'));ok((await p.locator('.cookie-warning-text').innerText()).includes('{php}evil{/php}'));equal(await p.locator('.cookie-warning-text a[href="/soglasie"]').count(),1);equal(await p.evaluate(()=>window.__XSS),undefined);await p.close();
    await page.locator('#ccm-notice-html').fill(JSON.parse(control(['setting','cookie_consent.texts','get'])).locales.ru.notice_html.replace(/\[\[.*?\]\]|\{php\}.*?\{\/php\}/g,''));await save();
  });
  await test('context-culturekey-and-fallback',async()=>{
    const p=await front('tr');equal((await p.locator('[data-cc-text=analytics_name]').textContent()).includes('Istatistik'),true);equal(await p.locator('[data-cc-action=accept-all]').textContent(),'Принять все');await p.close();
    const en=await front('en');equal(await en.locator('[data-cc-action=reject]').textContent(),'Reject');await en.close();
  });
  await test('translation-does-not-revoke-consent',async()=>{
    const p=await front('ru');await p.locator('[data-cc-action=accept-all]').click();await p.waitForTimeout(150);const before=await p.evaluate(()=>window.web86CookieConsent.getConsent());
    await page.locator('#ccm-edit-language').selectOption('ru');await page.locator('[data-text-key=analytics_name]').fill('Новое название категории');await save();
    await p.reload({waitUntil:'networkidle'});const after=await p.evaluate(()=>window.web86CookieConsent.getConsent());equal(after.consentId,before.consentId);equal(after.providers,before.providers,'Translate does not change fingerprint');
    control(['context'],'en');await p.reload({waitUntil:'networkidle'});equal((await p.evaluate(()=>window.web86CookieConsent.getConsent())).providers,before.providers,'Language preserves fingerprint');await p.close();
  });
  await test('privacy-parameter-invalidates-service-consent',async()=>{
    const p=await front('ru');const requests=[];p.on('request',r=>requests.push(r.url()));
    await page.locator('#ccm-tab-services').click();await page.locator('[data-settings=yandex] summary').click();await page.locator('#ccm-yandex-webvisor').uncheck();await save();
    requests.length=0;await p.reload({waitUntil:'networkidle'});ok(!requests.some(u=>u.endsWith('/mock/yandex.js')),'Changed service blocked');equal(Boolean((await p.evaluate(()=>window.web86CookieConsent.getConsent())).providers.yandex),false);await p.close();
  });
  await test('new-service-through-group-controls',async()=>{
    await page.locator('#ccm-add-counter summary').click();await page.locator('#ccm-counter-adapter').selectOption('google_ga4');await page.locator('#ccm-counter-name').fill('Extra counter');await page.locator('#ccm-counter-id').fill('G-EXTRA123');await page.locator('#ccm-counter-add').click();
    await page.locator('#ccm-enable-google_ga4_2').check();await save();
    const p=await front('en');equal(await p.locator('[data-cc-provider]').count(),0);equal(await p.locator('[data-cc-category=analytics]').isChecked(),false);await p.close();
  });
  await test('failed-save-keeps-draft',async()=>{
    await page.locator('#ccm-tab-main').click();await page.locator('#ccm-ttl').fill('120');
    await page.route('**/components/cookieconsent/connector.php',route=>{if(new URLSearchParams(route.request().postData()).get('action')==='save')return route.fulfill({status:503,contentType:'application/json',body:'{"success":false}'});return route.continue();});
    await page.locator('#ccm-save').click();await page.waitForFunction(()=>document.querySelector('#ccm-status').dataset.state==='error');equal(await page.locator('#ccm-ttl').inputValue(),'120');await page.unroute('**/components/cookieconsent/connector.php');await save();
  });
  await test('preview-no-service-network-or-audit',async()=>{
    const forbidden=[];page.on('request',r=>{if(r.url().includes('/mock/')||r.url().includes('/audit.php'))forbidden.push(r.url());});
    await state('preferences');equal(await frame().locator('[data-preview-service]').count(),0,'No providers in preview');equal(await frame().locator('input[type=checkbox]').count(),4,'Four categories');await state('map');equal(await frame().locator('[data-preview-map]').count(),2,'Both enabled map placeholders');await page.screenshot({path:`${dir}/preview-map.png`});await frame().locator('body').screenshot({path:`${dir}/preview-map-canvas.png`});await state('banner');
    equal(forbidden,[]);equal(await page.locator('#ccm-preview-frame').getAttribute('sandbox'),'');await page.screenshot({path:`${dir}/preview-banner.png`});
  });
  await test('responsive-preview-stacks-below-main',async()=>{
    await page.setViewportSize({width:850,height:1000});await page.locator('#ccm-tab-main').click();const main=await page.locator('.ccm-main').boundingBox(),aside=await page.locator('.ccm-preview').boundingBox();ok(aside.y>main.y+main.height-2);await page.screenshot({path:`${dir}/manager-responsive.png`,fullPage:true});await page.setViewportSize({width:1440,height:1000});
  });
  await test('unauthenticated-and-csrf-refused',async()=>{
    const unauth=await fetch(origin+'/assets/components/cookieconsent/connector.php',{method:'POST',body:new URLSearchParams({action:'save',draft:'{}'})});const body=await unauth.json();equal(body.success,false);
    const authWithoutToken=await page.evaluate(async()=>{const r=await fetch('/assets/components/cookieconsent/connector.php',{method:'POST',body:new URLSearchParams({action:'save',draft:'{}'})});return r.json();});equal(authWithoutToken.success,false);
  });
  await openManager('en');
  await test('english-manager-and-default-edit-locale',async()=>{equal(await page.locator('[role=tab]').allTextContents(),['General','Services','Texts','Log']);equal(await page.locator('#ccm-edit-language').inputValue(),'en');});
  for(const tab of ['main','services','texts','logs']){await page.locator('#ccm-tab-'+tab).click();await page.screenshot({path:`${dir}/manager-en-${tab}.png`});}
  await test('no-runtime-errors-or-external-public-hosts',async()=>{equal(publicErrors,[]);equal(external.filter(h=>h!=='www.gravatar.com'),[]);});
}finally{
  if(ctx)await ctx.close();await browser.close();
  for(const [key,value]of Object.entries(saved))control(['setting',key],value);
  control(['context'],contextSaved.exists?contextSaved.value:'__REMOVE__');
}
writeFileSync(`${dir}/results.json`,JSON.stringify({suite:'MODX CMP/i18n integration',tests:results.length,assertions,failed:results.filter(r=>r.result==='FAIL').length,blockedHosts:[...new Set(external)],results},null,2));
console.log(`${results.length} CMP scenarios, ${assertions} assertions`);if(results.some(r=>r.result==='FAIL'))process.exitCode=1;
