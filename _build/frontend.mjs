import {transform,version} from 'esbuild';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
if(version!=='0.28.2')throw Error('Use pinned esbuild 0.28.2 / npm ci');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
// Dependency order is explicit; no directory scanning or runtime module loading.
const js = [
  'runtime.js', 'script-url.js', 'provider-registry.js', 'service-runtime.js',
  'services/google-common.js', 'services/yandex.js', 'services/mailru-common.js',
  'services/mailru.js', 'services/vk-ads.js', 'services/meta-pixel.js',
  'services/google-ga4.js', 'services/google-ads.js', 'services/google-gtm.js',
  'services/custom-js.js', 'services/mock-marketing.js',
  'service-loaders.js', 'embeds.js', 'consent-manager.js'
].map(n => 'assets/js/cookie-consent/' + n);
const css = 'assets/css/cookie-consent.css';
const inputs=Object.fromEntries([...js,css,'package-lock.json','_build/frontend.mjs'].map(p=>[p,sha(readFileSync(p))]));
const options={minify:true,legalComments:'none',charset:'ascii',target:'es2020'};
const output={
 'assets/js/cookie-consent/cookie-consent.min.js':(await transform('(()=>{if(window.web86CookieConsentFrontendInitialized)return;window.web86CookieConsentFrontendInitialized=true;\n'+js.map(p=>readFileSync(p,'utf8')).join('\n;\n')+'\n})();',{...options,loader:'js'})).code,
 'assets/css/cookie-consent.min.css':(await transform(readFileSync(css,'utf8'),{...options,loader:'css'})).code
};
for(const [p,bytes]of Object.entries(output))writeFileSync(p,bytes);
writeFileSync('_build/frontend-manifest.json',JSON.stringify({tool:'esbuild',version,inputs,outputs:Object.fromEntries(Object.entries(output).map(([p,b])=>[p,{sha256:sha(b),bytes:Buffer.byteLength(b)}]))},null,2)+'\n');
console.log(JSON.stringify({tool:'esbuild',version,outputs:Object.fromEntries(Object.entries(output).map(([p,b])=>[p,{bytes:Buffer.byteLength(b),sha256:sha(b)}]))}));
