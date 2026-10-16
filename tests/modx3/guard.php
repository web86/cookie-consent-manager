<?php
if(PHP_SAPI!=='cli'||getenv('CC_MODX3_DISPOSABLE')!=='cookie-consent-modx3-acceptance'||trim(file_get_contents('/opt/cc-private/disposable-marker'))!=='cookie-consent-modx3-acceptance')throw new RuntimeException('Named disposable MODX 3 fixture required');
// Check the generated connection destination before MODX can initialise sessions.
$destination=(static function(){require '/var/www/html/core/config/config.inc.php';return ['host'=>$database_server??null,'database'=>$dbase??null];})();
if($destination['host']!=='db'||!in_array($destination['database'],['cookie_consent_modx3_test','cookie_consent_modx3_clean','cookie_consent_modx3_fresh','cookie_consent_modx3_pristine','cookie_consent_modx3_finalclean','cookie_consent_modx3_finalfresh','cookie_consent_modx3_finalpristine'],true))throw new RuntimeException('Foreign connection destination refused');
if(!isset($modx)){
    if(!defined('MODX_API_MODE'))define('MODX_API_MODE',true);
    $level=ob_get_level();ob_start();require '/var/www/html/index.php';while(ob_get_level()>$level)ob_end_clean();
}
if(isset($modx)){
    if($modx->getVersionData()['full_version']!=='3.2.4-pl'||!in_array($modx->query('SELECT DATABASE()')->fetchColumn(),['cookie_consent_modx3_test','cookie_consent_modx3_clean','cookie_consent_modx3_fresh','cookie_consent_modx3_pristine','cookie_consent_modx3_finalclean','cookie_consent_modx3_finalfresh','cookie_consent_modx3_finalpristine'],true)||class_exists('modX',false))throw new RuntimeException('Wrong CMS, DB or aliases state');
}
