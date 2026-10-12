<?php
// No HTTP entry point. Tests exercise genuine persisted modSystemSetting objects.
if (PHP_SAPI!=='cli' || !is_dir('/opt/cc-source/tests/local')) exit(1);
define('MODX_API_MODE',true); ob_start();require '/var/www/html/index.php';while(ob_get_level()) ob_end_clean();
$key=$argv[1]??'';
if (!in_array($key,['cookie_consent.log_dir','cookie_consent.services'],true)) exit(1);
$value=stream_get_contents(STDIN);
$s=$modx->getObject('modSystemSetting',['key'=>$key]);$s->set('value',$value);if (!$s->save()) exit(2);
$modx->cacheManager->refresh(['system_settings'=>[]]);
echo "Updated local setting $key\n";
