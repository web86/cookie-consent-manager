import {chromium} from 'playwright';
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const dc=['compose','--env-file','.local/modx3/private/compose.env','-f','tests/local/compose.yaml','-f','tests/transport/compose.yaml','-f','tests/servers/compose.yaml','exec','-T'];
const cli=(args,input)=>execFileSync('docker',[...dc,'clean',...args],{encoding:'utf8',input}).trim();
const ctl=(op,key,input)=>cli(['php','/opt/cc-source/tests/transport/control.php',op,'/opt/cc-clean',...(key?[key]:[])],input);
const saved=Object.fromEntries(['cookie_consent.audit','cookie_consent.audit_config_file','cookie_consent.log_dir'].map(k=>[k,ctl('get',k)]));
const results=[];let assertions=0;const eq=(a,b)=>{assertions++;assert.deepEqual(a,b);};const browser=await chromium.launch();
const output='.local/modx3/beta24-server-evidence';mkdirSync(output,{recursive:true});
try{
 ctl('set','cookie_consent.audit_config_file','');
 cli(['php','-r','define("MODX_API_MODE",true);ob_start();require "/var/www/html/index.php";while(ob_get_level())ob_end_clean();require MODX_CORE_PATH."components/cookieconsent/src/CookieConsentAuditConfiguration.php";CookieConsentAuditConfiguration::setup($modx);']);
 cli(['php','-r','foreach(["/var/www/html/logs/server-acceptance","/opt/cc-clean/server-acceptance"] as $d){if(!is_dir($d))mkdir($d,0700,true);chown($d,"www-data");chmod($d,str_starts_with($d,"/var/www/html/")?0755:0700);file_put_contents($d."/2000-01-cookie-consent.log","historical sentinel\n");chmod($d."/2000-01-cookie-consent.log",0644);}',]);
 for(const [server,port] of [['Apache',18889],['nginx-PHP-FPM',18891],['Apache-behind-nginx-proxy',18892]]) {
  const origin='http://127.0.0.1:'+port;const metadata=JSON.parse(ctl('get','cookie_consent.audit'));metadata.site_origin=origin;ctl('set','cookie_consent.audit',JSON.stringify(metadata));
  const ctx=await browser.newContext(),p=await ctx.newPage(),requests=[];p.on('request',r=>requests.push({method:r.method(),path:new URL(r.url()).pathname}));
  await ctx.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  try {
   const creds=JSON.parse(ctl('credentials'));await p.goto(origin+'/manager/');await p.locator('#modx-login-username').fill(creds.username);await p.locator('#modx-login-password').fill(creds.password);await p.locator('#modx-login-btn').click();await p.waitForFunction(()=>window.MODx?.siteId);await p.goto(origin+'/manager/?a=index&namespace=cookie_consent');await p.locator('#ccm-save').waitFor();
   const token=await p.evaluate(()=>CookieConsentManagerBootstrap.auth);const api=async(action,form={})=>{const r=await ctx.request.post(origin+'/assets/components/cookieconsent/connector.php',{headers:{modAuth:token},form:{action,HTTP_MODAUTH:token,...form}});return {http:r.status(),...(await r.json())};};
   for(const [mode,path,absolute] of [['site','logs/server-acceptance/','/var/www/html/logs/server-acceptance'],['absolute','/opt/cc-clean/server-acceptance','/opt/cc-clean/server-acceptance']]) {
    const start=assertions,name=server+'-'+mode;
    try {
     const guard=absolute+'/.htaccess';cli(['php','-r','if(is_file($argv[1]))unlink($argv[1]);',guard]);
     const before=cli(['php','-r','echo hash_file("sha256",$argv[1]."/2000-01-cookie-consent.log");',absolute]);
     let g=(await api('get')).object;let r=await api('audit_enable',{revision:g.revision,log_dir:path,log_dir_mode:mode});eq(r.http,200);eq(r.success,true);eq(r.object.partial,false);eq(r.object.log_dir,absolute);eq(r.object.auditStatus.state,'ready');
     eq(cli(['php','-r','echo json_encode([file_exists($argv[1]."/.htaccess"),glob($argv[1]."/cc-probe-*")]);',absolute]),'[false,[]]');
     // A custom administrator guard is kept byte for byte, including an empty rule set.
     cli(['php','-r','file_put_contents($argv[1],"# Custom administrator policy\n");chown($argv[1],"www-data");',guard]);
     const hash=cli(['php','-r','echo hash_file("sha256",$argv[1]);',guard]);g=(await api('get')).object;r=await api('audit_enable',{revision:g.revision,log_dir:path,log_dir_mode:mode});eq(r.success,true);eq(r.object.partial,false);eq(cli(['php','-r','echo hash_file("sha256",$argv[1]);',guard]),hash);
     eq(cli(['php','-r','echo hash_file("sha256",$argv[1]."/2000-01-cookie-consent.log");',absolute]),before);
     const delivered=await p.evaluate(async()=>{const event={event_id:crypto.randomUUID(),consent_id:crypto.randomUUID(),event:'reject',stage:'committed',analytics:false,marketing:false,policy_version:'1',page:'/server-browser-test',timestamp:new Date().toISOString()};const r=await fetch('/assets/components/cookieconsent/audit.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(event)});return {status:r.status,ack:await r.json(),id:event.event_id};});eq(delivered.status,200);eq(delivered.ack.event_id,delivered.id);
     const record=JSON.parse(cli(['php','-r','require_once "/opt/cc-source/server/src/CookieConsentAuditFormat.php";foreach(CookieConsentAuditFormat::records($argv[1]."/".gmdate("Y-m")."-cookie-consent.log") as $v){}echo json_encode(["ip_valid"=>filter_var($v["ip"],FILTER_VALIDATE_IP)!==false,"ua"=>str_contains($v["user_agent"],"Mozilla")?"browser":"unexpected","consent_id"=>preg_match("/^[a-f0-9-]{36}$/D",$v["consent_id"])===1]);',absolute]));eq(record,{ip_valid:true,ua:'browser',consent_id:true});
     if(mode==='site')eq((await ctx.request.get(origin+'/logs/server-acceptance/2000-01-cookie-consent.log')).status(),200);
     await p.reload();await p.locator('#ccm-save').waitFor();await p.locator('#ccm-tab-main').click();eq(await p.locator('#ccm-audit-warning').count(),1);await p.locator('#ccm-save').click();await p.waitForFunction(()=>document.querySelector('#ccm-status').dataset.state==='saved');eq((await api('get')).object.auditStatus.state,'ready');
     await p.frameLocator('#ccm-preview-frame').locator('section.cookie-warning').waitFor();await p.screenshot({path:output+'/'+name+'.png'});results.push({name,result:'PASS',assertions:assertions-start});console.log('PASS '+name);
    }catch(e){results.push({name,result:'FAIL',assertions:assertions-start,error:e.message});throw e;}
   }
   eq(requests.some(r=>r.method==='GET'&&r.path.startsWith('/logs/')),false);
  }finally{await ctx.close();}
 }
}catch(e){console.error(e.message);process.exitCode=1;}
finally{await browser.close();for(const[k,v]of Object.entries(saved))ctl('set',k,v);writeFileSync(output+'/servers.json',JSON.stringify({suite:'Actual HTTP server journal matrix',tests:results.length,assertions,failed:results.filter(x=>x.result==='FAIL').length,results},null,2));}
