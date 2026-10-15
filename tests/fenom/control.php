<?php
// CLI-only mutations of the explicitly marked, isolated synthetic MODX 2 clone.
if(PHP_SAPI!=='cli'||!getenv('CC_DB_PASSWORD'))exit(1);
$marker=json_decode(file_get_contents('/opt/cc-private/disposable-fenom.json'),true);
if(($marker['fixture']??'')!=='cookie-consent-fenom')exit(1);
define('MODX_API_MODE',true);ob_start();require '/var/www/html/index.php';while(ob_get_level())ob_end_clean();
if($modx->query('SELECT DATABASE()')->fetchColumn()!=='cookie_consent_fenom'||$modx->getVersionData()['full_version']!=='2.8.8-pl')exit(1);
require_once MODX_CORE_PATH.'components/cookieconsent/src/CookieConsentSettings.php';
function setting($key,$value){global $modx;$s=$modx->getObject('modSystemSetting',['key'=>$key])?:$modx->newObject('modSystemSetting');$s->fromArray(['key'=>$key,'value'=>is_string($value)?$value:json_encode($value)],'',true,true);if(!$s->save())throw new RuntimeException('Setting save');}
function refresh(){global $modx;$modx->cacheManager->refresh();}
$action=$argv[1]??'';
if($action==='setup'){
    foreach(['CookieConsent'=>'consent','CookieConsentAssets'=>'assets','CookieConsentBanner'=>'banner'] as $name=>$file){
        $s=$modx->getObject('modSnippet',['name'=>$name])?:$modx->newObject('modSnippet');
        $s->fromArray(['name'=>$name,'static'=>0,'snippet'=>preg_replace('/^<\?php\s*/','',file_get_contents('/opt/cc-source/server/modx2-'.$file.'-snippet.php'))],'',true,true);$s->save();
    }
    $chunk=$modx->getObject('modChunk',['name'=>'CookiesPopup'])?:$modx->newObject('modChunk');
    $chunk->fromArray(['name'=>'CookiesPopup','static'=>0,'snippet'=>file_get_contents('/opt/cc-source/CookiesPopup.html')],'',true,true);$chunk->save();
    setting('parser_class','pdoParser');setting('parser_class_path',MODX_CORE_PATH.'components/pdotools/model/pdotools/');
    foreach(['default'=>true,'parser'=>true,'cache'=>true,'php'=>false,'modx'=>false] as $key=>$value)setting('pdotools_fenom_'.$key,$value?'1':'0');
    // Two enabled synthetic providers exercise real live-mode URLs through browser interception.
    $registry=CookieConsentServiceRegistry::defaults();
    foreach($registry['services'] as &$s){$s['enabled']=in_array($s['key'],['yandex','yandex_maps'],true);if($s['key']==='yandex')$s['config']['id']='12345678';}unset($s);
    setting('cookie_consent.services',$registry);file_put_contents('/opt/cc-private/valid-registry.json',json_encode($registry));
    $options=CookieConsentSettings::defaults();$options['categories']=array_fill_keys(CookieConsentSettings::CATEGORIES,true);setting('cookie_consent.options',$options);
    $texts=CookieConsentTexts::defaults();$texts['locales']['en']=['notice_html'=>'<p>Fixture [[!NeverExecute]] {$neverExecute} &amp; privacy</p>'];
    $texts['locales']['ru']['notice_html']=$texts['locales']['en']['notice_html'];setting('cookie_consent.texts',$texts);
    $ids=[];
    foreach(['en','ru'] as $lang){
        $key='fenom-'.$lang;$ctx=$modx->getObject('modContext',['key'=>$key])?:$modx->newObject('modContext');$ctx->set('key',$key);if(!$ctx->save())throw new RuntimeException('Context save');
        foreach(['cultureKey'=>$lang,'site_url'=>'http://127.0.0.1:18988/','base_url'=>'/','http_host'=>'127.0.0.1:18988'] as $k=>$v){$s=$modx->getObject('modContextSetting',['context_key'=>$key,'key'=>$k])?:$modx->newObject('modContextSetting');$s->fromArray(['context_key'=>$key,'key'=>$k,'value'=>$v],'',true,true);$s->save();}
        foreach(['standard-split','fenom-split','fenom-legacy'] as $mode){
            $head=$mode==='standard-split'?'[[!CookieConsentAssets]]':($mode==='fenom-split'?"{'!CookieConsentAssets' | snippet}":'');
            $body=$mode==='standard-split'?'[[!CookieConsentBanner]]':"{'!".($mode==='fenom-legacy'?'CookieConsent':'CookieConsentBanner')."' | snippet}";
            $name='Fenom acceptance '.$lang.' '.$mode;$t=$modx->getObject('modTemplate',['templatename'=>$name])?:$modx->newObject('modTemplate');
            $t->fromArray(['templatename'=>$name,'content'=>'<!doctype html><html lang="'.$lang.'"><head><meta charset="UTF-8">'.$head.'</head><body><main id="fixture-ready">MODX Fenom acceptance</main><span id="cache-source">[^s^]</span><button data-cookie-settings-open>Settings</button><div data-cc-map-provider="yandex_maps" data-cc-map-src="https://yandex.ru/map-widget/v1/?ll=37.62%2C55.75&amp;z=10"></div><footer id="fixture-footer">'.$body.'</footer></body></html>'],'',true,true);$t->save();
            $r=$modx->getObject('modResource',['alias'=>$lang.'-'.$mode,'context_key'=>$key])?:$modx->newObject('modResource');
            $r->fromArray(['pagetitle'=>$name,'alias'=>$lang.'-'.$mode,'context_key'=>$key,'template'=>$t->get('id'),'published'=>1,'cacheable'=>1],'',true,true);$r->save();$ids[$lang][$mode]=(int)$r->get('id');
        }
    }
    refresh();echo json_encode($ids);exit;
}
if($action==='assets'){
    $source=($argv[2]??'')==='baseline'?'/opt/cc-private/baseline-assets.php':'/opt/cc-source/server/modx2-assets-snippet.php';
    $s=$modx->getObject('modSnippet',['name'=>'CookieConsentAssets']);$s->set('snippet',preg_replace('/^<\?php\s*/','',file_get_contents($source)));$s->save();refresh();exit;
}
if($action==='syntax'){setting('pdotools_fenom_syntax',($argv[2]??'')==='all'?'#\\{#':'');refresh();exit;}
if($action==='parser'){
    setting('parser_class',($argv[2]??'')==='standard'?'modParser':'pdoParser');refresh();exit;
}
if($action==='registry'){
    setting('cookie_consent.services',($argv[2]??'')==='invalid'?'{invalid':file_get_contents('/opt/cc-private/valid-registry.json'));refresh();exit;
}
if($action==='clear'){refresh();exit;}
if($action==='log-size'){echo is_file(MODX_CORE_PATH.'cache/logs/error.log')?filesize(MODX_CORE_PATH.'cache/logs/error.log'):0;exit;}
if($action==='log'){echo is_file(MODX_CORE_PATH.'cache/logs/error.log')?substr(file_get_contents(MODX_CORE_PATH.'cache/logs/error.log'),(int)($argv[2]??0)):'';exit;}
if($action==='metadata'){
    $parser=$modx->getParser();$parser->pdoTools->getFenom();echo json_encode(['modx'=>$modx->getVersionData()['full_version'],'php'=>PHP_VERSION,'parser'=>get_class($parser),'pdoTools'=>$marker['pdoTools'],'fenom'=>Fenom::VERSION,'fenom_cache'=>$modx->getOption('pdotools_fenom_cache'),'fenom_parser'=>$modx->getOption('pdotools_fenom_parser')]);exit;
}
throw new RuntimeException('Unknown fixture action');
