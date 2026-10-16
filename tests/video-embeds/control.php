<?php
// Isolated acceptance fixture only. Never copies or edits installed component sources.
if(PHP_SAPI!=='cli'||!getenv('CC_DB_PASSWORD'))exit(1);
define('MODX_API_MODE',true);ob_start();require '/var/www/html/index.php';while(ob_get_level())ob_end_clean();
$database=$modx->query('SELECT DATABASE()')->fetchColumn();if(!in_array($database,['cookie_consent_test','cookie_consent_fenom'],true))exit(1);if($database==='cookie_consent_fenom'){if(!is_file('/opt/cc-private/disposable-fenom.json')||(json_decode(file_get_contents('/opt/cc-private/disposable-fenom.json'),true)['fixture']??'')!=='cookie-consent-fenom')exit(1);}
$keys=['parser_class','parser_class_path','pdotools_fenom_default','pdotools_fenom_parser','pdotools_fenom_cache','pdotools_fenom_syntax'];$op=$argv[1]??'';
if($op==='prepare-native'){
    // This marked clone predates native PM fixtures and may lack stock package processors.
    $processorDir=MODX_CORE_PATH.'model/modx/processors/workspace/packages';
    if($database==='cookie_consent_fenom'&&!is_dir($processorDir)){
        if($modx->getVersionData()['full_version']!=='2.8.8-pl')exit(1);
        $stock='/opt/cc-source/.local/private/core/model/modx/processors/workspace/packages';
        $copyStock=function(string $from,string $to)use(&$copyStock):void{if(!is_dir($to)&&!mkdir($to,0755,true))throw new RuntimeException('Stock processor directory');foreach(new DirectoryIterator($from) as $entry){if($entry->isDot())continue;if($entry->isLink())throw new RuntimeException('Stock symlink');$target=$to.'/'.$entry->getFilename();if($entry->isDir())$copyStock($entry->getPathname(),$target);else{if(!copy($entry->getPathname(),$target)||hash_file('sha256',$target)!==hash_file('sha256',$entry->getPathname()))throw new RuntimeException('Stock processor copy');}}};
        $copyStock($stock,$processorDir);
    }
    $dirs=[MODX_CORE_PATH.'packages',MODX_CORE_PATH.'cache','/opt/cc-private/logs'];
    $meta=json_decode(file_get_contents('/opt/cc-source/_build/package.json'),true,8,JSON_THROW_ON_ERROR);$signature=$meta['name'].'-'.$meta['version'].'-'.$meta['release'].$meta['release_index'];$spec=json_decode(file_get_contents('/opt/cc-source/.local/artifacts/'.$signature.'.inventory.json'),true,64,JSON_THROW_ON_ERROR);
    foreach($spec['files'] as $file){[$kind,$relative]=explode('/',$file['target'],2);$path=$modx->getOption($kind.'_path').$relative;$dirs[]=dirname($path);if(is_file($path))chown($path,'www-data');}
    foreach(array_unique($dirs) as $dir){if(!is_dir($dir)&&!mkdir($dir,0755,true))throw new RuntimeException('Fixture directory');chown($dir,'www-data');chmod($dir,$dir==='/opt/cc-private/logs'?0700:0755);}
    echo 'Native fixture paths prepared';exit;
}
if($op==='record'){$id=$argv[2]??'';if(!preg_match('/^[a-f0-9-]{36}$/D',$id))exit(1);require_once MODX_CORE_PATH.'components/cookieconsent/src/CookieConsentAuditFormat.php';$dir=$modx->getObject('modSystemSetting',['key'=>'cookie_consent.log_dir'])->get('value');$file=rtrim($dir,'/').'/'.gmdate('Y-m').'-cookie-consent.log';$records=[];if(is_file($file))foreach(CookieConsentAuditFormat::records($file) as $record)if($record['event_id']===$id)$records[]=$record;echo json_encode(['records'=>$records]);exit;}
if($op==='audit'){require_once MODX_CORE_PATH.'components/cookieconsent/src/CookieConsentAuditConfiguration.php';CookieConsentAuditConfiguration::setup($modx,10000,$database==='cookie_consent_fenom'?'http://127.0.0.1:18988':'http://127.0.0.1:8888');echo 'Audit fixture configured';exit;}
if($op==='parser'){$mode=$argv[2]??'';if(!in_array($mode,['standard','fenom'],true))exit(1);$values=['parser_class'=>$mode==='standard'?'modParser':'pdoParser','parser_class_path'=>MODX_CORE_PATH.($mode==='standard'?'model/modx/':'components/pdotools/model/pdotools/'),'pdotools_fenom_default'=>'1','pdotools_fenom_parser'=>'1','pdotools_fenom_cache'=>'1','pdotools_fenom_syntax'=>''];foreach($values as $key=>$value){$setting=$modx->getObject('modSystemSetting',['key'=>$key])?:$modx->newObject('modSystemSetting');$setting->fromArray(['key'=>$key,'value'=>$value],'',true,true);if(!$setting->save())throw new RuntimeException('Parser setting');}$modx->cacheManager->refresh();exit;}
if($op==='parser-snapshot'){$out=[];foreach($keys as $key){$s=$modx->getObject('modSystemSetting',['key'=>$key]);$out[$key]=$s?$s->get('value'):null;}echo json_encode($out);exit;}
if($op==='parser-restore'){$data=json_decode(stream_get_contents(STDIN),true,8,JSON_THROW_ON_ERROR);if(array_keys($data)!==$keys)exit(1);foreach($data as $key=>$value){$s=$modx->getObject('modSystemSetting',['key'=>$key]);if($value===null){if($s)$s->remove();}else{$s=$s?:$modx->newObject('modSystemSetting');$s->fromArray(['key'=>$key,'value'=>$value],'',true,true);$s->save();}}$modx->cacheManager->refresh();exit;}
$template=$modx->getObject('modTemplate',['templatename'=>'Video native acceptance fixture']);$resource=$modx->getObject('modResource',['alias'=>'cc-video-native-fixture','context_key'=>'web']);
if($op==='resource'){$template=$template?:$modx->newObject('modTemplate');$template->fromArray(['templatename'=>'Video native acceptance fixture','content'=>stream_get_contents(STDIN)],'',true,true);if(!$template->save())throw new RuntimeException('Template save');$resource=$resource?:$modx->newObject('modResource');$resource->fromArray(['pagetitle'=>'Video native acceptance fixture','alias'=>'cc-video-native-fixture','context_key'=>'web','template'=>$template->get('id'),'published'=>1,'cacheable'=>1],'',true,true);if(!$resource->save())throw new RuntimeException('Resource save');$modx->cacheManager->refresh();echo $resource->get('id');exit;}
if($op==='remove'){if($resource)$resource->remove();if($template)$template->remove();$modx->cacheManager->refresh();exit;}
throw new RuntimeException('Unknown video fixture operation');
