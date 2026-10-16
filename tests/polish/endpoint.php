<?php
// Temporary loopback fixture, never packaged. Only the named disposable DB is allowed.
if(!getenv('CC_DB_PASSWORD')){http_response_code(404);exit;}
define('MODX_API_MODE',true);ob_start();require '/var/www/html/index.php';while(ob_get_level())ob_end_clean();if(!in_array($modx->getOption('dbname'),['cookie_consent_modx3_test','cookie_consent_fenom'],true)){http_response_code(404);exit;}
$lang=$_GET['language']??'ru';$mode=$_GET['mode']??'live';if(!in_array($lang,['ru','en'],true)||!in_array($mode,['live','mock'],true)){http_response_code(400);exit;}
$modx->context->config['cultureKey']=$lang;$q=$modx->executedQueries;$start=hrtime(true);$assets=$modx->runSnippet('CookieConsentAssets').$modx->getRegisteredClientStartupScripts();$banner=$modx->runSnippet('CookieConsentBanner',['mode'=>$mode]);
header('Content-Type: application/json');header('Cache-Control: no-store');echo json_encode(['php_ms'=>(hrtime(true)-$start)/1e6,'sql'=>$modx->executedQueries-$q,'html_bytes'=>strlen($assets.$banner),'html_sha256'=>hash('sha256',$assets.$banner),'banner_sha256'=>hash('sha256',$banner),'registry_bytes'=>preg_match('~id="cc-service-registry">(.*?)</script>~s',$assets,$match)?strlen($match[1]):0]);
