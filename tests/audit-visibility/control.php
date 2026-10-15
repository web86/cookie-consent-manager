<?php
if(PHP_SAPI!=='cli'||!getenv('CC_DB_PASSWORD'))exit(1);
$marker=json_decode(file_get_contents('/opt/cc-private/disposable-audit-visibility.json'),true);
if(($marker['fixture']??'')!=='cookie-consent-audit-visibility')exit(1);
define('MODX_API_MODE',true);ob_start();require '/var/www/html/index.php';while(ob_get_level())ob_end_clean();
if($modx->query('SELECT DATABASE()')->fetchColumn()!=='cookie_consent_audit_visibility'||$modx->getVersionData()['full_version']!=='2.8.8-pl')exit(1);
require_once MODX_CORE_PATH.'components/cookieconsent/src/CookieConsentSettings.php';
function setting($key,$value){global $modx;$s=$modx->getObject('modSystemSetting',['key'=>$key])?:$modx->newObject('modSystemSetting');$s->fromArray(['key'=>$key,'value'=>is_string($value)?$value:json_encode($value)],'',true,true);if(!$s->save())throw new RuntimeException('Setting save');}
function refresh(){global $modx;$modx->cacheManager->refresh();}
$action=$argv[1]??'';
if($action==='setup'){
    foreach(['CookieConsent'=>'consent','CookieConsentAssets'=>'assets','CookieConsentBanner'=>'banner'] as $name=>$file){$s=$modx->getObject('modSnippet',['name'=>$name])?:$modx->newObject('modSnippet');$s->fromArray(['name'=>$name,'static'=>0,'snippet'=>preg_replace('/^<\?php\s*/','',file_get_contents('/opt/cc-source/server/modx2-'.$file.'-snippet.php'))],'',true,true);$s->save();}
    $s=$modx->getObject('modChunk',['name'=>'CookiesPopup'])?:$modx->newObject('modChunk');$s->fromArray(['name'=>'CookiesPopup','static'=>0,'snippet'=>file_get_contents('/opt/cc-source/CookiesPopup.html')],'',true,true);$s->save();
    setting('parser_class','pdoParser');setting('parser_class_path',MODX_CORE_PATH.'components/pdotools/model/pdotools/');
    foreach(['default'=>true,'parser'=>true,'cache'=>true,'php'=>false,'modx'=>false] as $key=>$v)setting('pdotools_fenom_'.$key,$v?'1':'0');
    setting('pdotools_fenom_syntax',''); // Upstream default; the separate JSON/Fenom fix stays in PR #4.
    setting('cookie_consent.texts',CookieConsentTexts::defaults());
    $dir='/opt/cc-private/audit-logs';if(!is_dir($dir))mkdir($dir,0700);chown($dir,'www-data');chmod($dir,0700);setting('cookie_consent.log_dir',$dir);
    $config='/opt/cc-private/audit.json';if(!is_file($config))file_put_contents($config,json_encode(['site_origin'=>'http://127.0.0.1:18989','rate_limit_key'=>bin2hex(random_bytes(32)),'rate_limit_per_minute'=>10000]));chown($config,'www-data');chmod($config,0600);setting('cookie_consent.audit_config_file',$config);
    $ids=[];foreach(['en','ru'] as $lang){
        $key='fenom-'.$lang;$ctx=$modx->getObject('modContext',['key'=>$key])?:$modx->newObject('modContext');$ctx->set('key',$key);if(!$ctx->save())throw new RuntimeException('Context save');
        foreach(['cultureKey'=>$lang,'site_url'=>'http://127.0.0.1:18989/','base_url'=>'/'] as $k=>$v){$s=$modx->getObject('modContextSetting',['context_key'=>$key,'key'=>$k])?:$modx->newObject('modContextSetting');$s->fromArray(['context_key'=>$key,'key'=>$k,'value'=>$v],'',true,true);$s->save();}
        foreach(['standard-split','fenom-split','fenom-legacy'] as $mode){
            $head=$mode==='standard-split'?'[[!CookieConsentAssets]]':($mode==='fenom-split'?"{'!CookieConsentAssets' | snippet}":'');
            $body=$mode==='standard-split'?'[[!CookieConsentBanner]]':"{'!".($mode==='fenom-legacy'?'CookieConsent':'CookieConsentBanner')."' | snippet}";
            $name='Audit visibility '.$lang.' '.$mode;$t=$modx->getObject('modTemplate',['templatename'=>$name])?:$modx->newObject('modTemplate');$t->fromArray(['templatename'=>$name,'content'=>'<!doctype html><html lang="'.$lang.'"><head><meta charset="UTF-8">'.$head.'</head><body><span id="cache-source">[^s^]</span><button data-cookie-settings-open>Settings</button><div data-cc-map-provider="yandex_maps" data-cc-map-src="https://yandex.ru/map-widget/v1/?ll=37.62%2C55.75&amp;z=10"></div>'.$body.'</body></html>'],'',true,true);$t->save();
            $r=$modx->getObject('modResource',['alias'=>$lang.'-'.$mode,'context_key'=>$key])?:$modx->newObject('modResource');$r->fromArray(['pagetitle'=>$name,'alias'=>$lang.'-'.$mode,'context_key'=>$key,'template'=>$t->get('id'),'published'=>1,'cacheable'=>1],'',true,true);$r->save();$ids[$lang][$mode]=(int)$r->get('id');
        }
    }refresh();echo json_encode($ids);exit;
}
if($action==='runtime'){
    $baseline=($argv[2]??'')==='baseline';
    foreach(['src/CookieConsentEventValidator.php','src/CookieConsentAuditLogger.php','public/audit.php'] as $path)copy($baseline?'/opt/cc-private/baseline/'.basename($path):'/opt/cc-source/server/'.$path,MODX_CORE_PATH.'components/cookieconsent/'.$path);
    copy($baseline?'/opt/cc-private/baseline/modx2-public-endpoint.example.php':'/opt/cc-source/server/modx2-public-endpoint.example.php','/var/www/html/assets/components/cookieconsent/audit.php');
    refresh();exit;
}
if($action==='visibility'){
    $mask=(int)$argv[2];$o=CookieConsentSettings::defaults();foreach(CookieConsentSettings::CATEGORIES as $i=>$c)$o['categories'][$c]=(bool)($mask&(1<<$i));
    if(($argv[3]??'')==='legacy')unset($o['categories'],$o['category_versions']);
    setting('cookie_consent.options',$o);if(($argv[3]??'')!=='stale')refresh();exit;
}
if($action==='context-visibility'){
    $o=CookieConsentSettings::defaults();foreach(CookieConsentSettings::CATEGORIES as $i=>$c)$o['categories'][$c]=(bool)((int)$argv[2]&(1<<$i));
    $s=$modx->getObject('modContextSetting',['context_key'=>'web','key'=>'cookie_consent.options'])?:$modx->newObject('modContextSetting');$s->fromArray(['context_key'=>'web','key'=>'cookie_consent.options','value'=>json_encode($o)],'',true,true);$s->save();refresh();exit;
}
if($action==='registry'){
    $r=CookieConsentServiceRegistry::defaults();foreach($r['services'] as &$s){$s['enabled']=in_array($s['key'],['yandex','mailru','yandex_maps'],true)||(($argv[2]??'')==='all'&&$s['key']==='google_ads');if($s['key']==='google_ads')$s['config']=['id'=>'AW-12345678'];}unset($s);setting('cookie_consent.services',CookieConsentServiceRegistry::validateJson(json_encode($r)));refresh();exit;
}
if($action==='clear'){refresh();exit;}
if($action==='records'){
    require_once MODX_CORE_PATH.'components/cookieconsent/src/CookieConsentAuditFormat.php';$path='/opt/cc-private/audit-logs/'.gmdate('Y-m').'-cookie-consent.log';$records=[];
    if(is_file($path))foreach(CookieConsentAuditFormat::records($path) as $r)if(($r['event_id']??null)===($argv[2]??''))$records[]=$r;
    echo json_encode(['file'=>basename($path),'records'=>$records,'bytes'=>is_file($path)?filesize($path):0]);exit;
}
if($action==='metadata'){$parser=$modx->getParser();$parser->pdoTools->getFenom();echo json_encode(['modx'=>$modx->getVersionData()['full_version'],'php'=>PHP_VERSION,'pdoTools'=>$marker['pdoTools'],'fenom'=>Fenom::VERSION,'cache'=>$modx->getOption('pdotools_fenom_cache')]);exit;}
throw new RuntimeException('Unknown action');
