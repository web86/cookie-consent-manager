<?php
// Native object-vehicle validator: replace source, retain identity and user metadata.
if(($options[\xPDO\Transport\xPDOTransport::PACKAGE_ACTION]??0)===\xPDO\Transport\xPDOTransport::ACTION_UNINSTALL)return true;
try {
    $name=$object->get('name');$class=$object instanceof \MODX\Revolution\modChunk?'MODX\Revolution\modChunk':'MODX\Revolution\modSnippet';$field='snippet';
    if(!in_array($name,['CookiesPopup','CookieConsent','CookieConsentMap','CookieConsentVideo','CookieConsentAssets','CookieConsentBanner'],true))return false;
    if(($name==='CookiesPopup'&&!($object instanceof \MODX\Revolution\modChunk))||($name!=='CookiesPopup'&&!($object instanceof \MODX\Revolution\modSnippet)))return false;
    $existing=$transport->xpdo->getObject($class,['name'=>$name]);
    if($existing){$source=$object->get($field);$object->fromArray($existing->toArray('',true),'',true,true);$object->set($field,$source);$object->set('static',false);}
    else{
        $category=$transport->xpdo->getObject('MODX\Revolution\modCategory',['category'=>'CookieConsentManager']);
        if(!$category||$category->get('category')!=='CookieConsentManager')return false;
        $object->set('category',$category->get('id'));
    }
    return true;
}catch(Throwable $e){$transport->xpdo->log(\xPDO\xPDO::LOG_LEVEL_ERROR,'Canonical source update refused. Restore DB/element backup if needed.');return false;}
