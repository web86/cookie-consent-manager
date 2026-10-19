// One shared DB: native install and all browser/Manager mutations run sequentially.
import {chromium} from 'playwright';import {execFileSync} from 'node:child_process';import {writeFileSync,mkdirSync} from 'node:fs';
import {manager,control,cli,compose} from '../modx3/helpers.mjs';
const out='.local/modx3/evidence/web';mkdirSync(out,{recursive:true});
const b=await chromium.launch(),m=await manager(b,'web');try{await m.install('cookieconsent3-0.1.0-beta4','.local/modx3/artifacts/sync106-a');}finally{await m.ctx.close();await b.close();}
control('web','provision');
writeFileSync(out+'/installed-web.js',execFileSync('docker',[...compose,'exec','-T','web','cat','/var/www/html/assets/components/cookieconsentmanager3/js/cookie-consent/cached-cookie-consent.min.js']));
const version=cli('web',['php','-r','define("MODX_API_MODE",true);ob_start();require "/var/www/html/index.php";while(ob_get_level())ob_end_clean();echo $modx->getOption("cookie_consent.bundle_version");']);
const env={...process.env,CC_FRONTEND_EXPECTED:out+'/installed-web.js',CC_FRONTEND_VERSION:version};
const cases=(process.argv.slice(2).length?process.argv.slice(2):['tests/universal/browser.mjs','tests/universal/audit.mjs','tests/http.mjs','tests/browser.mjs','tests/beta32/callbacks.mjs','tests/beta26/frontend.mjs','tests/beta28/localization.mjs','tests/beta33/manager.mjs','tests/beta31/manager.mjs','tests/manager-i18n.mjs','tests/manager-permissions.mjs','tests/viewer/browser.mjs','tests/universal/matrix.mjs','tests/beta32/maps.mjs','tests/provider-parameters.mjs','tests/beta31/pixels.mjs','tests/beta33/clientid.mjs','tests/manager-ux.mjs','tests/live-guard.mjs','tests/beta33/public.mjs','tests/polish/ui.mjs','tests/placeholder-texts/manager.mjs','tests/adapter-cache/native.mjs']);
const results=[];
for(const file of cases){console.log('RUN '+file);let output='',result='PASS';try{output=execFileSync('node',[file],{encoding:'utf8',env,maxBuffer:32*1024*1024});}catch(e){result='FAIL';output=(e.stdout||'')+(e.stderr||'')+'\n'+e.message;process.exitCode=1;}const log=file.replaceAll('/','-')+'.log';writeFileSync(out+'/'+log,output);results.push({file,result,log:'web/'+log});writeFileSync(out+'/results.json',JSON.stringify({tests:results.length,failed:results.filter(r=>r.result==='FAIL').length,results},null,2)+'\n');console.log(result+' '+file+(result==='FAIL'?'\n'+output.slice(-1600):''));}
