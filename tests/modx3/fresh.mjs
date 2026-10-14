import {chromium} from 'playwright';import {manager,control,cli} from './helpers.mjs';import {readFileSync,writeFileSync} from 'node:fs';import assert from 'node:assert/strict';
const signature='cookieconsent3-0.1.0-beta2',folder='.local/modx3/artifacts/beta2-a',spec=JSON.parse(readFileSync(folder+'/'+signature+'.inventory.json'));
const browser=await chromium.launch(),s=await manager(browser,'fresh'),results=[];let assertions=0;
const eq=(a,b,m)=>{assertions++;assert.deepEqual(a,b,m)};
try{
 const before=control('fresh','snapshot');eq(Object.keys(before.elements),[]);eq(Object.keys(before.settings),[]);
 await s.install(signature,folder);const after=control('fresh','snapshot'),r=await s.api('get');eq(r.success,true);
 eq(r.object.options.categories,{analytics:false,marketing:false,external_content:false});eq(r.object.options.category_versions,{analytics:0,marketing:0,external_content:0});eq(r.object.options.ttl_days,90);eq(r.object.options.policy_version,'1');eq(r.object.registry.services.length,9);
 for(const service of r.object.registry.services){eq(service.enabled,false);eq(Object.hasOwn(service.config,'id'),false);}
 eq(r.object.log_dir,'/var/www/html/core/cache/logs/');eq(r.object.audit_config_file,'');eq(r.object.auditStatus.state,'not_configured');eq(Object.keys(after.elements).length,5);for(const e of Object.values(after.elements))eq(e.count,1);
 eq(Object.keys(after.settings).length,6);
 eq(cli('fresh',['php','-r','define("MODX_API_MODE",true);ob_start();require "/var/www/html/index.php";while(ob_get_level())ob_end_clean();require "/opt/cc-source/tests/modx3/guard.php";echo $modx->getCount(\MODX\Revolution\modSnippet::class,["name"=>"CookieConsentRegistry"]);']),'0');
 for(const file of spec.files)eq(after.runtime['/var/www/html/'+file.target],file.sha256,file.target);
 await s.p.goto(s.origin+'/manager/?a=index&namespace=cookie_consent');await s.p.locator('#ccm-save').waitFor();eq(await s.p.locator('#ccm-category-visible-analytics').isChecked(),false);
 await s.p.screenshot({path:'.local/modx3/evidence/fresh-beta2.png',fullPage:true});results.push({name:'final-beta2-native-fresh-defaults-five-elements-55-files-aliases-off',result:'PASS',before,after});console.log('PASS fresh beta2 defaults');
}catch(e){results.push({name:'fresh-beta2',result:'FAIL',error:e.message});console.error(e.message);process.exitCode=1;}finally{await s.ctx.close();await browser.close();writeFileSync('.local/modx3/evidence/fresh.json',JSON.stringify({signature,tests:results.length,assertions,failed:results.filter(x=>x.result==='FAIL').length,results},null,2));}
