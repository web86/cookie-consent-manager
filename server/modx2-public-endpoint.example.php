<?php
declare(strict_types=1);
/** Public wrapper at /assets/components/cookieconsentmanager/audit.php.
 * Private config path comes from webserver environment; code stays in private MODX core.
 * Settings are read from SYSTEM settings (never context/user/request overrides).
 */
$level=ob_get_level();
ob_start();
try {
    if (!defined('MODX_API_MODE')) define('MODX_API_MODE',true);
    require dirname(__DIR__,3).'/index.php';
    if (!isset($modx) || !($modx instanceof modX)) throw new RuntimeException('MODX unavailable');
    $setting=$modx->getObject('modSystemSetting',['key'=>'cookie_consent.log_dir']);
    $GLOBALS['cookieConsentModxLogDir']=$setting ? (string)$setting->get('value') : '';
    $configSetting=$modx->getObject('modSystemSetting',['key'=>'cookie_consent.audit_config_file']);
    $GLOBALS['cookieConsentAuditConfigFile']=$configSetting ? (string)$configSetting->get('value') : '';
    require_once MODX_CORE_PATH.'components/cookieconsentmanager/src/CookieConsentAuditConfiguration.php';
    if(($_SERVER['REQUEST_METHOD']??'')==='POST' && preg_match('~^application/json~i',$_SERVER['CONTENT_TYPE']??''))
        $GLOBALS['cookieConsentAuditOptions']=CookieConsentAuditConfiguration::forModx($modx);
    require_once MODX_CORE_PATH.'components/cookieconsentmanager/src/CookieConsentServiceRegistry.php';
    $setting=$modx->getObject('modSystemSetting',['key'=>'cookie_consent.services']);
    $GLOBALS['cookieConsentServiceRegistry']=CookieConsentServiceRegistry::validateJson($setting ? (string)$setting->get('value') : '');
    require_once MODX_CORE_PATH.'components/cookieconsentmanager/src/CookieConsentSettings.php';
    $setting=$modx->getObject('modSystemSetting',['key'=>'cookie_consent.options']);
    $options=CookieConsentSettings::options($setting && $setting->get('value')!=='' ? json_decode((string)$setting->get('value'),true,16,JSON_THROW_ON_ERROR) : CookieConsentSettings::defaults());
    $GLOBALS['cookieConsentCategoryVisibility']=CookieConsentSettings::categoryOptions($options,$GLOBALS['cookieConsentServiceRegistry']['services'])['categories'];
    while (ob_get_level()>$level) ob_end_clean();
    require MODX_CORE_PATH.'components/cookieconsentmanager/public/audit.php';
} catch (Throwable $e) {
    while (ob_get_level()>$level) ob_end_clean();
    http_response_code(503);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo '{"ok":false,"error":"audit_unavailable"}';
}
