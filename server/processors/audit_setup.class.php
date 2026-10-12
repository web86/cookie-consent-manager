<?php
require_once __DIR__.'/base.php';
require_once dirname(__DIR__).'/src/CookieConsentAuditConfiguration.php';
require_once dirname(__DIR__).'/src/CookieConsentLogDirectory.php';
class CookieConsentAuditSetupProcessor extends CookieConsentManagerProcessor {
    protected function execute(): array {
        CookieConsentAuditConfiguration::setup($this->modx);
        return ['auditStatus'=>CookieConsentAuditConfiguration::status($this->modx)];
    }
}
return 'CookieConsentAuditSetupProcessor';
