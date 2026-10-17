<?php
/** Test-only controls for newly created, isolated release upgrade fixtures. */
declare(strict_types=1);
if(PHP_SAPI!=='cli'||!getenv('CC_DB_PASSWORD'))exit(1);
$case=$argv[1]??'';$op=$argv[2]??'';
if(!preg_match('/^ui-refinement-rt([23])-[a-z0-9-]+$/D',$case,$match))exit(1);
$major=$match[1];$base='/opt/cc-updates/cases/'.$case.'/';
$expected=($major==='3'?'cc_adapter3_':'cc_adapter_').str_replace('-','_',$case);
$destination=(static function($path){require $path;return [$database_server??null,$dbase??null];})($base.'private/core/config/config.inc.php');
if($destination!==['db',$expected])throw new RuntimeException('Foreign fixture destination refused');
$_SESSION=[];
define('MODX_API_MODE',true);ob_start();require $base.'site/index.php';while(ob_get_level())ob_end_clean();
if($modx->query('SELECT DATABASE()')->fetchColumn()!==$expected)exit(1);
if($major==='3'&&class_exists('modX',false))throw new RuntimeException('Deprecated aliases must be disabled');
$class=fn($name)=>$major==='3'?'MODX\\Revolution\\'.$name:$name;
$core=MODX_CORE_PATH.'components/cookieconsent/';$assets=MODX_ASSETS_PATH;
if($op==='seed'){
    require_once $core.'src/CookieConsentSettings.php';
    $options=CookieConsentSettings::defaults();$options['ttl_days']=173;$options['policy_version']='release_probe';
    $options['buttons']=['reject'=>true,'configure'=>false,'accept_all'=>true,'accept'=>($argv[3]??'strict')==='legacy'];
    $options['categories']=['analytics'=>true,'marketing'=>true,'external_content'=>true];$options['category_versions']=['analytics'=>3,'marketing'=>4,'external_content'=>5];
    $registry=CookieConsentServiceRegistry::defaults();
    $ids=['yandex'=>'12345678','mailru'=>'3265404','google_ga4'=>'G-TEST1234','google_gtm'=>'GTM-ABC1234','google_ads'=>'AW-1234567','vk_ads'=>'112233','meta_pixel'=>'123456789012'];
    foreach($registry['services'] as &$s){$s['enabled']=true;$s['config']=(array)$s['config'];if(isset($ids[$s['loader']]))$s['config']['id']=$ids[$s['loader']];if($s['loader']==='yandex')$s['config']['webvisor']=false;}unset($s);
    $registry['services'][]=['key'=>'customer_owner','purpose_id'=>'customer_owner','loader'=>'custom_js','category'=>'marketing','enabled'=>true,'name'=>'Owner integration','purpose'=>'Preserved customer integration','config'=>['path'=>'/assets/js/customer-owner.js']];
    $texts=CookieConsentTexts::defaults();$texts['locales']['ru']['analytics_name']='Моя аналитика';$texts['locales']['en']['analytics_name']='My analytics';
    $dir=$base.'private/release-journal';if(!mkdir($dir,0700))throw new RuntimeException('Existing fixture journal preserved');
    foreach(['cookie_consent.options'=>$options,'cookie_consent.services'=>$registry,'cookie_consent.texts'=>$texts,'cookie_consent.log_dir'=>$dir] as $key=>$value){$row=$modx->getObject($class('modSystemSetting'),['key'=>$key]);if(!$row)throw new RuntimeException('Install baseline first');$row->set('value',is_array($value)?json_encode($value,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR):$value);if(!$row->save())throw new RuntimeException('Fixture save');}
    foreach(['2024-02','2024-03'] as $i=>$month){$r=['schema'=>1,'server_time'=>$month.'-01T00:00:00Z','event_id'=>'aaaaaaaa-aaaa-4aaa-8aaa-00000000000'.($i+1),'consent_id'=>'bbbbbbbb-bbbb-4bbb-8bbb-000000000001','ip'=>'127.0.0.1','user_agent'=>'Release upgrade fixture','event'=>'reject','stage'=>'committed','categories'=>['necessary'=>true,'analytics'=>false,'marketing'=>false],'policy_version'=>'1'];if($i)$r['page']='/historical/page/';file_put_contents($dir.'/'.$month.'-cookie-consent.log',json_encode($r)."\n");}
    file_put_contents($assets.'js/customer-owner.js','window.__ccReleaseOwner=(window.__ccReleaseOwner||0)+1;');
    file_put_contents($assets.'js/cookie-consent/services/customer-extra.js','window.__ccReleaseExtra=true;');
    foreach(['CookiesPopup','CookieConsentAssets'] as $name){$row=$modx->getObject($class($name==='CookiesPopup'?'modChunk':'modSnippet'),['name'=>$name]);$row->set('description','Customer metadata retained across upgrade');$row->save();}
    $modx->cacheManager->refresh();echo json_encode(['seeded'=>true]);exit;
}
if($op==='page'){
    $html='<!doctype html><html><head><meta name="cc-release-case" content="'.htmlspecialchars($case,ENT_QUOTES,'UTF-8').'"><title>Release upgrade fixture</title>[[!CookieConsentAssets]]</head><body>[[!CookieConsentMap? &provider=`google_maps` &src=`https://www.google.com/maps/embed?pb=fixture`]][[!CookieConsentMap? &provider=`yandex_maps` &src=`https://yandex.ru/map-widget/v1/?ll=37.62%2C55.75&z=10`]][[!CookieConsentVideo? &provider=`youtube` &url=`https://youtu.be/M7lc1UVf-VE`]][[!CookieConsentVideo? &provider=`rutube` &url=`https://rutube.ru/video/7716bd3e665725c3c008ae7ab4ff02e2/`]][[!CookieConsentVideo? &provider=`vk_video` &url=`https://vkvideo.ru/video_ext.php?oid=-1&id=2&hash=0123456789abcdef`]]<div data-cc-embed="customer_owner"><template><iframe src="https://player.example.test/fixture" title="Customer frame"></iframe></template></div>[[!CookieConsentBanner]]<script>document.addEventListener("DOMContentLoaded",function(){window.web86CookieConsent.onAllowed("marketing",function(stillAllowed){if(stillAllowed())window.__ccAllowed=(window.__ccAllowed||0)+1;},{service:"customer_owner"});});</script></body></html>';
    $r=$modx->getObject($class('modResource'),['alias'=>'release-upgrade-page'])?:$modx->newObject($class('modResource'));$r->fromArray(['pagetitle'=>'Release upgrade fixture','alias'=>'release-upgrade-page','published'=>1,'template'=>0,'cacheable'=>1,'content'=>$html],'',true,true);$r->save();$modx->cacheManager->refresh();echo json_encode(['id'=>$r->get('id')]);exit;
}
if($op==='state'){
    $settings=[];foreach($modx->getCollection($class('modSystemSetting'),['key:LIKE'=>'cookie_consent.%']) as $row)if($row->get('key')!=='cookie_consent.bundle_version')$settings[$row->get('key')]=hash('sha256',(string)$row->get('value'));ksort($settings);
    $logs=[];$dir=(string)$modx->getOption('cookie_consent.log_dir',null,'');if(str_starts_with($dir,$base))foreach(glob(rtrim($dir,'/').'/*-cookie-consent.log')?:[] as $file)$logs[basename($file)]=hash_file('sha256',$file);
    $owner=[];foreach(['js/customer-owner.js','js/cookie-consent/services/customer-extra.js'] as $path)if(is_file($assets.$path))$owner[$path]=hash_file('sha256',$assets.$path);
    $errors=0;foreach(is_file(MODX_CORE_PATH.'cache/logs/error.log')?file(MODX_CORE_PATH.'cache/logs/error.log'):[] as $line)if(str_contains($line,'(ERROR @'))$errors++;
    echo json_encode(['settings'=>$settings,'logs'=>$logs,'owner'=>$owner,'manifest'=>is_file($core.'frontend-manifest.json')?json_decode(file_get_contents($core.'frontend-manifest.json'),true):null,'checksum_state_exists'=>file_exists($core.'adapter-checksums.json'),'php_error_count'=>$errors,'php'=>PHP_VERSION,'aliases_off'=>$major!=='3'||!class_exists('modX',false)]);exit;
}
throw new RuntimeException('Unknown release fixture operation');
