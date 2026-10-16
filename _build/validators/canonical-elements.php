<?php
// Native object-vehicle validator: replace source, retain identity and user metadata.
if(($options[xPDOTransport::PACKAGE_ACTION]??0)===xPDOTransport::ACTION_UNINSTALL)return true;
try {
    $name=$object->get('name');$class=$object instanceof modChunk?'modChunk':'modSnippet';$field='snippet';
    if(!in_array($name,['CookiesPopup','CookieConsent','CookieConsentMap','CookieConsentVideo','CookieConsentAssets','CookieConsentBanner'],true))return false;
    $existing=$transport->xpdo->getObject($class,['name'=>$name]);
    if($existing){$source=$object->get($field);$object->fromArray($existing->toArray('',true),'',true,true);$object->set($field,$source);$object->set('static',false);}
    else{
        $category=$transport->xpdo->getObject('modCategory',['category'=>'CookieConsent']);
        if(!$category||$category->get('category')!=='CookieConsent')return false;
        $object->set('category',$category->get('id'));
    }
    return true;
}catch(Throwable $e){$transport->xpdo->log(xPDO::LOG_LEVEL_ERROR,'Canonical source update refused. Restore DB/element backup if needed.');return false;}
