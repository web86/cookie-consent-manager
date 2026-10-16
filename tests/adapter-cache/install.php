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
$root=dirname(__DIR__,2);$meta=json_decode(file_get_contents($root.'/_build/package.json'),true);$signature=$meta['name'].'-'.$meta['version'].'-'.$meta['release'].$meta['release_index'];
$spec=json_decode(file_get_contents($root.'/.local/artifacts/'.$signature.'.inventory.json'),true);$n=3;
foreach($spec['files'] as $entry){[$kind,$relative]=explode('/',$entry['target'],2);$path=$modx->getOption($kind.'_path').$relative;$n++;if(!is_file($path)||hash_file('sha256',$path)!==$entry['sha256'])throw new RuntimeException('Installed runtime differs: '.$entry['target']);}
$n++;if((int)$modx->getOption('cookie_consent.bundle_version',null,0)<=0)throw new RuntimeException('Timestamp missing after install');
if($modx->getOption('dbname')==='cookie_consent_transport_clean'){$n++;if(is_dir(MODX_ASSETS_PATH.'js/cookie-consent/mock'))throw new RuntimeException('Test mocks present on clean install');}
echo json_encode(['result'=>'PASS','assertions'=>$n,'runtime_files'=>count($spec['files']),'database'=>$modx->getOption('dbname'),'plugins'=>$plugins,'events'=>$events,'state'=>$status['state']])."\n";
