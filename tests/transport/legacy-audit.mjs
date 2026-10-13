import {chromium} from 'playwright';
import {execFileSync} from 'node:child_process';
import {writeFileSync,readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const target=JSON.parse(readFileSync('_build/package.json')).release_index;
const dc=['compose','--env-file','.local/private/compose.env','-f','tests/local/compose.yaml','-f','tests/transport/compose.yaml','exec','-T'];
const cli=(args,input)=>execFileSync('docker',[...dc,'publiccore',...args],{encoding:'utf8',input}).trim();
const ctl=(op,key,input)=>cli(['php','/opt/cc-source/tests/transport/control.php',op,'/opt/cc-publiccore',...(key?[key]:[])],input);
const original=Object.fromEntries(['cookie_consent.log_dir','cookie_consent.audit_config_file'].map(k=>[k,ctl('get',k)]));
const legacyFile='/opt/cc-publiccore/configs/legacy-audit-'+Date.now()+'.json';
const auditBefore=ctl('get','cookie_consent.audit'),registryBefore=JSON.parse(ctl('snapshot')).auditRegistry;
const origin='http://127.0.0.1:8890',browser=await chromium.launch(),ctx=await browser.newContext(),p=await ctx.newPage();let assertions=0;const results=[];const eq=(a,b,m)=>{assertions++;assert.deepEqual(a,b,m);};
await ctx.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
try{
 cli(['sh','-c','mkdir -p /opt/cc-publiccore/logs /opt/cc-publiccore/configs; chown www-data:www-data /opt/cc-publiccore/logs /opt/cc-publiccore/configs']);
 execFileSync('docker',[...dc,'-u','www-data','publiccore','php','/var/www/html/core/components/cookieconsent/bin/configure-audit.php','/var/www/html',legacyFile,origin],{stdio:'pipe'});
 ctl('set','cookie_consent.log_dir','/opt/cc-publiccore/logs');ctl('set','cookie_consent.audit_config_file',legacyFile);
 const c=JSON.parse(ctl('credentials'));await p.goto(origin+'/manager/');await p.locator('#modx-login-username').fill(c.username);await p.locator('#modx-login-password').fill(c.password);await p.locator('#modx-login-btn').click();await p.waitForFunction(()=>window.MODx?.siteId);await p.goto(origin+'/manager/?a=index&namespace=cookie_consent');await p.locator('#ccm-save').waitFor();const token=await p.evaluate(()=>MODx.siteId);
 const api=async action=>(await ctx.request.post(origin+'/assets/components/cookieconsent/connector.php',{headers:{modAuth:token},form:{action,HTTP_MODAUTH:token}})).json();
 eq((await api('get')).object.auditStatus,{state:'ready',source:'setting'});eq(await p.locator('#ccm-audit-config').count(),0);eq((await api('audit_setup')).success,true);eq(ctl('get','cookie_consent.audit'),auditBefore);eq(JSON.parse(ctl('snapshot')).auditRegistry,registryBefore);eq((await api('audit_test')).success,true);
 const before=JSON.parse(ctl('snapshot'));const native=async action=>(await ctx.request.post(origin+'/connectors/index.php',{headers:{modAuth:token},form:{action:'workspace/packages/'+action,HTTP_MODAUTH:token,signature:'cookieconsent-0.1.0-beta'+target,preexisting_mode:'0'}})).json();
 for(const action of ['install','uninstall','install']){eq((await native(action)).success,true);const after=JSON.parse(ctl('snapshot'));for(const k of ['settings','auditRegistry','menus','resources','templates','policies','data','elements'])eq(after[k],before[k],k+' retained');}
 eq((await api('get')).object.auditStatus.source,'setting');results.push({name:'legacy-private-JSON-priority-hidden-path-local-check-native-retention',result:'PASS',assertions});
}catch(e){results.push({name:'legacy-private-JSON-priority-hidden-path-local-check-native-retention',result:'FAIL',error:e.message});console.error(e.message);process.exitCode=1;}finally{await browser.close();for(const [k,v]of Object.entries(original))ctl('set',k,v);writeFileSync('.local/manager-ux-evidence/legacy-audit-results.json',JSON.stringify({suite:'Legacy private JSON migration',tests:results.length,assertions,failed:results.filter(x=>x.result==='FAIL').length,results},null,2));}
console.log(JSON.stringify(results));
