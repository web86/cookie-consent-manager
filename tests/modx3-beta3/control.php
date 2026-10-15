<?php
declare(strict_types=1);
require __DIR__.'/../modx3/guard.php';
use MODX\Revolution\modSystemSetting;
use MODX\Revolution\modContext;
use MODX\Revolution\modContextSetting;
use MODX\Revolution\modResource;
use MODX\Revolution\modTemplate;
use MODX\Revolution\modSnippet;
use MODX\Revolution\modChunk;
function setting(string $key,$value):void {
    global $modx;
    $s=$modx->getObject(modSystemSetting::class,['key'=>$key])?:$modx->newObject(modSystemSetting::class);
    $s->fromArray(['key'=>$key,'value'=>is_string($value)?$value:json_encode($value,JSON_THROW_ON_ERROR)],'',true,true);
    if(!$s->save())throw new RuntimeException('Setting save');
}
function refresh():void {global $modx;$modx->cacheManager->refresh();$modx->cacheManager->refresh(['pdotools'=>[]]);}
function logFiles():array {
    global $modx;
    $s=$modx->getObject(modSystemSetting::class,['key'=>'cookie_consent.log_dir']);
    return $s?glob(rtrim($s->get('value'),'/').'/*-cookie-consent.log'):[];
}
$action=$argv[1]??'';
if($action==='manager-baseline'){
    if($modx->query('SELECT DATABASE()')->fetchColumn()!=='cookie_consent_modx3_fresh')throw new RuntimeException('Fresh fixture required');
    require_once MODX_CORE_PATH.'components/cookieconsent/src/CookieConsentSettings.php';setting('cookie_consent.options',CookieConsentSettings::defaults());setting('cookie_consent.texts',CookieConsentTexts::defaults());refresh();echo json_encode(['baseline'=>true]);exit;
}
if($action==='configure'){
    require_once MODX_CORE_PATH.'components/cookieconsent/src/CookieConsentSettings.php';
    $r=CookieConsentServiceRegistry::defaults();
    foreach($r['services'] as &$s){$s['enabled']=in_array($s['key'],['yandex','mailru','yandex_maps'],true);if($s['key']==='yandex'){$s['config']['id']='12345678';$s['purpose_id']='owner.statistics';}if($s['key']==='mailru')$s['config']['id']='87654321';}unset($s);
    setting('cookie_consent.services',$r);
    $o=CookieConsentSettings::defaults();$o['ttl_days']=123;$o['categories']=['analytics'=>true,'marketing'=>false,'external_content'=>true];setting('cookie_consent.options',$o);
    $t=CookieConsentTexts::defaults();$t['locales']['ru']['notice_html']='<p>Текст владельца RU <a href="/privacy">Политика</a></p>';$t['locales']['en']=['notice_html'=>'<p>Owner EN notice <a href="/privacy">Policy</a></p>','analytics_name'=>'Owner statistics'];setting('cookie_consent.texts',$t);
    setting('cookie_consent.log_dir','/opt/cc-private/logs');setting('cookie_consent.audit_config_file','');setting('cookie_consent.audit','');
    require_once MODX_CORE_PATH.'components/cookieconsent/src/CookieConsentAuditConfiguration.php';
    CookieConsentAuditConfiguration::setup($modx,10000,'http://127.0.0.1:'.$argv[2]);
    require_once MODX_CORE_PATH.'components/cookieconsent/src/CookieConsentAuditFormat.php';
    $historic=['schema'=>1,'server_time'=>'2020-01-01T00:00:00Z','event_id'=>'aaaaaaaa-aaaa-4aaa-8aaa-000000000001','consent_id'=>'bbbbbbbb-bbbb-4bbb-8bbb-000000000001','ip'=>'127.0.0.1','user_agent'=>'Synthetic history','event'=>'reject','stage'=>'committed','categories'=>['necessary'=>true,'analytics'=>false,'marketing'=>false],'policy_version'=>'1','page'=>'/sentinel','client_time'=>'2020-01-01T00:00:00.000Z'];
    $file='/opt/cc-private/logs/2020-01-cookie-consent.log';if(!is_file($file))file_put_contents($file,CookieConsentAuditFormat::HEADER."\n".json_encode($historic)."\n");
    foreach(['CookiesPopup'=>modChunk::class,'CookieConsent'=>modSnippet::class,'CookieConsentMap'=>modSnippet::class,'CookieConsentAssets'=>modSnippet::class,'CookieConsentBanner'=>modSnippet::class] as $name=>$class){$s=$modx->getObject($class,['name'=>$name]);$s->set('description','Owner metadata '.$name);$s->setProperties(['owner'=>['name'=>'owner','value'=>'keep-'.$name,'type'=>'textfield']]);$s->save();}
    $c=$modx->getObject(modChunk::class,['name'=>'Beta3 unrelated'])?:$modx->newObject(modChunk::class);$c->fromArray(['name'=>'Beta3 unrelated','snippet'=>'Unrelated owner content'],'',true,true);$c->save();setting('beta3.sentinel','Owner setting');
    refresh();echo json_encode(['configured'=>true]);exit;
}
if($action==='pages'){
    $out=[];$port=$argv[2];
    foreach(['ru','en'] as $lang){$key='beta3-'.$lang;$c=$modx->getObject(modContext::class,['key'=>$key])?:$modx->newObject(modContext::class);$c->set('key',$key);$c->save();
        foreach(['cultureKey'=>$lang,'site_url'=>'http://127.0.0.1:'.$port.'/','base_url'=>'/','http_host'=>'127.0.0.1:'.$port] as $k=>$v){$s=$modx->getObject(modContextSetting::class,['context_key'=>$key,'key'=>$k])?:$modx->newObject(modContextSetting::class);$s->fromArray(['context_key'=>$key,'key'=>$k,'value'=>$v],'',true,true);$s->save();}
        foreach(['standard-split','standard-legacy','fenom-split','fenom-legacy'] as $mode){$fenom=str_starts_with($mode,'fenom');$legacy=str_ends_with($mode,'legacy');$head=$legacy?'':($fenom?"{'!CookieConsentAssets' | snippet}":'[[!CookieConsentAssets]]');$name=$legacy?'CookieConsent':'CookieConsentBanner';$body=$fenom?"{'!".$name."' | snippet}":'[[!'.$name.']]';
            $title='Beta3 '.$lang.' '.$mode;$t=$modx->getObject(modTemplate::class,['templatename'=>$title])?:$modx->newObject(modTemplate::class);$t->fromArray(['templatename'=>$title,'content'=>'<!doctype html><html lang="'.$lang.'"><head><meta charset="UTF-8">'.$head.'</head><body><main id="fixture-ready">Native MODX 3</main><span id="cache-source">[^s^]</span><button data-cookie-settings-open>Settings</button><div data-cc-map-provider="yandex_maps" data-cc-map-src="https://yandex.ru/map-widget/v1/?ll=37.62%2C55.75&amp;z=10"></div>'.$body.'</body></html>'],'',true,true);$t->save();
            $r=$modx->getObject(modResource::class,['alias'=>$lang.'-'.$mode,'context_key'=>$key])?:$modx->newObject(modResource::class);$r->fromArray(['pagetitle'=>$title,'alias'=>$lang.'-'.$mode,'context_key'=>$key,'template'=>$t->get('id'),'published'=>1,'cacheable'=>1],'',true,true);$r->save();$out[$lang][$mode]=(int)$r->get('id');
        }
    }
    file_put_contents('/var/www/html/beta3.php',"<?php require __DIR__.'/config.core.php';require MODX_CORE_PATH.'vendor/autoload.php';\$c=\$_GET['ctx']??'beta3-en';if(!in_array(\$c,['beta3-en','beta3-ru'],true))exit;\$modx=new \\MODX\\Revolution\\modX();\$modx->initialize(\$c);\$modx->handleRequest();");refresh();echo json_encode($out);exit;
}
if($action==='parser'){
    setting('cache_resource_handler',xPDO\Cache\xPDOFileCache::class);
    setting('modParser.class',($argv[2]??'')==='standard'?MODX\Revolution\modParser::class:ModxPro\PdoTools\Parsing\Parser::class);
    foreach(['default','parser','cache'] as $key)setting('pdotools_fenom_'.$key,'1');
    setting('pdotools_fenom_syntax',($argv[3]??'')==='all'?'#\\{#':'');refresh();echo json_encode(['configured'=>true]);exit;
}
if($action==='visibility'){
    $s=$modx->getObject(modSystemSetting::class,['key'=>'cookie_consent.options']);$o=json_decode($s->get('value'),true);foreach(['analytics','marketing','external_content'] as $i=>$c)$o['categories'][$c]=(bool)((int)$argv[2]&(1<<$i));setting('cookie_consent.options',$o);refresh();echo json_encode(['categories'=>$o['categories']]);exit;
}
if($action==='record'){
    require_once MODX_CORE_PATH.'components/cookieconsent/src/CookieConsentAuditFormat.php';$records=[];$bytes=0;$file='';foreach(logFiles() as $p){$bytes+=filesize($p);foreach(CookieConsentAuditFormat::records($p) as $r)if($r['event_id']===$argv[2]){$records[]=$r;$file=basename($p);}}echo json_encode(['records'=>$records,'bytes'=>$bytes,'file'=>$file]);exit;
}
if($action==='extra'){
    $out=['other'=>[],'logs'=>[]];$names=['CookiesPopup','CookieConsent','CookieConsentMap','CookieConsentAssets','CookieConsentBanner'];
    foreach([modResource::class,modTemplate::class,modChunk::class,modSnippet::class,modContextSetting::class] as $class)foreach($modx->getCollection($class) as $s)if(!in_array($s->get('name'),$names,true))$out['other'][$class.':'.json_encode($s->getPrimaryKey())]=hash('sha256',json_encode($s->toArray()));
    $s=$modx->getObject(modSystemSetting::class,['key'=>'beta3.sentinel']);$out['other']['setting']=$s?hash('sha256',json_encode($s->toArray())):null;
    foreach(logFiles() as $p)$out['logs'][basename($p)]=hash_file('sha256',$p);
    foreach($out as &$v)ksort($v);unset($v);echo json_encode($out);exit;
}
if($action==='metadata'){
    $pdo=$modx->services->get('pdotools');$pdo->getFenom();echo json_encode(['modx'=>$modx->getVersionData()['full_version'],'php'=>PHP_VERSION,'aliases'=>class_exists('modX',false),'parser'=>get_class($modx->getParser()),'fenom'=>Fenom::VERSION,'fenomCache'=>$modx->getOption('pdotools_fenom_cache'),'compiledCacheFiles'=>is_dir(MODX_CORE_PATH.'cache/pdotools')?iterator_count(new RecursiveIteratorIterator(new RecursiveDirectoryIterator(MODX_CORE_PATH.'cache/pdotools',FilesystemIterator::SKIP_DOTS))):0]);exit;
}
if($action==='log-size'){echo json_encode(is_file(MODX_CORE_PATH.'cache/logs/error.log')?filesize(MODX_CORE_PATH.'cache/logs/error.log'):0);exit;}
if($action==='log'){echo json_encode(is_file(MODX_CORE_PATH.'cache/logs/error.log')?substr(file_get_contents(MODX_CORE_PATH.'cache/logs/error.log'),(int)$argv[2]):'');exit;}
if($action==='upstream-cache-probe'){echo json_encode($modx->services->get('pdotools')->getFenom()->process('Hello {$name}',['name'=>'world']));exit;}
if($action==='watch'){
    $path='/opt/cc-private/beta3-native-events.jsonl';file_put_contents($path,'');chown($path,'www-data');chmod($path,0600);
    $p=$modx->getObject(MODX\Revolution\modPlugin::class,['name'=>'Beta3 native observer'])?:$modx->newObject(MODX\Revolution\modPlugin::class);
    $p->fromArray(['name'=>'Beta3 native observer','plugincode'=>'if($modx->event->name==="OnPackageInstall")file_put_contents("/opt/cc-private/beta3-native-events.jsonl",json_encode(["signature"=>$package->get("signature"),"action"=>$action])."\\n",FILE_APPEND);'],'',true,true);$p->save();
    $e=$modx->getObject(MODX\Revolution\modPluginEvent::class,['pluginid'=>$p->get('id'),'event'=>'OnPackageInstall'])?:$modx->newObject(MODX\Revolution\modPluginEvent::class);$e->fromArray(['pluginid'=>$p->get('id'),'event'=>'OnPackageInstall'],'',true,true);$e->save();refresh();echo json_encode(['watch'=>true]);exit;
}
if($action==='events'){echo json_encode(array_map(fn($s)=>json_decode($s,true),file('/opt/cc-private/beta3-native-events.jsonl',FILE_IGNORE_NEW_LINES|FILE_SKIP_EMPTY_LINES)));exit;}
throw new RuntimeException('Unknown beta3 control action');
