import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const base='c5fdf8339d4adbe2b1fea3501bd91706cc6962b9';
let n=0;const eq=(a,b,m)=>{n++;assert.deepEqual(a,b,m);};
const original=p=>execFileSync('git',['show',base+':'+p]);
const manifest=JSON.parse(readFileSync('_build/frontend-manifest.json'));
const js=Object.keys(manifest.inputs).filter(p=>p.endsWith('.js'));
const old=JSON.parse(original('_build/frontend-manifest.json'));
eq(js,Object.keys(old.inputs).filter(p=>p.endsWith('.js')),'Exact beta1 dependency order, including all video adapters');
for(const [p,h] of Object.entries(manifest.inputs))eq(sha(readFileSync(p)),h,'Release input hash '+p);
for(const [p,info] of Object.entries(manifest.outputs)){eq(sha(readFileSync(p)),info.sha256,'Release output '+p);eq(readFileSync(p).length,info.bytes);}
for(const p of js)eq(readFileSync(p),original(p),'Visitor runtime source preserved '+p);
eq(readFileSync('server/src/CookieConsentServiceRegistry.php'),original('server/src/CookieConsentServiceRegistry.php'),'Registry, SDK/category defaults unchanged');
eq(readFileSync('server/modx2-map-snippet.php'),original('server/modx2-map-snippet.php'),'Map contract unchanged');
eq(readFileSync('server/modx2-video-snippet.php'),original('server/modx2-video-snippet.php'),'Video contract unchanged');
eq(readFileSync('_build/package.json'),original('_build/package.json'),'Package version unchanged');
execFileSync(process.execPath,['_build/user-guide.mjs','--check']);
const guide=JSON.parse(readFileSync('_build/user-guide.json')).languages;
for(const lang of ['ru','en']){eq(guide[lang].sections.length,6);const code=guide[lang].sections[5].blocks.filter(b=>b.type==='code');eq(code.map(b=>b.language),['modx','html','javascript']);for(const provider of ['youtube','rutube','vk_video'])eq(code[0].text.includes('&provider=`'+provider+'`'),true);eq(code[2].text.includes("{ service: 'youtube' }"),true);}
const before=readFileSync('_build/frontend-manifest.json');execFileSync(process.execPath,['_build/frontend.mjs']);eq(readFileSync('_build/frontend-manifest.json'),before,'Node release build reproducibility');
if(process.argv.includes('--native')){
 const spec=JSON.parse(readFileSync('.local/artifacts/cookieconsent-1.0.5-beta1.inventory.json'));
 for(const p of js)eq(spec.files.filter(f=>f.target===p).map(f=>f.sha256),[sha(readFileSync(p))],'All editable JS sources shipped exactly once');
 for(const p of ['src/CookieConsentBundleManager.php','src/CookieConsentBundleInstall.php','plugins/cache-build.php','processors/bundle_rebuild.class.php','vendor/peast/LICENSE','vendor/peast/autoload.php'])eq(spec.files.find(f=>f.target==='core/components/cookieconsent/'+p)?.sha256,sha(readFileSync('server/'+p)),'Native builder ships current '+p);
 eq(spec.files.find(f=>f.target==='core/components/cookieconsent/frontend-manifest.json')?.sha256,sha(readFileSync('_build/frontend-manifest.json')));
 eq(spec.files.filter(f=>f.target.endsWith('.min.js')).map(f=>f.target),['assets/js/cookie-consent/cookie-consent.min.js'],'One prebuilt production bundle');
 eq(spec.files.some(f=>/cached-cookie-consent|build.lock|last-error/.test(f.target)),false,'No generated cache in transport');
}
console.log(JSON.stringify({result:'PASS',assertions:n,native:process.argv.includes('--native')}));
