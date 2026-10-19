import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
const local='.local/package-rename',signature='cookieconsentmanager-1.0.8-pl4',folder=local+'/artifacts/first-public';
const cases=JSON.parse(readFileSync(local+'/public-cases.json')).filter(c=>c.fresh&&(!process.argv[2]||c.name===process.argv[2]));
const browser=await chromium.launch();
for(const c of cases){
 const f=local+'/'+c.name,out=f+'/evidence',origin='http://127.0.0.1:'+c.port;
 const compose=['compose','--env-file',f+'/private/compose.env','-f',f+'/compose.yaml'];
 const cli=(args,input)=>execFileSync('docker',[...compose,'exec','-T','web',...args],{encoding:'utf8',input,maxBuffer:16*1024*1024}).trim();
 const ctl=(action,...args)=>JSON.parse(cli(['php','/opt/cc-source/tests/package-rename/fixture.php',action,...args]));
 const result=[];let n=0;const eq=(a,b,m)=>{n++;assert.deepEqual(a,b,m)},ok=(v,m)=>{n++;assert.ok(v,m)};
 const ctx=await browser.newContext();await ctx.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 const run=async(name,fn)=>{const start=n;try{await fn();result.push({name,result:'PASS',assertions:n-start});console.log('PASS '+c.name+' '+name)}catch(e){result.push({name,result:'FAIL',assertions:n-start,error:e.stack});throw e}finally{writeFileSync(out+'/public-fresh.json',JSON.stringify({case:c,tests:result.length,assertions:n,failed:result.filter(r=>r.result==='FAIL').length,results:result},null,2)+'\n')}};
 try{
  await p.goto(origin+'/manager/');const credentials=JSON.parse(readFileSync(f+'/private/manager.json'));
  await p.locator('#modx-login-username').fill(credentials.username);await p.locator('#modx-login-password').fill(credentials.password);await p.locator('#modx-login-btn').click();await p.waitForFunction(()=>window.MODx?.siteId);
  const token=await p.evaluate(()=>MODx.siteId);
  const api=async(action,form={},native=false)=>(await ctx.request.post(origin+(native?'/connectors/index.php':'/assets/components/cookieconsentmanager/connector.php'),{headers:{modAuth:token,Origin:origin,Referer:origin+'/manager/'},form:{action,HTTP_MODAUTH:token,...form},timeout:120000})).json();
  const install=async(expected=true)=>{const r=await api('workspace/packages/install',{signature},true);eq(r.success,expected,JSON.stringify(r));};
  let before;
  await run('empty-new-product-and-unrelated-paths',async()=>{eq(Object.keys(ctl('snapshot').elements).length,0);before=ctl('rename-state');eq(Object.keys(before.packages).length,0);});
  await run('native-fresh-install-with-foreign-paths',async()=>{
   const bytes=readFileSync(folder+'/'+signature+'.transport.zip');const upload=await ctx.request.post(origin+'/connectors/index.php',{headers:{modAuth:token},multipart:{action:'workspace/packages/upload',HTTP_MODAUTH:token,file:{name:signature+'.transport.zip',mimeType:'application/zip',buffer:bytes}},timeout:120000});eq((await upload.json()).success,true);eq((await api('workspace/packages/scanlocal',{},true)).success,true);
   ctl('name-conflict');const conflict=ctl('snapshot');await install(false);eq(ctl('snapshot'),conflict,'Unowned snippet refusal happens before canonical/file mutations');eq(existsSync(f+'/site/core/components/cookieconsentmanager/src'),false);ctl('clear-name-conflict');await install();
   const after=ctl('rename-state');eq(after.trees,before.trees,'Foreign files byte-identical');eq(after.foreign,before.foreign,'Unrelated objects unchanged');eq([...new Set(Object.values(after.element_categories))],['CookieConsentManager'],'Independent category for new elements');for(const count of Object.values(after.counts))eq(count,1);eq(after.namespace,'{core_path}components/cookieconsentmanager/');eq((await api('get')).object.adapterBuild.state,'ready');eq((await api('get')).object.options.categories,{analytics:false,marketing:false,external_content:false});
   await p.goto(origin+'/manager/?a=index&namespace=cookie_consent');await p.locator('#ccm-save').waitFor();eq(errors,[]);
  });
  await run('native-reinstall-is-idempotent',async()=>{const snapshot=ctl('snapshot'),state=ctl('rename-state');await install();eq(ctl('snapshot'),snapshot);eq(ctl('rename-state'),state);});
  await run('parse-failure-preserves-user-file-and-working-bundle',async()=>{
   const file=f+'/site/assets/components/cookieconsentmanager/js/cookie-consent/services/yandex.js',bundle=f+'/site/assets/components/cookieconsentmanager/js/cookie-consent/cached-cookie-consent.min.js';const old=readFileSync(file),working=readFileSync(bundle),version=ctl('bundle-state').version;
   writeFileSync(file,Buffer.concat([old,Buffer.from('\nfunction { invalid\n')]));const changed=readFileSync(file);await install();eq(readFileSync(file),changed);eq(readFileSync(bundle),working);eq(ctl('bundle-state').version,version);eq((await api('get')).object.adapterBuild.state,'error');
   ctl('resource'); // Keep requests visitor-only and confirm no repair/build is attempted there.
   const log=readFileSync(f+'/site/assets/components/cookieconsentmanager/js/cookie-consent/cookie-consent.last-error.json');await ctx.request.get(origin);eq(readFileSync(bundle),working);eq(readFileSync(f+'/site/assets/components/cookieconsentmanager/js/cookie-consent/cookie-consent.last-error.json'),log);
   writeFileSync(file,old);eq((await api('bundle_rebuild')).success,true);eq((await api('get')).object.adapterBuild.state,'ready');
  });
 }catch(e){console.error(e);process.exitCode=1;}finally{await ctx.close();}
}
await browser.close();
