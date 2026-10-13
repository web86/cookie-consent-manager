<?php
if(($options[xPDOTransport::PACKAGE_ACTION]??0)===xPDOTransport::ACTION_UNINSTALL)return true;
try {
    $modx=$transport->xpdo;
    foreach($spec['files'] as $entry){[$kind,$relative]=explode('/',$entry['target'],2);$file=$modx->getOption($kind.'_path').$relative;clearstatcache(true,$file);if(!is_file($file)||hash_file('sha256',$file)!==$entry['sha256'])throw new RuntimeException('Native file copy incomplete');if(substr($file,-4)==='.php'&&function_exists('opcache_invalidate'))opcache_invalidate($file,true);}
    $oldCanonical=false;
    foreach(['chunk','snippet','CookieConsent','CookieConsentMap','CookieConsentAssets','CookieConsentBanner'] as $key){$def=$spec['objects'][$key];$row=$modx->getObject($def['class'],$def['criteria']);if(!$row||hash('sha256',$row->get('snippet'))!==hash('sha256',$def['fields']['snippet'])||$row->get('static'))throw new RuntimeException('Canonical source update incomplete');$guid=md5('cookieconsent/'.$key);if(isset($transport->_preserved[$guid]))$oldCanonical=true;}
    // Use MODX's own backup map/file; no independent lifecycle store or tree copies.
    if($oldCanonical&&!$transport->writePreserved())throw new RuntimeException('Native canonical backup failed; restore DB backup');
    foreach($modx->getCollection('modAccessPolicyTemplate') as $template)foreach(['cookie_consent_manage'=>true,'cookie_consent_view_logs'=>false] as $name=>$value){$criteria=['template'=>$template->get('id'),'name'=>$name];if(!$modx->getObject('modAccessPermission',$criteria)){$row=$modx->newObject('modAccessPermission');$row->fromArray($criteria+['description'=>$name==='cookie_consent_view_logs'?'View/export consent audit logs':'Manage Cookie Consent Manager','value'=>$value]);if(!$row->save())throw new RuntimeException('Permission definition failed');}}
    $modx->log(xPDO::LOG_LEVEL_INFO,'Cookie Consent native files verified. Configure private audit in CMP; templates and consent logs were not changed.');return true;
}catch(Throwable $e){try{$transport->xpdo->log(xPDO::LOG_LEVEL_ERROR,'Cookie Consent verification failed. Partial installation is possible; inspect native logs and restore backup.');}catch(Throwable $ignored){}return false;}
