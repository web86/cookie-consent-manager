<?php
require_once __DIR__.'/logs_base.php';
class CookieConsentLogsDetailProcessor extends CookieConsentLogsProcessor {
    protected function execute(): array {
        $locator=$this->getProperty('locator','');if(!is_string($locator))throw new InvalidArgumentException('logs_locator');
        return ['record'=>$this->reader()->detail($locator)];
    }
}
return 'CookieConsentLogsDetailProcessor';
