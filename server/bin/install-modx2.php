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
require_once dirname(__DIR__).'/src/CookieConsentSettings.php';
$namespace=$modx->getObject('modNamespace',['name'=>'cookie_consent']);
if (!$namespace) { $namespace=$modx->newObject('modNamespace'); $namespace->set('name','cookie_consent'); $namespace->save(); }
if (!$namespace->get('path')) $namespace->set('path',MODX_CORE_PATH.'components/cookieconsent/');
if (!$namespace->get('assets_path')) $namespace->set('assets_path',MODX_ASSETS_PATH.'components/cookieconsent/');
if (!$namespace->save()) throw new RuntimeException('Namespace');
$menu=$modx->getObject('modMenu',['text'=>'Cookie Consent Manager']);
if (!$menu) {$menu=$modx->newObject('modMenu');$menu->set('text','Cookie Consent Manager');$menu->fromArray(['text'=>'Cookie Consent Manager','parent'=>'components','namespace'=>'cookie_consent','action'=>'index','permissions'=>'cookie_consent_manage','description'=>'Cookie consent settings']);if(!$menu->save())throw new RuntimeException('Menu');}
foreach ($modx->getCollection('modAccessPolicyTemplate') as $template) {
    if (!$modx->getObject('modAccessPermission',['template'=>$template->get('id'),'name'=>'cookie_consent_manage'])) {
        $permission=$modx->newObject('modAccessPermission');$permission->fromArray(['template'=>$template->get('id'),'name'=>'cookie_consent_manage','description'=>'Manage Cookie Consent Manager','value'=>true]);if(!$permission->save())throw new RuntimeException('Permission');
    }
}
$values=[
    'cookie_consent.audit_config_file'=>['','textfield'],
    'cookie_consent.options'=>[json_encode(CookieConsentSettings::defaults(),JSON_THROW_ON_ERROR),'textarea'],
    'cookie_consent.texts'=>[json_encode(CookieConsentTexts::defaults(),JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR),'textarea'],
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
$modx->cacheManager->refresh();
