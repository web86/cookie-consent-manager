// Final native payload hashes + read-only Manager help/Preview isolation check.
import {chromium} from 'playwright';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const meta=JSON.parse(readFileSync('_build/package.json'));
const signature=meta.name+'-'+meta.version+'-'+meta.release+meta.release_index;
const spec=JSON.parse(readFileSync('.local/artifacts/'+signature+'.inventory.json'));
const out=process.env.CC_REFACTOR_EVIDENCE||'.local/service-adapters';mkdirSync(out,{recursive:true});
let assertions=0;
const eq=(a,b,m)=>{assertions++;assert.deepEqual(a,b,m);};
const cli=(...args)=>execFileSync('docker',['exec','cookie-consent-acceptance-web-1','php','/opt/cc-source/'+args[0],...args.slice(1)],{encoding:'utf8'}).trim();
const installed=JSON.parse(cli('tests/beta102/control.php','installed',process.env.CC_REFACTOR_CONTAINER_INVENTORY||'/opt/cc-source/.local/artifacts/'+signature+'.inventory.json'));
eq(installed.modx,'2.8.8-pl');
for(const file of spec.files) eq(installed.files[file.target],file.sha256,'Native installed '+file.target);
const origin='http://127.0.0.1:8888',browser=await chromium.launch(),context=await browser.newContext(),page=await context.newPage();
const outside=[],errors=[];
await context.route('**/*',route=>{
  if(new URL(route.request().url()).origin===origin) return route.continue();
  outside.push(route.request().url());return route.abort();
});
page.on('pageerror',error=>errors.push(error.message));
try {
  const credentials=JSON.parse(cli('tests/transport/control.php','credentials','/opt/cc-private'));
  await page.goto(origin+'/manager/');
  await page.locator('#modx-login-username').fill(credentials.username);
  await page.locator('#modx-login-password').fill(credentials.password);
  await page.locator('#modx-login-btn').click();
  await page.waitForFunction(()=>window.MODx?.siteId);
  await page.goto(origin+'/manager/?a=index&namespace=cookie_consent');
  await page.locator('#ccm-save').waitFor();
  await page.locator('#ccm-tab-services').click();
  const help=await page.locator('[data-settings] .ccm-help').allTextContents();
  eq(help.some(text=>text.includes('services/yandex.js → start()')),true,'SDK source link');
  eq(help.some(text=>text.includes('embeds.js → mount()')),true,'Map source link');
  eq(help.some(text=>text.includes('provider-registry.js → start()')),false,'No stale source link');
  eq(await page.evaluate(()=>typeof window.web86CookieConsent),'undefined','Frontend controller isolated from Manager');
  const managerUrl=await page.locator('script[src*="/cookieconsent/manager.js"]').getAttribute('src');
  const bytes=await(await context.request.get(new URL(managerUrl,origin).href)).body();
  eq(createHash('sha256').update(bytes).digest('hex'),spec.files.find(file=>file.target==='assets/components/cookieconsent/manager.js').sha256,'Exact delivered Manager source');
  // MODX itself requests its configured Gravatar avatar. It is intercepted too;
  // it is unrelated to the component's isolated SDK/Preview lifecycle.
  eq(outside.filter(url=>new URL(url).hostname!=='www.gravatar.com'),[],'No component SDK/Preview request outside Manager');eq(errors,[],'No browser errors');
  writeFileSync(out+'/manager-final.json',JSON.stringify({result:'PASS',tests:1,assertions,failed:0,php:installed.php,modx:installed.modx,runtimeFiles:spec.files.length,signature,interceptedCoreAvatarRequests:outside.filter(url=>new URL(url).hostname==='www.gravatar.com').length},null,2)+'\n');
  console.log('PASS final native payloads, Manager source links and Preview isolation ('+assertions+' assertions)');
} finally {await browser.close();}
