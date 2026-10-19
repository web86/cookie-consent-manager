import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {execFileSync,spawn} from 'node:child_process';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {once} from 'node:events';
const local='.local/preflight-fix',signature='cookieconsentmanager-1.0.8-pl4';
const archive=local+'/artifacts/release/'+signature+'.transport.zip';
const cases=JSON.parse(readFileSync(local+'/cases.json'));
const browser=await chromium.launch();
for(const [index,c] of cases.entries()){
 if(process.argv[2]&&process.argv[2]!==c.name)continue;
 const f=local+'/'+c.name,out=f+'/evidence',origin='http://127.0.0.1:'+c.port;
 const compose=['compose','--env-file',f+'/private/compose.env','-f',f+'/compose.yaml'];
 const cli=(file,args=[],input)=>execFileSync('docker',[...compose,'exec','-T','-u','www-data','web','php','/opt/cc-source/tests/'+file,...args],{encoding:'utf8',input,maxBuffer:16*1024*1024}).trim();
 const ctl=(...args)=>JSON.parse(cli('preflight/fixture.php',args));
 const oldCtl=(...args)=>JSON.parse(cli('package-rename/fixture.php',args));
 const result=[];let n=0;const eq=(a,b,m)=>{n++;assert.deepEqual(a,b,m)},ok=(v,m)=>{n++;assert.ok(v,m)};
 const resume=index===1&&process.argv.includes('--resume-namespace');
 if(resume){for(const row of JSON.parse(readFileSync(out+'/preflight.json')).results.slice(0,2)){assert.equal(row.result,'PASS');result.push(row);n+=row.assertions;}}
 const ctx=await browser.newContext();await ctx.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 const run=async(name,fn)=>{const start=n;try{await fn();result.push({name,result:'PASS',assertions:n-start});console.log('PASS '+c.name+' '+name)}catch(e){result.push({name,result:'FAIL',assertions:n-start,error:e.stack});throw e}finally{writeFileSync(out+'/preflight.json',JSON.stringify({case:c,tests:result.length,assertions:n,failed:result.filter(r=>r.result==='FAIL').length,results:result},null,2)+'\n')}};
 try{
  await p.goto(origin+'/manager/');const credentials=JSON.parse(readFileSync(f+'/private/manager.json'));
  await p.locator('#modx-login-username').fill(credentials.username);await p.locator('#modx-login-password').fill(credentials.password);await p.locator('#modx-login-btn').click();await p.waitForFunction(()=>window.MODx?.siteId);
  const token=await p.evaluate(()=>MODx.siteId);
  const api=async(action,form={},native=true)=>(await ctx.request.post(origin+(native?'/connectors/index.php':'/assets/components/cookieconsentmanager/connector.php'),{headers:{modAuth:token,Origin:origin,Referer:origin+'/manager/'},form:{action,HTTP_MODAUTH:token,...form},timeout:120000})).json();
  const install=async(expected=true)=>{const r=await api('workspace/packages/install',{signature});eq(r.success,expected,JSON.stringify(r));};
  const upload=async(path)=>{const response=await ctx.request.post(origin+'/connectors/index.php',{headers:{modAuth:token},multipart:{action:'workspace/packages/upload',HTTP_MODAUTH:token,file:{name:signature+'.transport.zip',mimeType:'application/zip',buffer:readFileSync(path)}},timeout:120000});eq((await response.json()).success,true);eq((await api('workspace/packages/scanlocal')).success,true);};
  if(!resume)await run('pristine-cms',async()=>{const s=ctl('state');eq(s.installed,false);eq(Object.keys(s.files).length,0);for(const rows of Object.values(s.objects))eq(rows,[]);});
  if(index===1){
   if(!resume)await run('reproduce-original-namespace-only-refusal',async()=>{
    ctl('namespace');const before=ctl('state');eq(before.objects.modNamespace.length,1);eq(Object.keys(before.files).length,0);
    await upload('.local/package-rename/artifacts/first-public/'+signature+'.transport.zip');eq(ctl('state'),before,'Upload/scan must not register additional objects');await install(false);eq(ctl('state'),before,'Failed first preflight retains the pre-existing namespace without creating component objects');
    ok(readFileSync(f+'/site/core/cache/logs/error.log','utf8').includes('Unrecognized cookie_consent installation; inspect its manifest before installing'));
    // This is an uninstalled fixture package; native removal only clears its cached ZIP/unpack.
    eq(ctl('state').installed,false);eq((await api('workspace/packages/remove',{signature})).success,true);eq(ctl('state'),before);
   });
   if(!resume){
    // Both unpublished candidates have the same signature and deterministic mtime.
    // Discard cached old hook bytecode before testing the replacement candidate.
    execFileSync('docker',[...compose,'restart','web'],{stdio:'pipe'});
    await upload(archive);
   }
   eq(readFileSync(f+'/site/core/packages/'+signature+'/xPDOScriptVehicle/5a3a9db7dae67b8bd70c4409e2e8ef14.preflight.script','utf8').includes('A namespace can survive an interrupted native install.'),true);
   for(const type of ['snippet','chunk','plugin','setting','foreign-setting','menu','foreign-menu','core-known','core-unknown','assets-known','assets-unknown','public','adapter','css','manifest','state','symlink','namespace-core','namespace-assets']){
    await run('reject-foreign-'+type,async()=>{ctl('conflict',type,'seed');try{const before=ctl('state');await install(false);eq(ctl('state'),before,'Refusal must preserve all foreign contents and create no canonical objects/files');}finally{ctl('conflict',type,'clear');}});
   }
   await run('retry-after-contended-preflight',async()=>{
    const child=spawn('docker',[...compose,'exec','-T','-u','www-data','web','php','/opt/cc-source/tests/preflight/fixture.php','lock'],{stdio:['pipe','pipe','pipe']});let ready='';
    try{for await(const bytes of child.stdout){ready+=bytes;if(ready.includes('READY'))break;}ok(ready.includes('READY'));const before=ctl('state');await install(false);eq(ctl('state'),before);eq(before.objects.modNamespace.length,1);eq(Object.keys(before.files),['/var/www/html/assets/components/cookieconsentmanager/js/cookie-consent/cookie-consent.build.lock']);}
    finally{child.stdin.end('\n');const [code]=await once(child,'exit');eq(code,0);}
    await install();eq(ctl('state').installed,true);
   });
  }else{
   await run('native-pristine-install',async()=>{await upload(archive);eq(ctl('state').objects.modNamespace,[],'Package Manager upload/scan does not create namespace');await install();eq(ctl('state').installed,true);});
  }
  await run('native-reinstall-retains-user-adapter-and-settings',async()=>{
   const file=f+'/site/assets/components/cookieconsentmanager/js/cookie-consent/services/yandex.js';writeFileSync(file,readFileSync(file,'utf8')+'\n// preflight reinstall user customization\n');
   const snapshot=oldCtl('snapshot'),state=oldCtl('rename-state');await install();eq(oldCtl('snapshot'),snapshot);eq(oldCtl('rename-state'),state);for(const count of Object.values(state.counts))eq(count,1);
   const data=await api('get',{},false);eq(data.success,true);eq(data.object.adapterBuild.state,'ready');
   await p.goto(origin+'/manager/?a=index&namespace=cookie_consent');await p.locator('#ccm-save').waitFor();eq(errors,[]);
  });
  await run('native-upgrade-action-retains-owned-installation',async()=>{const snapshot=oldCtl('snapshot'),state=oldCtl('rename-state');eq(ctl('upgrade-action').success,true);eq(oldCtl('snapshot'),snapshot);eq(oldCtl('rename-state'),state);});
  writeFileSync(out+'/final-state.json',JSON.stringify(ctl('state'),null,2)+'\n');
 }catch(e){console.error(e);process.exitCode=1;}finally{await ctx.close();}
}
await browser.close();
