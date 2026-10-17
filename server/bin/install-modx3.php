<?php
declare(strict_types=1);
// CLI ONLY: php install-modx3.php /absolute/site/root /absolute/private/logs
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
$namespace=$modx->getObject('MODX\Revolution\modNamespace',['name'=>'cookie_consent']);
// CLI copying has no native preflight; preserve unknown existing sources.
$modx->setOption('cookie_consent.install_snapshot',['fresh'=>!$namespace]);
if (!$namespace) { $namespace=$modx->newObject('MODX\Revolution\modNamespace'); $namespace->set('name','cookie_consent'); $namespace->save(); }
if (!$namespace->get('path')) $namespace->set('path',MODX_CORE_PATH.'components/cookieconsent/');
if (!$namespace->get('assets_path')) $namespace->set('assets_path',MODX_ASSETS_PATH.'components/cookieconsent/');
if (!$namespace->save()) throw new RuntimeException('Namespace');
$menu=$modx->getObject('MODX\Revolution\modMenu',['text'=>'Cookie Consent Manager']);
if (!$menu) {$menu=$modx->newObject('MODX\Revolution\modMenu');$menu->set('text','Cookie Consent Manager');$menu->fromArray(['text'=>'Cookie Consent Manager','parent'=>'components','namespace'=>'cookie_consent','action'=>'index','permissions'=>'cookie_consent_manage','description'=>'Cookie consent settings']);if(!$menu->save())throw new RuntimeException('Menu');}
foreach ($modx->getCollection('MODX\Revolution\modAccessPolicyTemplate') as $template)foreach(['cookie_consent_manage'=>true,'cookie_consent_view_logs'=>false] as $name=>$value) {
    if(!$modx->getObject('MODX\Revolution\modAccessPermission',['template'=>$template->get('id'),'name'=>$name])){$permission=$modx->newObject('MODX\Revolution\modAccessPermission');$permission->fromArray(['template'=>$template->get('id'),'name'=>$name,'description'=>$name==='cookie_consent_view_logs'?'View/export consent audit logs':'Manage Cookie Consent Manager','value'=>$value]);if(!$permission->save())throw new RuntimeException('Permission');}
}
$values=[
    'cookie_consent.audit_config_file'=>['','textfield'],
    'cookie_consent.options'=>[json_encode(CookieConsentSettings::defaults(),JSON_THROW_ON_ERROR),'textarea'],
    'cookie_consent.texts'=>[json_encode(CookieConsentTexts::defaults(),JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR),'textarea'],
    'cookie_consent.log_dir'=>[$logDir,'textfield'],
    'cookie_consent.services'=>[json_encode(CookieConsentServiceRegistry::defaults(),JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR),'textarea'],
];
foreach ($values as $key=>[$value,$xtype]) {
    if ($modx->getObject('MODX\Revolution\modSystemSetting',['key'=>$key])) { echo "Preserved $key\n"; continue; }
    $setting=$modx->newObject('MODX\Revolution\modSystemSetting');
    $setting->fromArray(['key'=>$key,'value'=>$value,'xtype'=>$xtype,'namespace'=>'cookie_consent','area'=>'consent'], '', true, true);
    if (!$setting->save()) throw new RuntimeException('Cannot save '.$key);
    echo "Created $key\n";
}
require_once dirname(__DIR__).'/src/CookieConsentBundleInstall.php';
CookieConsentBundleInstall::run($modx);
$modx->cacheManager->refresh();
