<?php
require_once __DIR__.'/audit_setup.class.php';
class CookieConsentAuditProtectProcessor extends CookieConsentManagerProcessor {
    protected function execute(): array {
        $dir=$this->getProperty('log_dir','');if(!is_string($dir))throw new InvalidArgumentException('log_path');
        $dir=CookieConsentLogDirectory::resolve($dir,CookieConsentAuditConfiguration::webroot(),(string)$this->getProperty('log_dir_mode','absolute'));
        $origin=CookieConsentAuditConfiguration::protectionOrigin($this->modx);
        CookieConsentLogDirectory::prepare($dir,CookieConsentAuditConfiguration::webroot());
        CookieConsentLogDirectory::validate($dir,CookieConsentAuditConfiguration::webroot(),$origin);
        return ['protected'=>true];
    }
}
return 'CookieConsentAuditProtectProcessor';
