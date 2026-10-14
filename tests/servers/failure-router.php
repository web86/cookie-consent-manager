<?php
// Only copied to the disposable acceptance site by tests/beta21/audit.mjs.
// This fixture is excluded from the transport package.
if(!getenv('CC_DB_PASSWORD')){http_response_code(404);exit;}
$case=trim(file_get_contents('/opt/cc-clean/audit-response-case'));
$input=json_decode(file_get_contents('php://input'),true);
header('Content-Type: application/json');
if(ctype_digit($case)){
 http_response_code((int)$case);
 if(in_array((int)$case,[301,302],true))header('Location: /cc-audit-redirect-target.php');
 echo '<html>PRIVATE_CANARY_KEY 10.12.34.56 body must not escape</html>';exit;
}
$ack=['ok'=>true,'event_id'=>$input['event_id'],'server_time'=>gmdate('Y-m-d\TH:i:s\Z')];
if($case==='html'){header('Content-Type: text/html');echo '<html>PRIVATE_CANARY_KEY 10.12.34.56</html>';exit;}
if($case==='json'){echo '{invalid PRIVATE_CANARY_KEY';exit;}
if($case==='mismatch')$ack['event_id']='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
if($case==='invalid-record'){
 require '/opt/cc-source/server/src/CookieConsentAuditLogger.php';
 // Append a valid-shaped but different consent event, using the real managed configuration.
 define('MODX_API_MODE',true);ob_start();require '/var/www/html/index.php';while(ob_get_level())ob_end_clean();
 require_once '/opt/cc-source/server/src/CookieConsentAuditConfiguration.php';require '/opt/cc-source/server/src/CookieConsentEventValidator.php';require '/opt/cc-source/server/src/CookieConsentRateLimiter.php';
 $cfg=CookieConsentAuditConfiguration::forModx($modx);$input['policy_version']='tampered';
 $dir=$modx->getObject('MODX\Revolution\modSystemSetting',['key'=>'cookie_consent.log_dir'])->get('value');
 $s=$modx->getObject('MODX\Revolution\modSystemSetting',['key'=>'cookie_consent.services']);$registry=json_decode($s->get('value'),true);
 $accepted=(new CookieConsentAuditLogger($dir,$cfg['rate_limit_key'],10000,$registry))->append($input,$_SERVER['REMOTE_ADDR'],'CookieConsent-Manager-AuditCheck');$ack['server_time']=$accepted['server_time'];
}
echo json_encode($ack);
