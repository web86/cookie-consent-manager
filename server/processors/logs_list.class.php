<?php
require_once __DIR__.'/logs_base.php';
class CookieConsentLogsListProcessor extends CookieConsentLogsProcessor {
    protected function execute(): array {
        @set_time_limit(120);$cursor=$this->getProperty('cursor','');if(!is_string($cursor))throw new InvalidArgumentException('logs_cursor');
        return $this->reader()->query($this->filters(),$cursor);
    }
}
return 'CookieConsentLogsListProcessor';
