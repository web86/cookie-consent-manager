<?php
// Read-only post-install assertions on the two named native lifecycle fixtures.
if(PHP_SAPI!=='cli'||!getenv('CC_DB_PASSWORD'))exit(1);
define('MODX_API_MODE',true);ob_start();require '/var/www/html/index.php';while(ob_get_level())ob_end_clean();
if(!in_array($modx->getOption('dbname'),['cookie_consent_transport_clean','cookie_consent_transport_publiccore'],true))exit(1);
require_once MODX_CORE_PATH.'components/cookieconsent/src/CookieConsentBundleManager.php';
$plugins=$modx->getCount('modPlugin',['name'=>'CookieConsentCacheBuild']);
$plugin=$modx->getObject('modPlugin',['name'=>'CookieConsentCacheBuild']);
$events=$plugin?$modx->getCount('modPluginEvent',['pluginid'=>$plugin->get('id'),'event'=>'OnSiteRefresh']):0;
$status=CookieConsentBundleManager::status($modx);
if($plugins!==1||$events!==1||$status['state']!=='ready')throw new RuntimeException('Native cache plugin/event/warmup regression');
echo json_encode(['result'=>'PASS','assertions'=>3,'database'=>$modx->getOption('dbname'),'plugins'=>$plugins,'events'=>$events,'state'=>$status['state']])."\n";
