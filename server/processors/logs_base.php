<?php
require_once __DIR__.'/base.php';
require_once __DIR__.'/../src/CookieConsentAuditReader.php';
abstract class CookieConsentLogsProcessor extends CookieConsentManagerProcessor {
    public function checkPermissions(){return $this->modx->user->isAuthenticated('mgr')&&$this->modx->hasPermission('cookie_consent_view_logs');}
    protected function reader(): CookieConsentAuditReader {
        $setting=$this->modx->getObject('modSystemSetting',['key'=>'cookie_consent.log_dir']);
        return new CookieConsentAuditReader($setting?(string)$setting->get('value'):'');
    }
    protected function filters(): array {
        $data=[];foreach(['year','month','event','search'] as $key){$value=$this->getProperty($key,null);if($value!==null)$data[$key]=$value;}
        return CookieConsentAuditReader::filters($data);
    }
}
