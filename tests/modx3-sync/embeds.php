<?php
// Synthetic resource/config operations only; installed runtime is never copied or edited.
declare(strict_types=1);
require __DIR__.'/../modx3/guard.php';
$op=$argv[1]??'';
if($op==='audit-origin'||$op==='audit-restore'){
 $row=$modx->getObject(\MODX\Revolution\modSystemSetting::class,['key'=>'cookie_consent.audit']);$previous=(string)$row->get('value');
 if($op==='audit-origin'){
  $origin=$argv[2]??'';if(!in_array($origin,['http://127.0.0.1:20889','http://127.0.0.1:20891'],true))throw new RuntimeException('Fixture origin');
  $config=json_decode($previous,true,8,JSON_THROW_ON_ERROR);$config['site_origin']=$origin;$config['rate_limit_per_minute']=10000;$row->set('value',json_encode($config));
 }else{$restore=stream_get_contents(STDIN);json_decode($restore,true,8,JSON_THROW_ON_ERROR);$row->set('value',$restore);}
 if(!$row->save())throw new RuntimeException('Fixture audit origin save');$modx->cacheManager->refresh(['system_settings'=>[]]);echo $previous;exit;
}
if($op==='resource'){
 $t=$modx->getObject(\MODX\Revolution\modTemplate::class,['templatename'=>'Sync106 native embeds'])?:$modx->newObject(\MODX\Revolution\modTemplate::class);
 $t->fromArray(['templatename'=>'Sync106 native embeds','content'=>stream_get_contents(STDIN)]);if(!$t->save())throw new RuntimeException('Template save');
 $r=$modx->getObject(\MODX\Revolution\modResource::class,['alias'=>'sync106-embeds'])?:$modx->newObject(\MODX\Revolution\modResource::class);
 $r->fromArray(['pagetitle'=>'Sync106 native embeds','alias'=>'sync106-embeds','context_key'=>'web','template'=>$t->get('id'),'published'=>1,'cacheable'=>1]);if(!$r->save())throw new RuntimeException('Resource save');
 $modx->cacheManager->refresh();$modx->cacheManager->refresh(['pdotools'=>[]]);echo $r->get('id');exit;
}
throw new RuntimeException('Unknown embed fixture action');
