import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const base='ef96e4f2e4d39ffebae5e63d2bbfbc9cfe48af32',original=p=>execFileSync('git',['show',base+':'+p]);
let n=0;const eq=(a,b,m)=>{n++;assert.deepEqual(a,b,m)};
const manifest=JSON.parse(readFileSync('_build/frontend-manifest.json')),previous=JSON.parse(original('_build/frontend-manifest.json'));
eq(Object.keys(manifest.inputs),Object.keys(previous.inputs),'Same ordered build inputs');
for(const p of Object.keys(manifest.inputs))eq(readFileSync(p),original(p),'Unchanged visitor source '+p);
for(const p of Object.keys(manifest.outputs))eq(readFileSync(p),original(p),'Unchanged generated frontend '+p);
for(const p of ['manager.js','manager.css','audit-viewer.js'])eq(readFileSync('assets/components/cookieconsentmanager3/'+p),original('assets/components/cookieconsent/'+p),'Manager behavior unchanged '+p);
for(const p of ['CookieConsentSettings.php','CookieConsentServiceRegistry.php','CookieConsentTexts.php','CookieConsentVideoUrl.php','CookieConsentEmbedOptions.php','CookieConsentBundleInstall.php','CookieConsentEventValidator.php','CookieConsentAuditLogger.php','CookieConsentAuditReader.php','CookieConsentAuditConfiguration.php'])eq(readFileSync('server/src/'+p),original('server/src/'+p),'Native MODX 3 contract unchanged '+p);
for(const p of ['server/src/CookieConsentBundleManager.php','server/src/CookieConsentBannerRenderer.php','server/modx3-map-snippet.php','server/modx3-video-snippet.php','server/modx3-assets-snippet.php','server/modx3-banner-snippet.php','server/modx3-public-endpoint.example.php','server/modx3-manager-connector.php','server/plugins/cache-build.php'])eq(readFileSync(p,'utf8'),original(p).toString().replaceAll('components/cookieconsent/','components/cookieconsentmanager3/'),'Only component path changes '+p);
const meta=JSON.parse(readFileSync('_build/package.json'));eq(meta.name,'cookieconsentmanager3');eq(meta.version,'1.0.8');eq(meta.release_index,5);eq([meta.minimum_modx,meta.maximum_modx,meta.minimum_php],['3.1.2','3.3.0','8.1.0']);
const allow=JSON.parse(readFileSync('_build/transport-files.json'));
for(const [target,source]of Object.entries(allow)){eq(/components\/cookieconsent\//.test(target),false);eq(/(?:legacy_state|load_deprecated_global_class_aliases|class_alias\s*\()/.test(readFileSync(source,'utf8')),false,'No runtime alias/migration layer '+source);}
const build=readFileSync('_build/build.php','utf8');eq(build.includes('new \\MODX\\Revolution\\Transport\\modPackageBuilder($modx)'),true);eq(build.includes("'vehicle_class'=>'xPDO\\Transport\\xPDOFileVehicle'"),true);
const report={result:'PASS',base,assertions:n};writeFileSync('.local/modx3-first-public/contracts.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
