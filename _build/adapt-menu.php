<?php
if(($options[\xPDO\Transport\xPDOTransport::PACKAGE_ACTION]??0)===\xPDO\Transport\xPDOTransport::ACTION_UNINSTALL)return true;
try {
    $modx=$object->xpdo;if($modx->getObject('MODX\Revolution\modMenu',['text'=>'CookieConsentManager']))return true;$rows=$modx->getCollection('MODX\Revolution\modMenu',['namespace'=>'cookie_consent','action'=>'index']);
    if(count($rows)>1)return false;if(count($rows)===1){$row=reset($rows);$object->set('text',$row->get('text'));}return true;
}catch(Throwable $e){return false;}
