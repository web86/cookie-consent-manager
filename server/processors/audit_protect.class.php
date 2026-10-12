<?php
require_once __DIR__.'/audit_setup.class.php';
class CookieConsentAuditProtectProcessor extends CookieConsentManagerProcessor {
    protected function execute(): array {
        $dir=$this->getProperty('log_dir','');if(!is_string($dir))throw new InvalidArgumentException('log_path');
        $config=CookieConsentAuditConfiguration::forModx($this->modx);
        CookieConsentLogDirectory::prepare($dir,CookieConsentAuditConfiguration::webroot());
        CookieConsentLogDirectory::validate($dir,CookieConsentAuditConfiguration::webroot(),$config['site_origin']);
        return ['protected'=>true];
    }
}
return 'CookieConsentAuditProtectProcessor';
