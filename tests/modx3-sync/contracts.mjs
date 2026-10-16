// Cross-platform parity comes from the immutable source, not a self-derived expectation.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
const source='db0a7229715bcde08eef71894e08dd6526704954',get=p=>execFileSync('git',['show',source+':'+p]);
let assertions=0;const eq=(a,b,m)=>{assertions++;assert.deepEqual(a,b,m)};
const manifest=JSON.parse(readFileSync('_build/frontend-manifest.json')),old=JSON.parse(get('_build/frontend-manifest.json'));
const js=Object.keys(manifest.inputs).filter(p=>p.endsWith('.js'));
eq(js,Object.keys(old.inputs).filter(p=>p.endsWith('.js')),'Same ordered source manifest');eq(js.length,21);
for(const p of [...js,'assets/css/cookie-consent.css','assets/scss/cookie-consent.scss','assets/components/cookieconsent/manager.js','assets/components/cookieconsent/manager.css','assets/components/cookieconsent/audit-viewer.js','CookiesPopup.html'])eq(readFileSync(p),get(p),'Identical shared behavior '+p);
const neutral=s=>s.replaceAll('MODX\\Revolution\\modSystemSetting','modSystemSetting').replaceAll('MODX\\Revolution\\modPluginEvent','modPluginEvent').replaceAll('MODX\\Revolution\\modPlugin','modPlugin').replaceAll('\\MODX\\Revolution\\modX::','modX::');
for(const p of ['CookieConsentSettings.php','CookieConsentServiceRegistry.php','CookieConsentTexts.php','CookieConsentBannerRenderer.php','CookieConsentVideoUrl.php','CookieConsentEmbedOptions.php','CookieConsentBundleManager.php','CookieConsentBundleInstall.php','CookieConsentEventValidator.php','CookieConsentAuditLogger.php','CookieConsentAuditReader.php'])eq(neutral(readFileSync('server/src/'+p,'utf8')),get('server/src/'+p).toString(),'Shared PHP contract '+p);
for(const name of ['map','video','assets'])eq(neutral(readFileSync(`server/modx3-${name}-snippet.php`,'utf8')),get(`server/modx2-${name}-snippet.php`).toString(),'Equivalent native snippet '+name);
for(const language of ['ru','en'])eq(readFileSync(`server/lexicon/${language}/default.inc.php`),get(`server/lexicon/${language}/default.inc.php`),'Exact lexicon '+language);
const guide=JSON.parse(readFileSync('_build/user-guide.json')),sourceGuide=JSON.parse(get('_build/user-guide.json'));
for(const lang of ['ru','en']){eq(guide.languages[lang].sections.slice(0,5),sourceGuide.languages[lang].sections.slice(0,5),'Existing guide remains unchanged');eq(guide.languages[lang].sections.length,6);const content=JSON.stringify(guide.languages[lang].sections[5]);for(const term of ['CookieConsentMap','CookieConsentVideo','data-cc-poster','data-cc-aspect-ratio','data-cc-width','mountEmbeds','stillAllowed'])eq(content.includes(term),true,'Required guide topic '+term);}
const allow=JSON.parse(readFileSync('_build/transport-files.json'));for(const p of js)eq(allow[p],p,'Editable source packaged '+p);
eq(Object.keys(allow).some(p=>p.includes('/mock/')),false);eq(allow['assets/js/cookie-consent/services/mock-marketing.js'],'assets/js/cookie-consent/services/mock-marketing.js');
eq(JSON.parse(readFileSync('_build/package.json')).name,'cookieconsent3');eq(JSON.parse(readFileSync('_build/package.json')).release_index,4);
const result={result:'PASS',source,tests:1,assertions};writeFileSync('.local/modx3/evidence/source-parity.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
