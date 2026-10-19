import {transform,version} from 'esbuild';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
if(version!=='0.28.2')throw Error('Use pinned esbuild 0.28.2 / npm ci');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
// Dependency order is explicit; no directory scanning or runtime module loading.
const js = Object.keys(JSON.parse(readFileSync('_build/frontend-manifest.json','utf8')).inputs)
  .filter(p => p.endsWith('.js'));
for (const p of js) if (!/^assets\/components\/cookieconsentmanager\/js\/cookie-consent\/(?:[a-z0-9-]+\/)?[a-z0-9-]+\.js$/.test(p) || p.endsWith('.min.js')) throw Error('Invalid frontend manifest path');
if (!js.length) throw Error('Empty frontend manifest');
const css = 'assets/components/cookieconsentmanager/css/cookie-consent.css';
const inputs=Object.fromEntries([...js,css,'package-lock.json','_build/frontend.mjs'].map(p=>[p,sha(readFileSync(p))]));
const options={minify:true,legalComments:'none',charset:'ascii',target:'es2020'};
const output={
 'assets/components/cookieconsentmanager/js/cookie-consent/cookie-consent.min.js':(await transform('(()=>{if(window.web86CookieConsentFrontendInitialized)return;window.web86CookieConsentFrontendInitialized=true;\n'+js.map(p=>readFileSync(p,'utf8')).join('\n;\n')+'\n})();',{...options,loader:'js'})).code,
 'assets/components/cookieconsentmanager/css/cookie-consent.min.css':(await transform(readFileSync(css,'utf8'),{...options,loader:'css'})).code
};
for(const [p,bytes]of Object.entries(output))writeFileSync(p,bytes);
const meta=JSON.parse(readFileSync('_build/package.json','utf8'));
const package_version=meta.version+(meta.release?'-'+meta.release+meta.release_index:'');
writeFileSync('_build/frontend-manifest.json',JSON.stringify({tool:'esbuild',version,package_version,inputs,outputs:Object.fromEntries(Object.entries(output).map(([p,b])=>[p,{sha256:sha(b),bytes:Buffer.byteLength(b)}]))},null,2)+'\n');
console.log(JSON.stringify({tool:'esbuild',version,outputs:Object.fromEntries(Object.entries(output).map(([p,b])=>[p,{bytes:Buffer.byteLength(b),sha256:sha(b)}]))}));
