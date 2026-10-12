<?php
if(($options[xPDOTransport::PACKAGE_ACTION]??0)===xPDOTransport::ACTION_UNINSTALL)return true;
try {
    $modx=$object->xpdo;if($modx->getObject('modMenu',['text'=>'Cookie Consent Manager']))return true;$rows=$modx->getCollection('modMenu',['namespace'=>'cookie_consent','action'=>'index']);
    if(count($rows)>1)return false;if(count($rows)===1){$row=reset($rows);$object->set('text',$row->get('text'));}return true;
}catch(Throwable $e){return false;}
