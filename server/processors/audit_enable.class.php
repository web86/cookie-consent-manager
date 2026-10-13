<?php
require_once __DIR__.'/audit_test.class.php';
class CookieConsentAuditEnableProcessor extends CookieConsentAuditTestProcessor {
    protected function execute(): array {
        $previous=CookieConsentSettings::read($this->modx);
        $revision=(string)$this->getProperty('revision','');
        if(!hash_equals($previous['revision'],$revision))throw new DomainException('conflict');
        $dir=$this->getProperty('log_dir','');if(!is_string($dir)||$dir==='')throw new InvalidArgumentException('log_path');
        $dir=CookieConsentLogDirectory::resolve($dir,CookieConsentAuditConfiguration::webroot(),(string)$this->getProperty('log_dir_mode','absolute'));
        $origin=$this->getProperty('site_origin',null);
        if($origin!==null){if(!is_string($origin))throw new InvalidArgumentException('audit_origin_request_mismatch');$origin=CookieConsentAuditConfiguration::managerOrigin($origin);}
        CookieConsentAuditConfiguration::setup($this->modx,60,$origin);
        $draft=$previous;unset($draft['revision']);$draft['log_dir']=$dir;
        $saved=CookieConsentSettings::save($this->modx,$draft,$revision);
        try {$check=parent::execute();}
        catch(Throwable $e){
            // Revert only our directory selection, guarded against concurrent edits.
            // Keep any real test record and initialized key; this is not DB/FS atomic rollback.
            try {CookieConsentSettings::restoreLogDirectory($this->modx,$previous['log_dir'],$saved['revision']);}
            catch(Throwable $ignored){throw new RuntimeException('audit_post_failed_restore_conflict',0,$e);}
            throw $e;
        }
        return $saved+$check+['auditStatus'=>CookieConsentAuditConfiguration::status($this->modx)];
    }
}
return 'CookieConsentAuditEnableProcessor';
