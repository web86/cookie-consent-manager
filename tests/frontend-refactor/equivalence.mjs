// Compare the immutable beta4 and candidate in separate browsers with identical
// DOM/storage/SDK fixtures. No vendor request is allowed to leave Playwright.
import {chromium} from 'playwright';
import {execFileSync} from 'node:child_process';
import {readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const baseline = JSON.parse(readFileSync(process.env.CC_REFACTOR_BASELINE||'tests/frontend-refactor/service-adapters-baseline.json'));
const original = path => execFileSync('git', ['show', `${baseline.commit}:${path}`], {encoding:'utf8'});
const bundlePath = 'assets/components/cookieconsentmanager/js/cookie-consent/cookie-consent.min.js';
const bundles = [original(bundlePath), readFileSync(process.env.CC_REFACTOR_CANDIDATE||bundlePath, 'utf8')];
assert.equal(createHash('sha256').update(bundles[0]).digest('hex'), baseline.sources[bundlePath]);
const demo = original('demo.html');
const origin = 'https://cmp.example.test';
const categories = ['analytics','marketing','external_content'];
const timestamp = 1792108800000;
const out = process.env.CC_REFACTOR_EVIDENCE||'.local/service-adapters/final';
mkdirSync(out, {recursive:true});
const browser = await chromium.launch();
const results = [];
let assertions = 0;
const eq = (a,b,m) => { assertions++; assert.deepEqual(a,b,m); };

function fixture(scenario) {
  const registry = JSON.parse(demo.match(/<script id="cc-service-registry"[^>]*>(.*?)<\/script>/s)[1]);
  registry.services.push(
    {key:'historical_mock',loader:'mock_marketing',category:'marketing',enabled:true,config:{}},
    {key:'local',loader:'custom_js',purpose:'Local integration',category:'marketing',enabled:true,config:{path:'/assets/integration.js'}},
    {key:'remote',loader:'custom_js',purpose:'Remote integration',category:'marketing',enabled:true,config:{path:'https://cdn.example.test/integration.js?v=2'}},
    {key:'disabled',loader:'custom_js',purpose:'Disabled integration',category:'marketing',enabled:false,config:{path:'/disabled.js'}},
    {...structuredClone(registry.services.find(s=>s.loader==='meta_pixel')),key:'meta_duplicate'}
  );
  if (scenario.category) for (const service of registry.services) service.category = scenario.category;
  let html = demo.replace(/(<script id="cc-service-registry"[^>]*>).*?(<\/script>)/s, '$1'+JSON.stringify(registry)+'$2')
    .replace('data-cc-audit-url=""', 'data-cc-audit-url="/audit.php"')
    .replace('data-cc-show-accept="0"', `data-cc-show-accept="${scenario.legacy?1:0}"`)
    .replace('data-cc-mode="mock"', `data-cc-mode="${scenario.mode||'live'}"`);
  if (scenario.hidden) html = html.replace('data-cc-category-marketing="1"','data-cc-category-marketing="0"');
  if ((scenario.mode||'live') === 'live') html = html
    .replace('/assets/components/cookieconsentmanager/js/cookie-consent/mock/google_maps.html','https://www.google.com/maps/embed?pb=fixture')
    .replace('/assets/components/cookieconsentmanager/js/cookie-consent/mock/yandex_maps.html','https://yandex.ru/map-widget/v1/?um=fixture');
  if (scenario.dialog) html = html.replace('<div data-cc-map-provider="google_maps"', '<dialog id="map-dialog"><div data-cc-map-provider="google_maps"')
    .replace('</div><div data-cc-map-provider="yandex_maps"','</div></dialog><div data-cc-map-provider="yandex_maps"');
  if (scenario.noRoot) html = html.replace('id="cookie-block"', 'id="no-cookie-block"');
  return html;
}

async function exercise(bundle, scenario) {
  const context = await browser.newContext();
  const requests=[], audits=[], errors=[], warnings=[], checkpoints=[];
  let release, held;
  const pending = new Promise(resolve=>{release=resolve;});
  const entered = new Promise(resolve=>{held=resolve;});
  await context.addInitScript(({timestamp, scenario}) => {
    window.__settledScripts=new WeakSet();
    window.__cspViolations=[];
    document.addEventListener('securitypolicyviolation',event=>__cspViolations.push(event.violatedDirective));
    for(const name of ['load','error']) document.addEventListener(name,event=>{
      if(event.target.tagName==='SCRIPT') __settledScripts.add(event.target);
    },true);
    const NativeDate = Date;
    window.Date = class extends NativeDate { constructor(...args){super(...(args.length?args:[timestamp]));} static now(){return timestamp;} };
    let byte = 0;
    crypto.getRandomValues = bytes => { for(let i=0;i<bytes.length;i++) bytes[i]=++byte%256; return bytes; };
    const choice = {model:'categories_v2',version:'1',necessary:true,categories:{analytics:true,marketing:true,external_content:true},category_versions:{analytics:0,marketing:0,external_content:0},savedAt:timestamp-1000};
    if(scenario.stored==='reject') for(const c in choice.categories) choice.categories[c]=false;
    if(scenario.stored==='partial') {choice.categories.marketing=false;choice.categories.external_content=false;}
    if(scenario.stored==='expired') choice.savedAt=timestamp-100*86400000;
    if(scenario.stored==='policy') choice.version='old';
    if(scenario.stored==='stale') choice.category_versions.marketing=-1;
    if(!sessionStorage.getItem('fixture-seeded')) {
      sessionStorage.setItem('fixture-seeded','1');
      if(scenario.stored) localStorage.setItem('web86_cookie_consent',scenario.stored==='malformed'?'{broken':JSON.stringify(choice));
      if(scenario.archive) localStorage.setItem('web86_cookie_consent_legacy_v2','{}');
    }
    if(scenario.storageError) Object.defineProperty(window,'localStorage',{get(){throw Error('Fixture storage unavailable');}});
    if(scenario.siteConsent) {
      window.dataLayer=[];window.gtag=function(){dataLayer.push(arguments);};
      gtag('consent','default',{analytics_storage:scenario.siteConsent,ad_storage:scenario.siteConsent});
      dataLayer.push({event:'site_owned'});
    }
  }, {timestamp,scenario});
  await context.route('**/*',async route=>{
    const request=route.request(), url=new URL(request.url());
    if(request.isNavigationRequest() && request.frame()===page.mainFrame()) return route.fulfill({contentType:'text/html',body:fixture(scenario),headers:scenario.csp?{'Content-Security-Policy':"default-src 'self'; script-src 'self' https://cdn.example.test https://mc.yandex.ru https://top-fwz1.mail.ru https://connect.facebook.net https://www.googletagmanager.com; frame-src 'self' https://www.google.com https://yandex.ru; style-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'"}:{}});
    if(url.pathname.endsWith('cookie-consent.min.js')) return route.fulfill({contentType:'text/javascript',body:bundle});
    if(url.pathname.endsWith('cookie-consent.min.css')) return route.fulfill({contentType:'text/css',body:readFileSync('assets/components/cookieconsentmanager/css/cookie-consent.min.css','utf8')});
    if(url.pathname==='/audit.php') {
      const data=request.postDataJSON();audits.push(data);
      return route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,event_id:data.event_id,server_time:new Date(timestamp).toISOString()})});
    }
    requests.push({url:url.href,type:request.resourceType()});
    if(scenario.pending && (scenario.pending === true ? url.hostname === 'connect.facebook.net' : url.href.includes(scenario.pending))) {held();await pending;}
    if(scenario.fail && request.resourceType()==='script') return route.abort('failed');
    if(request.resourceType()==='document') return route.fulfill({contentType:'text/html',body:'<p>Fixture map</p>'});
    return route.fulfill({contentType:'text/javascript',body:`document.cookie='fixture_sdk=1; SameSite=Lax; Secure';window.__loads=(window.__loads||[]).concat(${JSON.stringify(url.href)});`});
  });
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  // Minification changes function names/line numbers, never the warning message.
  page.on('console',m=>{if(m.type()==='warning') warnings.push(m.text().split('\n')[0]);});
  const snapshot=async label=>{
    if(!scenario.pending) await page.waitForFunction(()=>[...document.querySelectorAll('script[src]')].every(s=>__settledScripts.has(s)));
    await page.waitForTimeout(25);
    checkpoints.push({label, state:await page.evaluate(()=>({
      consent:window.web86CookieConsent?.getConsent(),
      persisted:(()=>{try{return localStorage.getItem('web86_cookie_consent');}catch{return 'unavailable';}})(),
      api:Object.keys(window.web86CookieConsent||{}),providers:Object.keys(web86Providers),
      frozen:[Object.isFrozen(web86Providers),Object.isFrozen(web86Providers.services)],
      services:web86Providers.services,
      scripts:[...document.querySelectorAll('script[src]')].map(s=>s.src),
      maps:[...document.querySelectorAll('[data-cc-map-provider]')].map(n=>n.outerHTML),
      google:(window.dataLayer||[]).map(x=>Object.prototype.toString.call(x)==='[object Arguments]'?Array.from(x):x),
      yandex:(window.ym?.a||[]).map(x=>Array.from(x)),tmr:window._tmr||[],meta:window.fbq?.queue||[],
      callbacks:window.__callbacks||[],guards:(window.__guards||[]).map(f=>f()),
      focus:document.activeElement?.outerHTML,dialog:document.getElementById('map-dialog')?.open,
      cookies:document.cookie,cspViolations:__cspViolations
    })),requests:[...requests].sort((a,b)=>a.url.localeCompare(b.url)),audits:structuredClone(audits)});
  };
  try {
    await page.goto(origin+'/',{waitUntil:scenario.pending?'domcontentloaded':'load'});
    if(scenario.pending) await entered;
    eq(await page.evaluate(()=>web86Providers.services.length),13,'Fixture registry must be accepted');
    if(scenario.noRoot) return {api:await page.evaluate(()=>typeof window.web86CookieConsent),requests,errors};
    await page.evaluate(()=>{
      window.__callbacks=[];window.__guards=[];
      for(const c of ['analytics','marketing','external_content']) web86CookieConsent.onAllowed(c,g=>{__callbacks.push(c);__guards.push(g);});
      const unsubscribe=web86CookieConsent.onAllowed('analytics',()=>__callbacks.push('cancelled'));
      unsubscribe();
    });
    await snapshot('initial');
    if(scenario.pending) {
      const navigation=page.waitForNavigation({waitUntil:'load'});
      await page.locator('[data-cc-action=reject]').click();
      release();
      await navigation;
      await snapshot('revoke');
    } else if(scenario.dialog) {
      await page.evaluate(()=>document.getElementById('map-dialog').showModal());
      await page.locator('#map-dialog [data-cc-map-load]').click();
      await snapshot('map-settings-focus');
      await page.locator('[data-cc-category=external_content]').check();
      await page.locator('[data-cc-action=save]').click();
      await snapshot('map-dialog-restored');
    } else {
      await page.evaluate(()=>web86CookieConsent.openSettings());
      for(const category of categories) if(await page.locator(`[data-cc-category=${category}]`).isVisible()) await page.locator(`[data-cc-category=${category}]`).check();
      await page.locator('[data-cc-action=save]').click();
      await snapshot('grant');
      await page.evaluate(()=>{
        const c=web86CookieConsent.getConsent();web86Providers.apply(c,document.getElementById('cookie-block').dataset.ccMode);web86Providers.apply(c,document.getElementById('cookie-block').dataset.ccMode);
        window.dispatchEvent(new CustomEvent('web86:consent-change',{detail:{categories:{analytics:true,marketing:true,external_content:true}}}));
      });
      // The duplicate bundle must be inert even after consent/SDK initialization.
      await page.addScriptTag({url:origin+'/assets/components/cookieconsentmanager/js/cookie-consent/cookie-consent.min.js'});
      await snapshot('dedup-and-duplicate-bundle');
      await page.reload({waitUntil:'load'});
      await snapshot('restore');
      if(scenario.storageError) return {checkpoints,errors,warnings};
      await page.evaluate(()=>web86CookieConsent.openSettings());
      await page.locator('[data-cc-action=back]').click();
      const navigation=page.waitForNavigation({waitUntil:'load'});
      await page.locator('[data-cc-action=reject]').click();
      await navigation;
      await snapshot('reject-reload');
    }
    return {checkpoints,errors,warnings};
  } finally { release(); await context.close(); }
}

try {
  const scenarios=[];
  for(const legacy of [false,true]) for(const mode of ['live','mock']) for(const category of categories) scenarios.push({legacy,mode,category});
  for(const legacy of [false,true]) {
    for(const stored of ['all','reject','partial','expired','policy','stale','malformed']) scenarios.push({legacy,stored});
    for(const extra of [{archive:true},{storageError:true},{hidden:true},{fail:true},{siteConsent:'denied'},{siteConsent:'granted'},{noRoot:true}]) scenarios.push({legacy,...extra});
  }
  scenarios.push({dialog:true},{legacy:true,pending:true},{csp:true},{legacy:true,csp:true});
  for (const pending of ['top-fwz1.mail.ru','/gtag/js','/gtm.js','mc.yandex.ru','cdn.example.test/integration.js']) scenarios.push({legacy:true,pending});
  for(const scenario of scenarios) {
    if(process.argv.includes('--dialog') && !scenario.dialog) continue;
    if(process.argv.includes('--focused') && !scenario.category && !scenario.pending && !scenario.dialog) continue;
    const name=JSON.stringify(scenario),before=assertions;
    const old=await exercise(bundles[0],scenario),candidate=await exercise(bundles[1],scenario);
    writeFileSync(out+'/comparison-last.json',JSON.stringify({scenario,baseline:old,candidate},null,2)+'\n');
    eq(candidate,old,name);
    eq(candidate.errors,[],name+' no uncaught errors');
    if(scenario.csp) for(const point of candidate.checkpoints) eq(point.state.cspViolations,[],'CSP without inline execution/eval');
    results.push({name,result:'PASS',assertions:assertions-before});
    console.log('PASS '+name);
  }
} catch(error) {results.push({result:'FAIL',error:error.stack});process.exitCode=1;console.error(error.stack);}
finally {
  await browser.close();
  writeFileSync(out+'/equivalence.json',JSON.stringify({baseline:baseline.commit,candidateSHA256:createHash('sha256').update(bundles[1]).digest('hex'),tests:results.length,assertions,failed:results.filter(x=>x.result==='FAIL').length,results},null,2)+'\n');
}
