import {chromium} from 'playwright';
import {readFileSync,writeFileSync,createWriteStream,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn,execFileSync} from 'node:child_process';
import http from 'node:http';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const repo=fileURLToPath(new URL('../../',import.meta.url));
const scenario=process.env.CC_NATIVE_SCENARIO||'upgrade';
const work=process.env.CC_NATIVE_WORK,config=JSON.parse(readFileSync(join(work,'private/config.json'))),origin=config.origin;
const fixture=join(repo,'tests/windows-native/fixture.php'),router=join(repo,'tests/windows-native/router.php');
const ctl=(...args)=>execFileSync('php',[fixture,...args],{encoding:'utf8',env:process.env}).trim();
const results=[],children=[];
const record=(name,detail={})=>{results.push({name,result:'PASS',...detail});console.log('PASS '+name);save();};
const save=(status='RUNNING')=>writeFileSync(join(work,'evidence/native-results.json'),JSON.stringify({status,os:process.platform,php:execFileSync('php',['-r','echo PHP_VERSION;'],{encoding:'utf8'}),modx:config.modx,source_sha:config.source_sha,scenario,checks:results},null,2)+'\n');
let proxy,browser;
try{
 for(const port of [8091,8092]){
  const log=createWriteStream(join(work,'private/php-'+port+'.log'));
  const p=spawn('php',['-d','display_errors=0','-d','log_errors=1','-d','memory_limit=512M','-d','upload_max_filesize=32M','-d','post_max_size=40M','-S','127.0.0.1:'+port,'-t',config.site,router],{env:process.env,stdio:['ignore','pipe','pipe']});p.stdout.pipe(log);p.stderr.pipe(log);children.push(p);
 }
 // Route audit to a second native PHP worker to support backend HTTP self-checks.
 proxy=http.createServer((request,response)=>{const audit=request.url.split('?')[0]==='/files/components/'+config.product+'/audit.php';const upstream=http.request({host:'127.0.0.1',port:audit?8092:8091,path:request.url,method:request.method,headers:request.headers},r=>{response.writeHead(r.statusCode,r.headers);r.pipe(response);});upstream.on('error',()=>{response.writeHead(502);response.end();});request.pipe(upstream);});await new Promise(done=>proxy.listen(8090,'127.0.0.1',done));
 for(let i=0;i<80;i++){try{const r=await fetch(origin+'/manager/');if(r.status===200)break;}catch{}await new Promise(done=>setTimeout(done,250));}
 browser=await chromium.launch({channel:'chrome'});const context=await browser.newContext();await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 const page=await context.newPage();page.setDefaultTimeout(30000);await page.goto(origin+'/manager/');await page.locator('#modx-login-username').fill(config.username);await page.locator('#modx-login-password').fill(config.password);await page.locator('#modx-login-btn').click();await page.waitForFunction(()=>!!window.MODx?.siteId);record('native MODX Manager login');
 const token=await page.evaluate(()=>MODx.siteId);
 const native=async(action,form={})=>{const response=await context.request.post(origin+'/connectors/index.php',{headers:{modAuth:token,Origin:origin,Referer:origin+'/manager/'},form:{action,HTTP_MODAUTH:token,...form},timeout:180000});const raw=await response.text();assert.ok(raw,action+' returned empty HTTP '+response.status());let data;try{data=JSON.parse(raw);}catch{throw Error(action+' returned invalid JSON HTTP '+response.status()+': '+raw.slice(0,500));}assert.equal(data.success,true,JSON.stringify(data));return data;};
 const connector='/files/components/'+config.product+'/connector.php';
 const api=async(action,form={})=>{const response=await context.request.post(origin+connector,{headers:{modAuth:token,Origin:origin,Referer:origin+'/manager/'},form:{action,HTTP_MODAUTH:token,...form},timeout:180000});const data=await response.json();assert.equal(data.success,true,JSON.stringify(data));return data.object;};
 const install=async(index)=>{
  const signature=config.product+'-1.0.9-beta'+index,file=join(work,index===125?'baseline':'artifacts',signature+'.transport.zip');
  const response=await context.request.post(origin+'/connectors/index.php',{headers:{modAuth:token,Origin:origin},multipart:{action:'workspace/packages/upload',HTTP_MODAUTH:token,file:{name:signature+'.transport.zip',mimeType:'application/zip',buffer:readFileSync(file)}},timeout:180000});assert.equal((await response.json()).success,true);await native('workspace/packages/scanlocal');await native('workspace/packages/install',{signature});
  return signature;
 };
 const initial=scenario==='fresh'?126:125;let signature=await install(initial);record('native Package Manager fresh installation beta'+initial);assert.ok(JSON.parse(ctl('working')).adapter_history.includes('1.0.9-beta'+initial));record('installed adapter synchronization and PHP JS build');
 const open=async()=>{await page.goto(origin+'/manager/?a=index&namespace=cookie_consent');await page.locator('#ccm-save').waitFor();};
 await open();await page.locator('#ccm-ttl').fill('137');await page.locator('#ccm-advanced').evaluate(el=>el.open=true);await page.locator('#ccm-log-mode').selectOption('absolute');await page.locator('#ccm-log-dir').fill(join(work,'private/logs').replaceAll('\\','/'));
 const savedResponse=page.waitForResponse(r=>r.url().includes('/connector.php')&&new URLSearchParams(r.request().postData()||'').get('action')==='save');await page.locator('#ccm-save').click();const saved=await (await savedResponse).json();assert.equal(saved.success,true,JSON.stringify(saved));assert.equal(saved.object.partial,false,JSON.stringify(saved));await page.waitForFunction(()=>document.querySelector('#ccm-status')?.dataset.state==='saved');
 await page.reload();await page.locator('#ccm-save').waitFor();assert.equal(await page.locator('#ccm-ttl').inputValue(),'137');record('Manager UI settings save and reload with native persistence');
 const before=JSON.parse(ctl('snapshot'));const edit=JSON.parse(ctl('edit-adapter'));
 if(scenario==='upgrade'){signature=await install(126);assert.deepEqual(JSON.parse(ctl('snapshot')),before,'Native upgrade preserves all settings and element IDs');const working=JSON.parse(ctl('working'));assert.ok(working.adapter_history.includes('1.0.9-beta125'));assert.ok(working.adapter_history.includes('1.0.9-beta126'));record('native Package Manager upgrade beta125 to beta126',{history:working.adapter_history});}
 assert.equal((await api('get')).packageVersion,'1.0.9-beta126');
 await open();await page.locator('#ccm-advanced').evaluate(el=>el.open=true);const rebuilt=page.waitForResponse(r=>r.url().includes('/connector.php')&&new URLSearchParams(r.request().postData()||'').get('action')==='bundle_rebuild');await page.locator('#ccm-bundle-rebuild').click();assert.equal((await (await rebuilt).json()).success,true);await page.waitForFunction(()=>document.querySelector('#ccm-build-status')?.dataset.state==='ready');record('Manager UI adapter rebuild');
 await native('system/clearcache');record('native cache clear and build plugin');
 const event={schema:3,event_id:randomUUID(),consent_id:randomUUID(),event:'reject',stage:'committed',analytics:false,marketing:false,external_content:false,policy_version:'1',page:'/',timestamp:new Date().toISOString()};const response=await context.request.post(origin+'/files/components/'+config.product+'/audit.php',{headers:{Origin:origin,'Content-Type':'application/json'},data:event});assert.equal(response.status(),200,await response.text());assert.equal((await response.json()).event_id,event.event_id);record('actual audit HTTP acknowledgement');
 await page.locator('#ccm-tab-logs').click();await page.waitForFunction(()=>Number(document.querySelector('#ccm-log-total')?.textContent?.match(/\d+/)?.[0])>0);await page.screenshot({path:join(work,'evidence/manager-audit.png'),fullPage:true});record('Manager UI audit log reader');
 ctl('snapshot-uninstall');await native('workspace/packages/uninstall',{signature});const removed=JSON.parse(ctl('verify-uninstall'));assert.equal(removed.result,'PASS');record('native Package Manager uninstall',{retained:removed.checks});
 save('PASS');
}catch(error){save('FAIL');console.error(error.stack);for(const file of [join(work,'private/php-8091.log'),join(work,'private/core/cache/logs/error.log')]){try{const diagnostic=readFileSync(file,'utf8').split('\n').filter(line=>/Fatal|Uncaught|Warning|ERROR|incomplete|uninstall|Adapter build/.test(line)&&!line.includes('HTTP_MODAUTH')).slice(-25).join('\n').replaceAll(config.password,'[REDACTED]');console.error(diagnostic);}catch{}}process.exitCode=1;}
finally{if(browser)await browser.close();if(proxy)await new Promise(done=>proxy.close(done));for(const child of children)child.kill();}
