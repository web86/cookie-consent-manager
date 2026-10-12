<?php
declare(strict_types=1);
// CLI ONLY: php install-modx2.php /absolute/site/root /absolute/private/logs
if (PHP_SAPI!=='cli') { http_response_code(404); exit; }
$root=$argv[1]??'';
$logDir=$argv[2]??'';
if ($root==='' || $root[0]!=='/' || !is_file($root.'/index.php')) throw new RuntimeException('MODX root required');
require_once dirname(__DIR__).'/src/CookieConsentPrivatePath.php';
CookieConsentPrivatePath::directory($logDir,$root);
define('MODX_API_MODE',true);
ob_start();
require $root.'/index.php';
while (ob_get_level()) ob_end_clean();
require_once dirname(__DIR__).'/src/CookieConsentServiceRegistry.php';
$namespace=$modx->getObject('modNamespace',['name'=>'cookie_consent']);
if (!$namespace) { $namespace=$modx->newObject('modNamespace'); $namespace->set('name','cookie_consent'); $namespace->save(); }
$values=[
    'cookie_consent.log_dir'=>[$logDir,'textfield'],
    'cookie_consent.services'=>[json_encode(CookieConsentServiceRegistry::defaults(),JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR),'textarea'],
];
foreach ($values as $key=>[$value,$xtype]) {
    if ($modx->getObject('modSystemSetting',['key'=>$key])) { echo "Preserved $key\n"; continue; }
    $setting=$modx->newObject('modSystemSetting');
    $setting->fromArray(['key'=>$key,'value'=>$value,'xtype'=>$xtype,'namespace'=>'cookie_consent','area'=>'consent'], '', true, true);
    if (!$setting->save()) throw new RuntimeException('Cannot save '.$key);
    echo "Created $key\n";
}
$modx->cacheManager->refresh(['system_settings'=>[]]);
