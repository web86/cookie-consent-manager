// Current native transport reinstall and legacy behavior under actual PHP 8.1.
// Run after clean native/Manager suites; beta81 shares the disposable clean DB.
import {chromium} from 'playwright';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const origin='http://127.0.0.1:18981',container='cookie-consent-acceptance-beta81-1',out='.local/legacy-autoload-evidence';mkdirSync(out,{recursive:true});
const meta=JSON.parse(readFileSync('_build/package.json')),signature=`${meta.name}-${meta.version}-${meta.release}${meta.release_index}`;
const spec=JSON.parse(readFileSync('.local/artifacts/'+signature+'.inventory.json'));
const cli=(file,...args)=>execFileSync('docker',['exec',container,'php','/opt/cc-source/'+file,...args],{encoding:'utf8'}).trim();
const ctl=(op,...args)=>JSON.parse(cli('tests/transport/control.php',op,'/opt/cc-clean',...args));
const settingsBefore=Object.fromEntries(['cookie_consent.options','cookie_consent.services','cookie_consent.texts','cookie_consent.log_dir','cookie_consent.audit_config_file','cookie_consent.audit'].map(k=>[k,cli('tests/transport/control.php','get','/opt/cc-clean',k)]));
const b=await chromium.launch(),admin=await b.newContext(),p=await admin.newPage();let n=0,result;
const eq=(a,b,m)=>{n++;assert.deepEqual(a,b,m)};
try{
 await admin.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 const creds=ctl('credentials');await p.goto(origin+'/manager/');await p.locator('#modx-login-username').fill(creds.username);await p.locator('#modx-login-password').fill(creds.password);await p.locator('#modx-login-btn').click();await p.waitForFunction(()=>window.MODx?.siteId);const token=await p.evaluate(()=>MODx.siteId);
 const request=async(path,action,form={})=>(await admin.request.post(origin+path,{headers:{modAuth:token},form:{action,HTTP_MODAUTH:token,...form}})).json();
 cli('tests/transport/control.php','archive-extracted','/opt/cc-clean',signature);
 const upload=await admin.request.post(origin+'/connectors/index.php',{headers:{modAuth:token},multipart:{action:'workspace/packages/upload',HTTP_MODAUTH:token,file:{name:signature+'.transport.zip',mimeType:'application/zip',buffer:readFileSync('.local/artifacts/'+signature+'.transport.zip')}}});eq((await upload.json()).success,true);
 await request('/connectors/index.php','workspace/packages/scanlocal');eq((await request('/connectors/index.php','workspace/packages/install',{signature})).success,true,'Native PM reinstall under PHP 8.1');
 const actual=JSON.parse(cli('tests/beta102/control.php','installed','/opt/cc-source/.local/artifacts/'+signature+'.inventory.json'));eq(actual.php.startsWith('8.1.'),true);eq(actual.modx,'2.8.8-pl');for(const f of spec.files)eq(actual.files[f.target],f.sha256,f.target);
 cli('tests/beta102/control.php','configure','18981');
 const api=(action,form={})=>request('/assets/components/cookieconsent/connector.php',action,form),g=(await api('get')).object;
 const draft=Object.fromEntries(['options','registry','texts','log_dir','audit_config_file'].map(k=>[k,structuredClone(g[k])]));
 draft.options.categories={analytics:true,marketing:true,external_content:true};draft.options.buttons={reject:true,configure:false,accept_all:false,accept:true};draft.registry={schema:1,services:[{key:'yandex',loader:'yandex',name:'Fixture Yandex',purpose:'Statistics',enabled:true,category:'marketing',config:{id:'12345678'}}]};
 eq((await api('save',{revision:g.revision,draft:JSON.stringify(draft)})).success,true);
 const resource=execFileSync('docker',['exec','-i',container,'php','/opt/cc-source/tests/local/ux-control.php','resource'],{input:'<!doctype html><html><head>[[!CookieConsentAssets]]</head><body>[[!CookieConsentBanner]]</body></html>',encoding:'utf8'}).trim();
 const ctx=await b.newContext(),page=await ctx.newPage(),requests=[],acks=[];
 await ctx.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin===origin)return r.continue();requests.push(u.href);return r.fulfill({contentType:'text/javascript',body:'window.__sdk=1;window.__init=Array.from(ym.a[0]);'})});
 await ctx.route('**/audit.php',async route=>{const response=await route.fetch();acks.push({status:response.status(),body:await response.json()});await route.fulfill({response})});
 await page.goto(origin+'/?id='+resource,{waitUntil:'networkidle'});eq(requests.length,1);eq(await page.evaluate(()=>[__sdk,__init.slice(0,2),web86CookieConsent.getConsent()]),[1,[12345678,'init'],null]);
 await Promise.all([page.waitForNavigation({waitUntil:'networkidle'}),page.locator('[data-cc-action=reject]').click()]);eq(requests.length,1);eq(acks[0]?.status,200);eq(acks[0]?.body.ok,true);eq((await page.evaluate(()=>web86CookieConsent.getConsent())).categories.marketing,false);
 await ctx.close();result={result:'PASS',tests:1,assertions:n,failed:0,php:actual.php,modx:actual.modx,runtimeFiles:spec.files.length};console.log(JSON.stringify(result));
}catch(e){console.error(e.stack);result={result:'FAIL',tests:1,assertions:n,failed:1,error:e.stack};process.exitCode=1}finally{await b.close();for(const[k,v]of Object.entries(settingsBefore))execFileSync('docker',['exec','-i',container,'php','/opt/cc-source/tests/transport/control.php','set','/opt/cc-clean',k],{input:v,encoding:'utf8'});writeFileSync(out+'/php81.json',JSON.stringify(result,null,2)+'\n')}
