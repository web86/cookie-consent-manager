// Actual native upgrade/reinstall within the renamed package family (test-only successor).
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
const local='.local/package-rename',cases=JSON.parse(readFileSync(local+'/'+(process.env.CC_RENAME_FINAL?'final-all-cases.json':'all-cases.json'))).filter(c=>c.fresh&&(!process.argv[2]||c.name===process.argv[2]));
const browser=await chromium.launch();
for(const c of cases){
 const f=local+'/'+c.name,out=f+'/evidence',origin='http://127.0.0.1:'+c.port,compose=['compose','--env-file',f+'/private/compose.env','-f',f+'/compose.yaml'];
 const ctl=(op,...args)=>JSON.parse(execFileSync('docker',[...compose,'exec','-T','web','php','/opt/cc-source/tests/package-rename/fixture.php',op,...args],{encoding:'utf8'}));
 let n=0;const eq=(a,b,m)=>{n++;assert.deepEqual(a,b,m)};
 const ctx=await browser.newContext();await ctx.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 try{
  const p=await ctx.newPage();await p.goto(origin+'/manager/');const credentials=JSON.parse(readFileSync(f+'/private/manager.json'));
  await p.locator('#modx-login-username').fill(credentials.username);await p.locator('#modx-login-password').fill(credentials.password);await p.locator('#modx-login-btn').click();await p.waitForFunction(()=>window.MODx?.siteId);
  const token=await p.evaluate(()=>MODx.siteId),api=async(action,form={})=>(await ctx.request.post(origin+'/connectors/index.php',{headers:{modAuth:token},form:{action,HTTP_MODAUTH:token,...form},timeout:120000})).json();
  const old='cookieconsentmanager-1.0.8-pl4',sig='cookieconsentmanager-1.0.9-pl1';const file=f+'/site/assets/js/cookie-consent/services/yandex.js';writeFileSync(file,Buffer.concat([readFileSync(file),Buffer.from('\n// native successor preservation probe\n')]));
  const before=ctl('snapshot'),state=ctl('rename-state'),bytes=readFileSync(local+'/artifacts/test-upgrade'+(process.env.CC_RENAME_FINAL?'-final':'')+'/'+sig+'.transport.zip');
  const upload=await ctx.request.post(origin+'/connectors/index.php',{headers:{modAuth:token},multipart:{action:'workspace/packages/upload',HTTP_MODAUTH:token,file:{name:sig+'.transport.zip',mimeType:'application/zip',buffer:bytes}},timeout:120000});eq((await upload.json()).success,true);eq((await api('workspace/packages/scanlocal')).success,true);
  eq(ctl('previous-package',sig).previous,true,'Native Package Manager recognizes same-family upgrade');eq((await api('workspace/packages/install',{signature:sig})).success,true);eq(ctl('snapshot'),before,'Native same-family upgrade retains settings/data/IDs/edited adapter');
  const after=ctl('rename-state');eq(after.trees,state.trees);eq(after.foreign,state.foreign);eq(after.counts,state.counts);eq(after.history['1.0.8-pl4'],state.history['1.0.8-pl4']);eq(after.history['1.0.9-pl1'],state.history['1.0.8-pl4'],'New release baseline recorded');eq(after.packages[sig].installed,true);eq(after.packages[old].installed,true,'MODX retains prior installed timestamp; do not infer removal from upgrade');
  eq((await api('workspace/packages/install',{signature:sig})).success,true);eq(ctl('snapshot'),before);eq(ctl('rename-state'),after);
  writeFileSync(out+'/lifecycle.json',JSON.stringify({result:'PASS',assertions:n,from:old,to:sig,test_only:true},null,2)+'\n');console.log('PASS '+c.name+' native same-family upgrade/reinstall '+n);
 }catch(e){writeFileSync(out+'/lifecycle.json',JSON.stringify({result:'FAIL',assertions:n,error:e.stack},null,2)+'\n');console.error(e);process.exitCode=1;}finally{await ctx.close();}
}
await browser.close();
