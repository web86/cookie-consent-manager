import {chromium} from 'playwright';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
import {retain} from '../elements/assertions.mjs';
const base=JSON.parse(readFileSync('_build/package.json')).release_index;
const sig=n=>'cookieconsent-0.1.0-beta'+n;
const dir='.local/native-minimal-evidence';mkdirSync(dir,{recursive:true});
const dc=['compose','--env-file','.local/private/compose.env','-f','tests/local/compose.yaml','-f','tests/transport/compose.yaml','exec','-T'];
const privateDir=s=>s==='web'?'/opt/cc-private':s==='clean'?'/opt/cc-clean':'/opt/cc-publiccore';
const cli=(s,args,input)=>execFileSync('docker',[...dc,s,...args],{input,encoding:'utf8',maxBuffer:12*1024*1024}).trim();
const control=(s,action,key,input)=>cli(s,['php','/opt/cc-source/tests/transport/control.php',action,privateDir(s),...(key?[key]:[])],input);
const snapshot=s=>JSON.parse(control(s,'snapshot'));
const results=[],snapshots=[];let assertions=0;
function eq(a,b,m){assertions++;assert.deepEqual(a,b,m);}function ok(a,m){assertions++;assert.ok(a,m);}
async function test(name,fn){const count=assertions;try{await fn();results.push({name,result:'PASS',assertions:assertions-count});console.log('PASS '+name);}catch(e){results.push({name,result:'FAIL',assertions:assertions-count,error:e.message});throw e;}}
function preserve(a,b){retain(a,b,eq);}
const browser=await chromium.launch();
async function manager(s,port){const origin='http://127.0.0.1:'+port,ctx=await browser.newContext({viewport:{width:1440,height:1000}});await ctx.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());const p=await ctx.newPage(),creds=JSON.parse(control(s,'credentials'));await p.goto(origin+'/manager/',{waitUntil:'networkidle'});await p.locator('#modx-login-username').fill(creds.username);await p.locator('#modx-login-password').fill(creds.password);await p.locator('#modx-login-btn').click();await p.waitForFunction(()=>window.MODx?.siteId);const token=await p.evaluate(()=>MODx.siteId);
 const processor=async(action,form={})=>(await ctx.request.post(origin+'/connectors/index.php',{form:{action:'workspace/packages/'+action,HTTP_MODAUTH:token,...form},headers:{modAuth:token}})).json();
 const upload=async n=>{control(s,'archive-extracted',sig(n));const filename=sig(n)+'.transport.zip';const r=await ctx.request.post(origin+'/connectors/index.php',{multipart:{action:'workspace/packages/upload',HTTP_MODAUTH:token,file:{name:filename,mimeType:'application/zip',buffer:readFileSync('.local/artifacts/'+filename)}},headers:{modAuth:token}});eq((await r.json()).success,true);eq((await processor('scanlocal')).success,true);};
 return {ctx,p,origin,processor,upload,install:n=>processor('install',{signature:sig(n)}),uninstall:(n,mode='0')=>processor('uninstall',{signature:sig(n),preexisting_mode:mode})};
}
try{
const m=await manager('clean',8889);
await test('native-verification-failure-is-partial-and-does-not-claim-rollback',async()=>{const before=snapshot('clean');await m.upload(91);eq((await m.install(91)).success,false);const after=snapshot('clean');for(const key of ['settings','menus','resources','templates','policies','data','auditRegistry'])eq(after[key],before[key]);for(const [key,value]of Object.entries(before.elements))eq(after.elements[key],value);ok(JSON.stringify(after.runtime)!==JSON.stringify(before.runtime),'Partial runtime explicitly detected');eq(after.legacyStateExists,false);snapshots.push({stage:'native-partial-failure',before,after,atomicRollback:'NOT CLAIMED'});eq((await m.install(base+1)).success,true);eq(snapshot('clean').runtime,before.runtime,'Native reinstall repairs files');});await m.ctx.close();
const manual=await manager('web',8888);await test('actual-consent-and-history-retained-across-native-reinstall',async()=>{const visitor=await manual.ctx.newPage();await visitor.goto(manual.origin,{waitUntil:'networkidle'});const post=visitor.waitForResponse(r=>r.url().endsWith('/audit.php')&&r.status()===200);await visitor.locator('[data-cc-action=accept-all]').click();await post;const consent=await visitor.evaluate(()=>localStorage.getItem('web86_cookie_consent'));const before=snapshot('web');eq((await manual.install(base+1)).success,true);preserve(before,snapshot('web'));await visitor.reload({waitUntil:'networkidle'});eq(await visitor.evaluate(()=>localStorage.getItem('web86_cookie_consent')),consent);await visitor.close();});await manual.ctx.close();
}catch(e){console.error(e.message);process.exitCode=1;}finally{await browser.close();writeFileSync(dir+'/partial-results.json',JSON.stringify({suite:'Native limitations and actual consent',tests:results.length,assertions,failed:results.filter(x=>x.result==='FAIL').length,results,snapshots},null,2));}
