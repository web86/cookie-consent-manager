import {chromium} from 'playwright';
import {execFileSync} from 'node:child_process';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {canonical,sources} from '../elements/assertions.mjs';
const target=JSON.parse(readFileSync('_build/package.json')).release_index;const baseline=Number(process.env.CC_UPGRADE_BASELINE||5);
const service=process.env.CC_UPGRADE_SERVICE||'web';if(!['web','publiccore'].includes(service))throw Error('fixture name');const priv=service==='web'?'/opt/cc-private':'/opt/cc-publiccore';
const dir='.local/manager-ux-evidence';mkdirSync(dir,{recursive:true});
const dc=['compose','--env-file','.local/private/compose.env','-f','tests/local/compose.yaml','-f','tests/transport/compose.yaml','exec','-T',service];
const ctl=(action,key)=>execFileSync('docker',[...dc,'php','/opt/cc-source/tests/transport/control.php',action,priv,...(key?[key]:[])],{encoding:'utf8'}).trim();
const browser=await chromium.launch(),ctx=await browser.newContext(),p=await ctx.newPage(),origin='http://127.0.0.1:'+(service==='web'?8888:8890);const results=[];let assertions=0;
const eq=(a,b,m)=>{assertions++;assert.deepEqual(a,b,m);};
await ctx.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
try{
 const c=JSON.parse(ctl('credentials'));await p.goto(origin+'/manager/');await p.locator('#modx-login-username').fill(c.username);await p.locator('#modx-login-password').fill(c.password);await p.locator('#modx-login-btn').click();await p.waitForFunction(()=>window.MODx?.siteId);const token=await p.evaluate(()=>MODx.siteId);
 const processor=async(action,form={})=>(await ctx.request.post(origin+'/connectors/index.php',{form:{action:'workspace/packages/'+action,HTTP_MODAUTH:token,...form},headers:{modAuth:token}})).json();
 const upload=async(n,path)=>{const name='cookieconsent-0.1.0-beta'+n;ctl('archive-extracted',name);const r=await ctx.request.post(origin+'/connectors/index.php',{headers:{modAuth:token},multipart:{action:'workspace/packages/upload',HTTP_MODAUTH:token,file:{name:name+'.transport.zip',mimeType:'application/zip',buffer:readFileSync(path)}}});eq((await r.json()).success,true);eq((await processor('scanlocal')).success,true);};
 await upload(baseline,'.local/release/cookieconsent-0.1.0-beta'+baseline+'.transport.zip');eq((await processor('install',{signature:'cookieconsent-0.1.0-beta'+baseline})).success,true);
 let visitor,consent;
 if(service==='web'){
  visitor=await ctx.newPage();await visitor.goto(origin,{waitUntil:'networkidle'});const audit=visitor.waitForResponse(r=>r.url().endsWith('/audit.php')&&r.status()===200);await visitor.locator('[data-cc-action=accept-all]').click();await audit;consent=await visitor.evaluate(()=>localStorage.getItem('web86_cookie_consent'));eq(typeof consent,'string');
 }else{ctl('customize');eq(Object.keys(JSON.parse(ctl('snapshot')).settings).length,baseline>=7?6:5);}
 const before=JSON.parse(ctl('snapshot'));
 await upload(target,'.local/artifacts/cookieconsent-0.1.0-beta'+target+'.transport.zip');eq((await processor('install',{signature:'cookieconsent-0.1.0-beta'+target})).success,true);const after=JSON.parse(ctl('snapshot'));
 for(const [k,v]of Object.entries(before.settings))eq(after.settings[k],v,k+' retained');for(const k of ['menus','resources','templates','policies','data','auditRegistry'])eq(after[k],before[k],k+' retained');for(const[k,v]of Object.entries(before.elements)){if(canonical[k]){eq(after.elements[k].id,v.id,k+' ID retained');eq(after.elements[k].metadata_sha256,v.metadata_sha256,k+' metadata retained');}else eq(after.elements[k],v,k+' old stock retained');}sources(after,target,eq);eq(Object.keys(after.elements).sort(),Object.keys(before.elements).sort(),'No new stock/duplicates');if(visitor){await visitor.waitForTimeout(2200);await visitor.reload({waitUntil:'networkidle'});eq(await visitor.evaluate(()=>localStorage.getItem('web86_cookie_consent')),consent);eq(await visitor.locator('#cookie-block').isVisible(),target>=11);}else{eq(Object.keys(after.settings).length,6);eq(after.settings['cookie_consent.audit'], 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');eq(Object.hasOwn(after.elements,'modSnippet:CookieConsent'),true);eq(Object.hasOwn(after.elements,'modSnippet:CookieConsentMap'),true);}results.push({name:service==='web'?`actual-native-beta${baseline}-to-beta${target}-preserves-settings-elements-consent-JSONL`:`fresh-beta${baseline}-to-beta${target}-customized-upgrade`,result:'PASS',assertions});if(visitor)await visitor.close();
}catch(e){results.push({name:'actual-native-beta5-to-beta7-preservation',result:'FAIL',error:e.message});console.error(e);process.exitCode=1;}finally{await browser.close();writeFileSync(dir+'/beta'+baseline+'-upgrade-'+service+'-results.json',JSON.stringify({suite:`Native immutable beta${baseline} → beta${target}`,tests:results.length,assertions,failed:results.filter(x=>x.result==='FAIL').length,results},null,2));}
console.log(JSON.stringify(results));
