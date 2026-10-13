<?php
require_once __DIR__.'/base.php';
require_once __DIR__.'/../src/CookieConsentAuditDirectoryCheck.php';
/** Legacy local I/O check, not an HTTP/event acceptance assertion. No Manager button. */
class CookieConsentAuditTestProcessor extends CookieConsentManagerProcessor {
    protected function execute(): array {
        $data=CookieConsentSettings::read($this->modx);
        CookieConsentAuditDirectoryCheck::check($data['log_dir'],CookieConsentAuditConfiguration::webroot());
        return ['local_checked'=>true];
    }
}
return 'CookieConsentAuditTestProcessor';
