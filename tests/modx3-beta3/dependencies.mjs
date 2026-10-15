import {chromium} from 'playwright';
import {manager} from '../modx3/helpers.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const browser=await chromium.launch(),results=[];
try{for(const service of ['web','clean','fresh']){
 const s=await manager(browser,service),file=readFileSync('.local/modx3/download/pdotools-3.1.0-pl.transport.zip');
 try{const signature='pdotools-3.1.0-pl',up=await s.ctx.request.post(s.origin+'/connectors/index.php',{headers:{modAuth:s.token},multipart:{action:'workspace/packages/upload',HTTP_MODAUTH:s.token,file:{name:signature+'.transport.zip',mimeType:'application/zip',buffer:file}}});if(!(await up.json()).success)throw Error('PDO native upload');
 for(const[action,form]of [['scanlocal',{}],['install',{signature}]])if(!(await s.core('workspace/packages/'+action,form)).success)throw Error('PDO native '+action);
 results.push({service,signature,sha256:createHash('sha256').update(file).digest('hex'),result:'PASS'});console.log('PASS native pdoTools '+service);
 }finally{await s.ctx.close();}
}}finally{await browser.close();writeFileSync('.local/modx3/evidence/beta3-dependencies.json',JSON.stringify(results,null,2)+'\n');}
