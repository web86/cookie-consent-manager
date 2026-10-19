// Installed-source edit/failure/repair checks; no historical transport is installed.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
const local='.local/modx3-first-public',sig='cookieconsentmanager3-1.0.8-pl5',cases=JSON.parse(readFileSync(local+'/cases.json')).filter(c=>!process.argv[2]||c.name===process.argv[2]);
const browser=await chromium.launch();
for(const c of cases){
 const f=local+'/'+c.name,origin='http://127.0.0.1:'+c.port,compose=['compose','--env-file',f+'/private/compose.env','-f',f+'/compose.yaml'];
 const ctl=op=>JSON.parse(execFileSync('docker',[...compose,'exec','-T','web','php','/opt/cc-source/tests/public-install/fixture.php',op],{encoding:'utf8'}));
 const ctx=await browser.newContext({locale:'en'});await ctx.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 let n=0;const eq=(a,b,m)=>{n++;assert.deepEqual(a,b,m)};
 try{
  const p=await ctx.newPage();await p.goto(origin+'/manager/');const credentials=JSON.parse(readFileSync(f+'/private/manager.json'));
  await p.locator('#modx-login-username').fill(credentials.username);await p.locator('#modx-login-password').fill(credentials.password);await p.locator('#modx-login-btn').click();await p.waitForFunction(()=>window.MODx?.siteId);
  const token=await p.evaluate(()=>MODx.siteId),api=async(action,form={},native=false)=>(await ctx.request.post(origin+(native?'/connectors/index.php':'/assets/components/cookieconsentmanager3/connector.php'),{headers:{modAuth:token,Origin:origin,Referer:origin+'/manager/'},form:{action,HTTP_MODAUTH:token,...form},timeout:120000})).json();
  const source=f+'/site/assets/js/cookie-consent/services/yandex.js',bundle=f+'/site/assets/js/cookie-consent/cached-cookie-consent.min.js',error=f+'/site/assets/js/cookie-consent/cookie-consent.last-error.json';
  const old=readFileSync(source),working=readFileSync(bundle),before=ctl('bundle-state');
  writeFileSync(source,Buffer.concat([old,Buffer.from('\nfunction { invalid\n')]));const changed=readFileSync(source);
  eq((await api('workspace/packages/install',{signature:sig},true)).success,true,'Native reinstall retains working fallback');eq(readFileSync(source),changed);eq(readFileSync(bundle),working);eq(ctl('bundle-state'),before);eq((await api('get')).object.adapterBuild.state,'error');
  const marker=readFileSync(error);await ctx.request.get(origin);eq(readFileSync(bundle),working,'Visitor cannot build');eq(readFileSync(error),marker,'Visitor cannot repair failed build');
  writeFileSync(source,old);eq((await api('bundle_rebuild')).success,true);eq((await api('get')).object.adapterBuild.state,'ready');eq(ctl('identity').aliases,false);
  writeFileSync(f+'/evidence/adapters.json',JSON.stringify({result:'PASS',assertions:n,source_preserved:true,fallback:true,visitor_build:false},null,2)+'\n');console.log('PASS '+c.name+' adapter failure/fallback/repair '+n);
 }catch(e){writeFileSync(f+'/evidence/adapters.json',JSON.stringify({result:'FAIL',assertions:n,error:e.stack},null,2)+'\n');console.error(e);process.exitCode=1;}finally{await ctx.close();}
}
await browser.close();
