<?php
if(PHP_SAPI!=='cli'||!getenv('CC_DB_PASSWORD'))exit(1);
define('MODX_API_MODE',true);ob_start();require '/var/www/html/index.php';while(ob_get_level())ob_end_clean();
if($modx->query('SELECT DATABASE()')->fetchColumn()!=='cookie_consent_test'||$modx->getVersionData()['full_version']!=='2.8.8-pl')exit(1);
require_once MODX_CORE_PATH.'components/cookieconsent/src/CookieConsentSettings.php';
$registry=CookieConsentServiceRegistry::validateJson(file_get_contents('/opt/cc-private/base-registry.json'));
$options=CookieConsentSettings::defaults();$options['categories']=array_fill_keys(CookieConsentSettings::CATEGORIES,true);
foreach(['cookie_consent.services'=>$registry,'cookie_consent.options'=>$options,'cookie_consent.texts'=>CookieConsentTexts::defaults(),'cookie_consent.log_dir'=>'/opt/cc-private/logs'] as $key=>$value){$s=$modx->getObject('modSystemSetting',['key'=>$key]);$s->set('value',is_string($value)?$value:json_encode($value));$s->save();}
$s=$modx->getObject('modContextSetting',['context_key'=>'web','key'=>'cultureKey'])?:$modx->newObject('modContextSetting');$s->fromArray(['context_key'=>'web','key'=>'cultureKey','value'=>'en'],'',true,true);$s->save();$modx->cacheManager->refresh();
echo "Synthetic baseline settings prepared; installed runtime untouched\n";
