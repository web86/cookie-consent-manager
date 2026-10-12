<?php
require_once __DIR__.'/audit_setup.class.php';
class CookieConsentAuditTestProcessor extends CookieConsentManagerProcessor {
    protected function execute(): array {
        $config=CookieConsentAuditConfiguration::forModx($this->modx);$data=CookieConsentSettings::read($this->modx);
        $dir=CookieConsentLogDirectory::validate($data['log_dir'],CookieConsentAuditConfiguration::webroot(),$config['site_origin']);
        $uuid=static function(){ $v=bin2hex(random_bytes(16));return substr($v,0,8).'-'.substr($v,8,4).'-4'.substr($v,13,3).'-a'.substr($v,17,3).'-'.substr($v,20); };
        $event=['event_id'=>$uuid(),'consent_id'=>$uuid(),'event'=>'reject','stage'=>'committed','analytics'=>false,'marketing'=>false,'policy_version'=>$data['options']['policy_version'],'page'=>'/cookie-consent-audit-check','timestamp'=>gmdate('Y-m-d\TH:i:s').'.000Z'];
        $path=(string)$this->modx->getOption('assets_url').'components/cookieconsent/audit.php';
        if(!str_starts_with($path,'/')||str_starts_with($path,'//'))throw new RuntimeException('local_assets_required');
        $response=CookieConsentLogDirectory::request($config['site_origin'],$path,['Content-Type: application/json','Origin: '.$config['site_origin'],'User-Agent: CookieConsent-Manager-AuditCheck'],'POST',json_encode($event,JSON_THROW_ON_ERROR));
        if($response['status']!==200)throw new RuntimeException('audit_post_failed');
        $file=$dir.'/'.gmdate('Y-m').'-cookie-consent.log';$h=@fopen($file,'rb');if(!$h)throw new RuntimeException('audit_record_missing');$found=false;
        try{while(($line=fgets($h))!==false){$record=json_decode($line,true);if(($record['event_id']??null)===$event['event_id']){$found=true;break;}}}finally{fclose($h);}
        if(!$found)throw new RuntimeException('audit_record_missing');return ['written'=>true];
    }
}
return 'CookieConsentAuditTestProcessor';
