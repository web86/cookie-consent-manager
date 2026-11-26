import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname,basename} from 'node:path';
import {chromium} from 'playwright';
const [path,candidate,previous]=process.argv.slice(2);assert.ok(path&&candidate&&previous,'Usage: upgrade.mjs CASE_DIR CANDIDATE_ZIP PREVIOUS_ZIP');
const directory=resolve(path),service=basename(directory),compose=['compose','--env-file',resolve(dirname(directory),'compose.env'),'-f',resolve(directory,'compose.json')];
const cli=(script,...args)=>execFileSync('docker',[...compose,'exec','-T','-u','www-data',service,'php','/opt/cc-source/tests/'+script+'/fixture.php',...args],{encoding:'utf8'}).trim();
const install=zip=>cli('modstore','install',zip);
install(previous);cli('modstore','configure');cli('custom-js-attributes','seed-legacy');
const settings=cli('custom-js-attributes','snapshot');
const port=JSON.parse(readFileSync(resolve(directory,'compose.json'))).services[service].environment.CC_MODSTORE_PORT,origin='http://127.0.0.1:'+port;
const browser=await chromium.launch(),context=await browser.newContext(),page=await context.newPage();
const external=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
await context.route('**/*',route=>{if(new URL(route.request().url()).origin===origin)return route.continue();external.push(route.request().url());return route.abort();});
const state=()=>page.evaluate(()=>({raw:localStorage.getItem('web86_cookie_consent'),fingerprints:web86Providers.services.map(s=>[s.key,s.fingerprint]),runs:[...(window.__customScriptRuns||[])].sort((a,b)=>a.path.localeCompare(b.path))}));
let result={result:'FAIL'};
try{
 await page.goto(origin+'/',{waitUntil:'networkidle'});assert.deepEqual((await state()).runs,[]);await page.locator('[data-cc-action=accept-all]').click();await page.waitForFunction(()=>window.__customScriptRuns?.length===2);const old=await state();
 install(candidate);assert.equal(cli('custom-js-attributes','snapshot'),settings,'Native upgrade preserves exact settings bytes');
 await page.reload({waitUntil:'networkidle'});const current=await state();assert.deepEqual(current,old,'Exact pre-feature fingerprints, stored consent and local script execution survive native transport upgrade');assert.equal(await page.locator('[data-cc-action=accept-all]').isVisible(),false);
 assert.deepEqual(external,[]);assert.deepEqual(errors,[]);result={result:'PASS',previous,candidate,checks:['settings bytes preserved','origin custom fingerprints preserved','raw stored consent preserved','no reconsent banner','both permitted local scripts execute once','no external requests or browser errors']};console.log('PASS real previous transport → candidate upgrade retains old consent and fingerprints');
}catch(e){console.error(e.stack);process.exitCode=1;result.error=e.stack;}finally{await browser.close();writeFileSync(resolve(directory,'evidence/custom-js-upgrade.json'),JSON.stringify(result,null,2)+'\n');}
