<?php
if (PHP_SAPI!=='cli' || !is_dir('/opt/cc-source/tests/local')) exit(1);
define('MODX_API_MODE',true);
ob_start(); require '/var/www/html/index.php'; while (ob_get_level()) ob_end_clean();
require_once '/opt/cc-source/server/src/CookieConsentServiceRegistry.php';
$registry=CookieConsentServiceRegistry::defaults();
foreach ($registry['services'] as &$service) {
    $service['enabled']=true;
    if (in_array($service['loader'],['google_ga4','google_gtm','google_ads'],true)) {
        $service['enabled']=true;
        $service['config']=['id'=>match($service['loader']){'google_ga4'=>'G-MOCK1234','google_gtm'=>'GTM-MOCK1234','google_ads'=>'AW-12345678'}];
    }
}
unset($service);
$registry['services'][]=['key'=>'mock_marketing','loader'=>'mock_marketing','category'=>'marketing','name'=>'Тестовый маркетинг','purpose'=>'Локальная имитация рекламы','enabled'=>true,'config'=>new stdClass()];
$json=json_encode($registry,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);
CookieConsentServiceRegistry::validateJson($json);
$setting=$modx->getObject('modSystemSetting',['key'=>'cookie_consent.services']); $setting->set('value',$json); $setting->save();
file_put_contents('/opt/cc-private/base-registry.json',$json);
$snippet=$modx->getObject('modSnippet',['name'=>'CookieConsentRegistry']) ?: $modx->newObject('modSnippet');
$snippet->set('name','CookieConsentRegistry');
$snippet->set('snippet',preg_replace('/^<\?php\s*/','',file_get_contents('/opt/cc-source/server/modx2-registry-snippet.php'))); $snippet->save();
$page=file_get_contents('/opt/cc-source/demo.html');
$page=str_replace('data-cc-audit-url=""','data-cc-audit-url="/assets/components/cookieconsent/audit.php"',$page);
$page=str_replace('<script src="assets/js/cookie-consent/provider-registry.js"','[[!CookieConsentRegistry]]<script src="assets/js/cookie-consent/provider-registry.js"',$page);
$template=$modx->getObject('modTemplate',['templatename'=>'Consent acceptance']) ?: $modx->newObject('modTemplate');
$template->set('templatename','Consent acceptance');$template->set('content',$page);$template->save();
$resource=$modx->getObject('modResource',1) ?: $modx->newObject('modResource');
$resource->fromArray(['pagetitle'=>'Cookie Consent MODX 2.8.8 acceptance','alias'=>'acceptance','published'=>1,'template'=>$template->get('id'),'cacheable'=>0]);$resource->save();
$modx->cacheManager->refresh();
echo 'MODX '.$modx->getVersionData()['full_version']." fixture ready\n";
