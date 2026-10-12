<?php
if(($options[xPDOTransport::PACKAGE_ACTION]??0)===xPDOTransport::ACTION_UNINSTALL)return true;
try {
    $modx=$transport->xpdo;
    foreach($spec['files'] as $entry){[$kind,$relative]=explode('/',$entry['target'],2);$file=$modx->getOption($kind.'_path').$relative;clearstatcache(true,$file);if(!is_file($file)||hash_file('sha256',$file)!==$entry['sha256'])throw new RuntimeException('Native file copy incomplete');if(substr($file,-4)==='.php'&&function_exists('opcache_invalidate'))opcache_invalidate($file,true);}
    foreach($modx->getCollection('modAccessPolicyTemplate') as $template){$criteria=['template'=>$template->get('id'),'name'=>'cookie_consent_manage'];if(!$modx->getObject('modAccessPermission',$criteria)){$row=$modx->newObject('modAccessPermission');$row->fromArray($criteria+['description'=>'Manage Cookie Consent Manager','value'=>true]);if(!$row->save())throw new RuntimeException('Permission definition failed');}}
    $modx->log(xPDO::LOG_LEVEL_INFO,'Cookie Consent native files verified. Configure private audit in CMP; templates and consent logs were not changed.');return true;
}catch(Throwable $e){try{$transport->xpdo->log(xPDO::LOG_LEVEL_ERROR,'Cookie Consent verification failed. Partial installation is possible; inspect native logs and restore backup.');}catch(Throwable $ignored){}return false;}
