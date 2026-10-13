<?php
// Derive the fresh-install default on the target host; preserve existing empty/custom values.
if(($options[xPDOTransport::PACKAGE_ACTION]??0)===xPDOTransport::ACTION_UNINSTALL)return true;
try {
    if($object->get('key')!=='cookie_consent.log_dir')return false;
    if(!$transport->xpdo->getObject('modSystemSetting',['key'=>'cookie_consent.log_dir']))$object->set('value',MODX_CORE_PATH.'cache/logs/');
    return true;
}catch(Throwable $e){return false;}
