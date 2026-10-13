<?php
require_once __DIR__.'/base.php';
require_once __DIR__.'/../src/CookieConsentAuditConfiguration.php';
/** Compatibility API only. The Manager uses its single Save button. No HTTP request. */
class CookieConsentAuditEnableProcessor extends CookieConsentManagerProcessor {
    protected function execute(): array {
        $draft=CookieConsentSettings::read($this->modx);unset($draft['revision']);
        $draft['log_dir']=$this->getProperty('log_dir','');$draft['log_dir_mode']=$this->getProperty('log_dir_mode','absolute');
        $origin=$this->getProperty('site_origin',null);if($origin!==null){if(!is_string($origin))throw new InvalidArgumentException('audit_origin_request_mismatch');}
        return CookieConsentSettings::save($this->modx,$draft,(string)$this->getProperty('revision',''),$origin)+['auditStatus'=>CookieConsentAuditConfiguration::status($this->modx)];
    }
}
return 'CookieConsentAuditEnableProcessor';
