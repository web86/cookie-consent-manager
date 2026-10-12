<?php
require_once __DIR__.'/base.php';
class CookieConsentReconsentProcessor extends CookieConsentManagerProcessor {
    protected function execute(): array {
        $data=CookieConsentSettings::read($this->modx);unset($data['revision']);
        $data['options']['policy_version']='p-'.bin2hex(random_bytes(8));
        return CookieConsentSettings::save($this->modx,$data,(string)$this->getProperty('revision',''));
    }
}
return 'CookieConsentReconsentProcessor';
