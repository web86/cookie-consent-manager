import {execFileSync} from 'node:child_process';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
const major=JSON.parse(readFileSync('_build/package.json')).name==='cookieconsent3'?'3':'2',out='.local/release-test/modx'+major+'/local';mkdirSync(out,{recursive:true});
const cases=[['version','node',['_build/version.mjs','--check']],['guide','node',['_build/user-guide.mjs','--check']],['php-builder','php',['tests/adapter-cache/php.php']],['semantics','node',['tests/adapter-cache/semantics.mjs']],['source-build','node',['tests/adapter-cache/build.mjs']],['adapter-sync','php',['tests/adapter-updates/php.php']]];
if(major==='3')cases.push(['modx2-source-parity','node',['tests/modx3-sync/contracts.mjs']],['modx2-rendering-parity','node',['tests/modx3-sync/php-differential.mjs']]);
for(const file of ['tests/php.php','tests/viewer/php.php','tests/manager-i18n-php.php','tests/manager-ux-php.php','tests/universal/audit-schema3.php','tests/video-embeds/urls.php','tests/video-embeds/snippets.php'])cases.push([file.replaceAll('/','-'),'php',[file]]);
cases.push(['registry','node',['tests/video-embeds/registry.mjs']],['adapter-contracts','node',['tests/video-embeds/contracts.mjs']]);
const results=[];
for(const [name,cmd,args] of cases){let result='PASS',output='';try{output=execFileSync(cmd,args,{env:{...process.env,TMPDIR:'/private/tmp'},encoding:'utf8',maxBuffer:16*1024*1024});}catch(e){result='FAIL';process.exitCode=1;output=(e.stdout||'')+(e.stderr||'')+'\n'+e.message;}writeFileSync(out+'/'+name+'.log',output);results.push({name,result});writeFileSync(out+'/results.json',JSON.stringify({tests:results.length,failed:results.filter(r=>r.result==='FAIL').length,results},null,2)+'\n');console.log(result+' '+name+(result==='FAIL'?' '+output.slice(-1000):''));}
