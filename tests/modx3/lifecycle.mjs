import {chromium} from 'playwright';import assert from 'node:assert/strict';import {manager,control,cli} from './helpers.mjs';import {readFileSync,writeFileSync} from 'node:fs';
const signature='cookieconsent3-0.1.0-beta2',folder='.local/modx3/artifacts/beta2-a',spec=JSON.parse(readFileSync(folder+'/'+signature+'.inventory.json'));
const browser=await chromium.launch(),s=await manager(browser,'clean'),results=[];let assertions=0;
const eq=(a,b,m)=>{assertions++;assert.deepEqual(a,b,m)},ok=(v,m)=>{assertions++;assert.ok(v,m)},test=async(name,fn)=>{const start=assertions;try{await fn();results.push({name,result:'PASS',assertions:assertions-start});console.log('PASS '+name)}catch(e){results.push({name,result:'FAIL',assertions:assertions-start,error:e.message});throw e;}};
const retained=(a,b)=>{for(const name of Object.keys(a.elements)){eq(b.elements[name].id,a.elements[name].id,name+' ID');eq(b.elements[name].metadata,a.elements[name].metadata,name+' metadata');eq(b.elements[name].count,1);}eq(b.settings,a.settings);for(const[key,value]of Object.entries(a.relations))eq(b.relations[key],value);eq(b.data,a.data);};
let before,after,raw,p;
try{
 const prior=await s.core('workspace/packages/get',{signature});
 const firstName=prior.success&&prior.object.installed?'native-beta2-reinstall-consent-and-five-metadata-retention':'genuine-native-beta1-to-beta2-consent-and-five-metadata-retention';
 if(firstName.startsWith('genuine')){const old=await s.core('workspace/packages/get',{signature:'cookieconsent3-0.1.0-beta1'});ok(old.success&&old.object.installed,'Genuine upgrade requires installed beta1 baseline');}
 await test(firstName,async()=>{
  p=await s.ctx.newPage();await p.goto(s.origin+'/',{waitUntil:'networkidle'});if(await p.locator('[data-cc-action=accept-all]').isVisible())await p.locator('[data-cc-action=accept-all]').click();else{await p.evaluate(()=>web86CookieConsent.openSettings());for(const cat of ['analytics','marketing','external_content'])await p.locator('[data-cc-category='+cat+']').check();await p.locator('[data-cc-action=save]').click();}await p.waitForTimeout(600);raw=await p.evaluate(()=>localStorage.getItem('web86_cookie_consent'));ok(raw);const id=await p.evaluate(()=>web86CookieConsent.getConsent().consentId);
  control('clean','customize');control('clean','external-config');before=control('clean','snapshot');const staticHash=cli('clean',['php','-r','echo hash_file("sha256","/opt/cc-private/owner-static-map.php");']);
  await s.install(signature,folder);after=control('clean','snapshot');retained(before,after);for(const value of Object.values(after.elements))eq(value.static,false);eq(cli('clean',['php','-r','echo hash_file("sha256","/opt/cc-private/owner-static-map.php");']),staticHash);
  await p.reload({waitUntil:'networkidle'});eq(await p.evaluate(()=>localStorage.getItem('web86_cookie_consent')),raw);eq(await p.evaluate(()=>web86CookieConsent.getConsent().consentId),id);eq(await p.locator('[data-cc-action=reject]').isVisible(),false);ok(await p.locator('[data-cc-map-provider] iframe').count()>=2);
  const get=await s.core('workspace/packages/get',{signature});eq(get.success,true);ok(get.object.installed);eq(JSON.stringify(get).includes('setup-options'),false);
 });
 await test('modx3-unique-name-schema-refuses-duplicate-canonical-without-state-change',async()=>{const a=control('clean','snapshot');const duplicate=control('clean','duplicate');eq(duplicate.saved,false);eq(duplicate.count,1);eq(control('clean','snapshot'),a);});
 await test('native-reinstall-metadata-data-and-55-file-hashes',async()=>{const a=control('clean','snapshot');await s.install(signature,folder);const b=control('clean','snapshot');retained(a,b);for(const file of spec.files){const target='/var/www/html/'+file.target;eq(b.runtime[target],file.sha256,file.target);}});
 await test('native-backup-recovery-dry-run-and-apply-retains-identities',async()=>{
  control('clean','customize','db-backed');const a=control('clean','snapshot');await s.install(signature,folder);
  const dry=JSON.parse(cli('clean',['php','/var/www/html/core/components/cookieconsent/bin/restore-elements.php','/var/www/html',signature]));eq(dry.applied,false);eq(dry.elements.length,5);
  const restored=JSON.parse(cli('clean',['php','/var/www/html/core/components/cookieconsent/bin/restore-elements.php','/var/www/html',signature,'--apply']));eq(restored.applied,true);const b=control('clean','snapshot');retained(a,b);for(const name of Object.keys(a.elements))eq(b.elements[name].code_sha256,a.elements[name].code_sha256);
  await s.install(signature,folder);
 });
 await test('native-uninstall-removes-exact-runtime-retains-owner-files-elements-settings-key-logs',async()=>{
  cli('clean',['php','-r','file_put_contents("/var/www/html/assets/components/cookieconsent/owner-file.txt","owner-retained");']);const a=control('clean','snapshot');const r=await s.core('workspace/packages/uninstall',{signature});eq(r.success,true);const b=control('clean','snapshot');retained(a,b);eq(b.elements,a.elements);for(const file of spec.files)eq(Object.hasOwn(b.runtime,'/var/www/html/'+file.target),false,file.target+' removed');eq(cli('clean',['php','-r','echo file_get_contents("/var/www/html/assets/components/cookieconsent/owner-file.txt");']),'owner-retained');await s.install(signature,folder);eq((await s.api('get')).success,true);
 });
}catch(e){console.error(e.message);process.exitCode=1;}finally{await s.ctx.close();await browser.close();writeFileSync('.local/modx3/evidence/lifecycle.json',JSON.stringify({signature,tests:results.length,assertions,failed:results.filter(x=>x.result==='FAIL').length,before,after,results},null,2));}
