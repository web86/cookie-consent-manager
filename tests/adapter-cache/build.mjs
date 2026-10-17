import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const base='b37ae9dae95ac786998d1719380a18cd39882fb7';
let n=0;const eq=(a,b,m)=>{n++;assert.deepEqual(a,b,m);};
const original=p=>execFileSync('git',['show',base+':'+p]);
const manifest=JSON.parse(readFileSync('_build/frontend-manifest.json'));
const js=Object.keys(manifest.inputs).filter(p=>p.endsWith('.js'));
const old=JSON.parse(original('_build/frontend-manifest.json'));
eq(js,Object.keys(old.inputs).filter(p=>p.endsWith('.js')),'Exact beta1 dependency order, including all video adapters');
for(const [p,h] of Object.entries(manifest.inputs))eq(sha(readFileSync(p)),h,'Release input hash '+p);
for(const [p,info] of Object.entries(manifest.outputs)){eq(sha(readFileSync(p)),info.sha256,'Release output '+p);eq(readFileSync(p).length,info.bytes);}
for(const p of js.filter(p=>!p.endsWith('/embeds.js')))eq(readFileSync(p),original(p),'Non-presentation visitor runtime source preserved '+p);
eq(readFileSync('server/src/CookieConsentServiceRegistry.php'),original('server/src/CookieConsentServiceRegistry.php'),'Registry, SDK/category defaults unchanged');
eq(readFileSync('server/modx3-map-snippet.php'),original('server/modx3-map-snippet.php'),'Map contract unchanged');
for(const file of ['CookieConsentVideoUrl.php','CookieConsentEmbedOptions.php'])eq(readFileSync('server/src/'+file),original('server/src/'+file),'Video URL/display contract unchanged');
const meta=JSON.parse(readFileSync('_build/package.json')),baseMeta=JSON.parse(original('_build/package.json'));
eq({...meta,version:baseMeta.version,release:baseMeta.release,release_index:baseMeta.release_index},baseMeta,'Only release version fields change');
execFileSync(process.execPath,['_build/version.mjs','--check']);
execFileSync(process.execPath,['_build/user-guide.mjs','--check']);
const guide=JSON.parse(readFileSync('_build/user-guide.json')).languages;
for(const lang of ['ru','en']){eq(guide[lang].sections.length,6);const code=guide[lang].sections[5].blocks.filter(b=>b.type==='code');eq(code.map(b=>b.language),['modx','html','javascript']);for(const provider of ['youtube','rutube','vk_video'])eq(code[0].text.includes('&provider=`'+provider+'`'),true);eq(code[2].text.includes("{ service: 'youtube' }"),true);}
const before=readFileSync('_build/frontend-manifest.json');execFileSync(process.execPath,['_build/frontend.mjs']);eq(readFileSync('_build/frontend-manifest.json'),before,'Node release build reproducibility');
if(process.argv.includes('--native')){
 const signature=meta.name+'-'+meta.version+(meta.release?'-'+meta.release+meta.release_index:'');
 const spec=JSON.parse(readFileSync('.local/artifacts/'+signature+'.inventory.json'));
 for(const p of js){const target=p.startsWith('assets/js/cookie-consent/services/')?'core/components/cookieconsent/adapters/services/'+p.split('/').at(-1):p;eq(spec.files.filter(f=>f.target===target).map(f=>f.sha256),[sha(readFileSync(p))],'All fixed JS inputs shipped exactly once; adapter originals are private');}
 for(const p of ['src/CookieConsentBundleManager.php','src/CookieConsentBundleInstall.php','plugins/cache-build.php','processors/bundle_rebuild.class.php','vendor/peast/LICENSE','vendor/peast/autoload.php'])eq(spec.files.find(f=>f.target==='core/components/cookieconsent/'+p)?.sha256,sha(readFileSync('server/'+p)),'Native builder ships current '+p);
 eq(spec.files.find(f=>f.target==='core/components/cookieconsent/frontend-manifest.json')?.sha256,sha(readFileSync('_build/frontend-manifest.json')));
 eq(spec.files.filter(f=>f.target.endsWith('.min.js')).map(f=>f.target),[],'Production JS is built on the installed site');
 eq(spec.files.some(f=>f.target.startsWith('assets/js/cookie-consent/services/')),false,'No vehicle can overwrite user adapters');
 eq(spec.files.some(f=>/cached-cookie-consent|build.lock|last-error/.test(f.target)),false,'No generated cache in transport');
}
console.log(JSON.stringify({result:'PASS',assertions:n,native:process.argv.includes('--native')}));
