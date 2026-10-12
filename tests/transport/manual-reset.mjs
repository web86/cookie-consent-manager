import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
const dir='.local/transport-evidence';mkdirSync(dir,{recursive:true});
const compose=['compose','--env-file','.local/private/compose.env','-f','tests/local/compose.yaml','-f','tests/transport/compose.yaml','exec','-T'];
function cli(service,args,input){return execFileSync('docker',[...compose,service,...args],{input,encoding:'utf8',maxBuffer:10*1024*1024}).trim();}
function control(s,op,key,input){const privatePath=s==='clean'?'/opt/cc-clean':s==='publiccore'?'/opt/cc-publiccore':'/opt/cc-private';return cli(s,['php','/opt/cc-source/tests/transport/control.php',op,privatePath,...(key?[key]:[])],input);}
let assertions=0;const results=[];
function eq(a,b,m){assertions++;assert.deepEqual(a,b,m);}function ok(a,m){assertions++;assert.ok(a,m);}
async function test(name,fn){const initialAssertions=assertions;try{await fn();results.push({name,result:'PASS',assertions:assertions-initialAssertions});console.log('PASS '+name);}catch(e){results.push({name,result:'FAIL',assertions:assertions-initialAssertions,error:e.message});console.error('FAIL '+name+': '+e.message);throw e;}}
const browser=await chromium.launch();
async function manager(s,port){const ctx=await browser.newContext({viewport:{width:1440,height:1000}});const origin='http://127.0.0.1:'+port;await ctx.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());const p=await ctx.newPage();const cred=JSON.parse(control(s,'credentials'));await p.goto(origin+'/manager/',{waitUntil:'networkidle'});await p.locator('#modx-login-username').fill(cred.username);await p.locator('#modx-login-password').fill(cred.password);await p.locator('#modx-login-btn').click();await p.waitForFunction(()=>window.MODx?.siteId);const token=await p.evaluate(()=>MODx.siteId);
 async function processor(action,values={}){const response=await ctx.request.post(origin+'/connectors/index.php',{form:{action:'workspace/packages/'+action,HTTP_MODAUTH:token,...values},headers:{modAuth:token}});const raw=await response.text();try{return JSON.parse(raw);}catch{throw new Error('Native processor returned non-JSON: '+raw.slice(0,180));}}
 async function upload(n){control(s,'drop-extracted','cookieconsent-0.1.0-beta'+n);const file='.local/artifacts/cookieconsent-0.1.0-beta'+n+'.transport.zip';const uploaded=await ctx.request.post(origin+'/connectors/index.php',{multipart:{action:'workspace/packages/upload',HTTP_MODAUTH:token,file:{name:file.split('/').pop(),mimeType:'application/zip',buffer:readFileSync(file)}},headers:{modAuth:token}});eq(uploaded.ok(),true,'Upload HTTP');eq((await uploaded.json()).success,true,'Native upload accepted');eq((await processor('scanlocal')).success,true,'Native scanlocal');}
 async function install(n,options={}){return processor('install',{signature:'cookieconsent-0.1.0-beta'+n,...options});}
 async function uninstall(n){return processor('uninstall',{signature:'cookieconsent-0.1.0-beta'+n,preexisting_mode:'0'});}
 return {ctx,p,processor,upload,install,uninstall,origin};}
function snapshot(s){return JSON.parse(control(s,'snapshot'));}
function unchanged(a,b){for(const k of ['templates','resources','policies'])eq(b[k],a[k],k+' unchanged');for(const [k,v]of Object.entries(a.settings))if(!k.startsWith('cookie_consent.package_'))eq(b.settings[k],v,'User setting preserved '+k);for(const [k,v]of Object.entries(a.elements))eq(b.elements[k],v,'User element preserved '+k);}
try{const m=await manager('web',8888);const before=snapshot('web');eq((await m.uninstall(2)).success,true);unchanged(before,snapshot('web'));control('web','reset-manual-baseline');await m.ctx.close();console.log('Native manual uninstall retained data; fixture restored for final migration');}finally{await browser.close();}
