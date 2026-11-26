import {spawn,execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {createWriteStream,writeFileSync} from 'node:fs';
const root=fileURLToPath(new URL('.',import.meta.url)),out=join(process.env.CC_MATRIX_ROOT,'results'),mode=process.env.CC_NATIVE_CACHE_MODE;
const flags=['-d','opcache.enable='+(mode==='off'?0:1),'-d','opcache.enable_cli='+(mode==='off'?0:1),'-d','opcache.jit='+(mode==='jit'?'1235':'disable'),'-d','opcache.jit_buffer_size='+(mode==='jit'?'64M':'0')];
const env={...process.env,CC_PROBE_LOG:join(out,'probe-events.ndjson')};
const log=createWriteStream(join(out,'http.log'));const p=spawn('php',[...flags,'-S','127.0.0.1:8093','-t',root],{env,stdio:['ignore','pipe','pipe']});p.stdout.pipe(log);p.stderr.pipe(log);
const result={php:process.env.CC_REQUESTED_PHP,mode,http:[],cli:[]};
try{
 for(let i=0;i<40;i++){try{const r=await fetch('http://127.0.0.1:8093/?probe=environment');if(r.ok){result.environment=await r.json();break;}}catch{}await new Promise(r=>setTimeout(r,250));}
 for(const probe of ['declare','declare','empty','empty','empty']){try{const r=await fetch('http://127.0.0.1:8093/?probe='+probe);result.http.push({probe,status:r.status,body:await r.json()});}catch(e){await new Promise(r=>setTimeout(r,150));result.http.push({probe,error:e.message,exitCode:p.exitCode});break;}}
}catch(e){result.error=e.message;}
finally{p.kill();}
for(const probe of ['declare','empty']){try{const text=execFileSync('php',[...flags,join(root,'index.php'),probe],{env,encoding:'utf8'});result.cli.push({probe,status:0,body:JSON.parse(text)});}catch(e){result.cli.push({probe,status:e.status,error:String(e.stderr||e.message)});}}
writeFileSync(join(out,'probe-result.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
