<?php
// Isolated acceptance fixture only. Never copies or edits installed component sources.
if(PHP_SAPI!=='cli'||!getenv('CC_DB_PASSWORD'))exit(1);
define('MODX_API_MODE',true);ob_start();require '/var/www/html/index.php';while(ob_get_level())ob_end_clean();
if($modx->query('SELECT DATABASE()')->fetchColumn()!=='cookie_consent_test')exit(1);
$keys=['parser_class','parser_class_path','pdotools_fenom_default','pdotools_fenom_parser','pdotools_fenom_cache','pdotools_fenom_syntax'];$op=$argv[1]??'';
if($op==='parser-snapshot'){$out=[];foreach($keys as $key){$s=$modx->getObject('modSystemSetting',['key'=>$key]);$out[$key]=$s?$s->get('value'):null;}echo json_encode($out);exit;}
if($op==='parser-restore'){$data=json_decode(stream_get_contents(STDIN),true,8,JSON_THROW_ON_ERROR);if(array_keys($data)!==$keys)exit(1);foreach($data as $key=>$value){$s=$modx->getObject('modSystemSetting',['key'=>$key]);if($value===null){if($s)$s->remove();}else{$s=$s?:$modx->newObject('modSystemSetting');$s->fromArray(['key'=>$key,'value'=>$value],'',true,true);$s->save();}}$modx->cacheManager->refresh();exit;}
$template=$modx->getObject('modTemplate',['templatename'=>'Video native acceptance fixture']);$resource=$modx->getObject('modResource',['alias'=>'cc-video-native-fixture','context_key'=>'web']);
if($op==='resource'){$template=$template?:$modx->newObject('modTemplate');$template->fromArray(['templatename'=>'Video native acceptance fixture','content'=>stream_get_contents(STDIN)],'',true,true);if(!$template->save())throw new RuntimeException('Template save');$resource=$resource?:$modx->newObject('modResource');$resource->fromArray(['pagetitle'=>'Video native acceptance fixture','alias'=>'cc-video-native-fixture','context_key'=>'web','template'=>$template->get('id'),'published'=>1,'cacheable'=>1],'',true,true);if(!$resource->save())throw new RuntimeException('Resource save');$modx->cacheManager->refresh();echo $resource->get('id');exit;}
if($op==='remove'){if($resource)$resource->remove();if($template)$template->remove();$modx->cacheManager->refresh();exit;}
throw new RuntimeException('Unknown video fixture operation');
