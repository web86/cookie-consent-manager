import {cli} from '../modx3/helpers.mjs';
import {writeFileSync} from 'node:fs';
const results=[];
for(const runtime of ['web','php82'])for(const file of ['tests/php.php','tests/viewer/php.php','tests/beta21/php.php','tests/beta24/php.php','tests/beta30/php.php','tests/beta31/php.php','tests/beta33/php.php','tests/manager-i18n-php.php','tests/manager-ux-php.php','tests/elements/php.php','tests/modx3-beta3/visibility.php']){
 try{const stdout=cli(runtime,['php','/opt/cc-source/'+file]);const data=JSON.parse(stdout);if(data.result&&data.result!=='PASS')throw Error(stdout);results.push({runtime,file,result:'PASS',...data});console.log('PASS '+runtime+' '+file+' '+data.assertions);}catch(e){results.push({runtime,file,result:'FAIL',error:e.message});console.error('FAIL '+runtime+' '+file);}
}
writeFileSync('.local/modx3/evidence/beta3-php.json',JSON.stringify({tests:results.length,assertions:results.reduce((n,r)=>n+(r.assertions||0),0),failed:results.filter(r=>r.result==='FAIL').length,results},null,2)+'\n');if(results.some(r=>r.result==='FAIL'))process.exitCode=1;
