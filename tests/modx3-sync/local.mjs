// Run once for each build mechanism. Network is intercepted by the browser matrices.
import {execFileSync} from 'node:child_process';import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const out='.local/modx3/evidence/local';mkdirSync(out,{recursive:true});
const cases=[
 ['source-parity','node',['tests/modx3-sync/contracts.mjs']],
 ['guide','node',['_build/user-guide.mjs','--check']],['version','node',['_build/version.mjs','--check']],
 ['universal-php','php',['tests/universal/php.php']],['audit-schema3','php',['tests/universal/audit-schema3.php']],
 ['maps-url','php',['tests/beta1042/urls.php']],['video-url','php',['tests/video-embeds/urls.php']],['snippets','php',['tests/video-embeds/snippets.php']],
 ['video-registry','node',['tests/video-embeds/registry.mjs']],['video-contracts','node',['tests/video-embeds/contracts.mjs']],
 ['php-bundle','php',['tests/adapter-cache/php.php']],['php-semantics','node',['tests/adapter-cache/semantics.mjs']],
 ['esbuild-video','node',['tests/video-embeds/browser.mjs']],['esbuild-texts','node',['tests/placeholder-texts/browser.mjs']],
 ['php-video','node',['tests/video-embeds/browser.mjs'],{CC_VIDEO_BUNDLE:'.local/adapter-cache/production.js'}],
 ['php-texts','node',['tests/placeholder-texts/browser.mjs'],{CC_VIDEO_BUNDLE:'.local/adapter-cache/production.js'}],
 ['php-vs-esbuild','node',['tests/video-embeds/differential.mjs'],{CC_REFACTOR_CANDIDATE:'.local/adapter-cache/production.js'}]
];
const results=[];
for(const[name,cmd,args,env={}]of cases){console.log('RUN '+name);let output='',result='PASS';try{output=execFileSync(cmd,args,{encoding:'utf8',env:{...process.env,TMPDIR:'/private/tmp',...env},maxBuffer:32*1024*1024});}catch(e){result='FAIL';output=(e.stdout||'')+(e.stderr||'')+'\n'+e.message;process.exitCode=1;}writeFileSync(out+'/'+name+'.log',output);results.push({name,result,log:'local/'+name+'.log'});writeFileSync(out+'/results.json',JSON.stringify({tests:results.length,failed:results.filter(r=>r.result==='FAIL').length,results},null,2)+'\n');console.log(result+' '+name+(result==='FAIL'?' '+output.slice(-1200):''));}
