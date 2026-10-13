<?php
require_once __DIR__.'/base.php';
class CookieConsentSaveProcessor extends CookieConsentManagerProcessor
{
    protected function execute(): array {
        if (($_SERVER['REQUEST_METHOD']??'')!=='POST') throw new InvalidArgumentException('POST required');
        $revision=$this->getProperty('revision','');if(!is_string($revision)||!preg_match('/^[a-f0-9]{64}$/D',$revision))throw new InvalidArgumentException('Revision');
        require_once dirname(__DIR__).'/src/CookieConsentAuditConfiguration.php';
        $origin=$this->getProperty('site_origin',null);if($origin!==null){if(!is_string($origin))throw new InvalidArgumentException('audit_origin_request_mismatch');}
        return CookieConsentSettings::save($this->modx,$this->draft(),$revision,$origin)+['auditStatus'=>CookieConsentAuditConfiguration::status($this->modx)];
    }
}
return 'CookieConsentSaveProcessor';
