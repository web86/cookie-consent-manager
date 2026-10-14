<?php
if(PHP_SAPI!=='cli'||!is_dir('/opt/cc-source/tests/local'))exit(1);
define('MODX_API_MODE',true);ob_start();require '/var/www/html/index.php';while(ob_get_level())ob_end_clean();
$action=$argv[1]??'';
if($action==='context'){
    $s=$modx->getObject('MODX\Revolution\modContextSetting',['context_key'=>'web','key'=>'cultureKey']);
    if(($argv[2]??'')==='get'){echo json_encode($s?['exists'=>true,'value'=>$s->get('value')]:['exists'=>false]);exit;}
    $value=stream_get_contents(STDIN);
    if($value==='__REMOVE__'){if($s)$s->remove();}
    else {$s=$s?:$modx->newObject('MODX\Revolution\modContextSetting');$s->fromArray(['context_key'=>'web','key'=>'cultureKey','value'=>$value],'',true,true);$s->save();}
} elseif($action==='setting'){
    $key=$argv[2]??'';if($key==='manager_language')$key='cultureKey';if(!in_array($key,['cultureKey','cookie_consent.options','cookie_consent.services','cookie_consent.texts','cookie_consent.log_dir'],true))exit(1);
    $s=$modx->getObject('MODX\Revolution\modSystemSetting',['key'=>$key]);
    if(($argv[3]??'')==='get'){echo $s->get('value');exit;}
    $s->set('value',stream_get_contents(STDIN));if(!$s->save())exit(2);
} elseif($action==='fresh'){
    // Snapshot and remove component settings in this disposable fixture only.
    $saved=[];foreach(['cookie_consent.options','cookie_consent.services','cookie_consent.texts','cookie_consent.log_dir'] as $key){$s=$modx->getObject('MODX\Revolution\modSystemSetting',['key'=>$key]);$saved[$key]=$s->toArray();$s->remove();}
    file_put_contents('/opt/cc-private/component-settings-backup.json',json_encode($saved));
} elseif($action==='restore'){
    foreach(json_decode(file_get_contents('/opt/cc-private/component-settings-backup.json'),true) as $key=>$values){$s=$modx->getObject('MODX\Revolution\modSystemSetting',['key'=>$key])?:$modx->newObject('MODX\Revolution\modSystemSetting');$s->fromArray($values,'',true,true);$s->save();}
} else exit(1);
$modx->cacheManager->refresh();
