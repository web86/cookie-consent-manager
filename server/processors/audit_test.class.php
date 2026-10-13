<?php
require_once __DIR__.'/audit_setup.class.php';
require_once __DIR__.'/../src/CookieConsentAuditHttp.php';
require_once __DIR__.'/../src/CookieConsentAuditFormat.php';
class CookieConsentAuditTestProcessor extends CookieConsentManagerProcessor {
    protected function execute(): array {
        $config=CookieConsentAuditConfiguration::forModx($this->modx);$data=CookieConsentSettings::read($this->modx);
        $dir=CookieConsentLogDirectory::validate($data['log_dir'],CookieConsentAuditConfiguration::webroot());
        $uuid=static function(){ $v=bin2hex(random_bytes(16));return substr($v,0,8).'-'.substr($v,8,4).'-4'.substr($v,13,3).'-a'.substr($v,17,3).'-'.substr($v,20); };
        // Use today's registry and schema 2, without granting any permission.
        $providers=[];foreach($data['registry']['services'] as $s)if($s['enabled'])$providers[$s['key']]=false;
        $event=['schema'=>2,'event_id'=>$uuid(),'consent_id'=>$uuid(),'event'=>'reject','stage'=>'committed','analytics'=>false,'marketing'=>false,'external_content'=>false,'providers'=>$providers?:new stdClass(),'provider'=>null,'policy_version'=>$data['options']['policy_version'],'page'=>'/cookie-consent-audit-check','timestamp'=>gmdate('Y-m-d\TH:i:s').'.000Z'];
        $path=(string)$this->modx->getOption('assets_url').'components/cookieconsent/audit.php';
        if(!str_starts_with($path,'/')||str_starts_with($path,'//'))throw new RuntimeException('local_assets_required');
        $response=CookieConsentAuditHttp::post($config['site_origin'],$path,json_encode($event,JSON_THROW_ON_ERROR));
        $ack=CookieConsentAuditHttp::acknowledgement($response,$event['event_id']);
        // Receiver time selects the month even if the request crosses a UTC month boundary.
        if(abs(time()-strtotime($ack['server_time']))>120)throw new CookieConsentAuditCheckException('audit_response_malformed',200);
        $file=$dir.'/'.substr($ack['server_time'],0,7).'-cookie-consent.log';CookieConsentPrivatePath::file($file);
        $h=@fopen($file,'rb');if(!$h)throw new CookieConsentAuditCheckException('audit_record_missing',200);$found=false;
        try{
            $stat=fstat($h);clearstatcache(true,$file);$pathStat=lstat($file);
            if(!$stat||!$pathStat||$stat['ino']!==$pathStat['ino']||$stat['dev']!==$pathStat['dev']||$stat['nlink']!==1||($stat['mode']&0170000)!==0100000)throw new CookieConsentAuditCheckException('audit_record_invalid',200);
            if(!flock($h,LOCK_SH))throw new CookieConsentAuditCheckException('audit_record_missing',200);
            foreach(CookieConsentAuditFormat::lines($h,fstat($h)['size']) as $line){
                if(isset($line['error']))throw new CookieConsentAuditCheckException('audit_log_corrupt',200);
                $record=$line['data'];if(($record['event_id']??null)!==$event['event_id'])continue;
                $expected=['schema'=>2,'server_time'=>$ack['server_time'],'event_id'=>$event['event_id'],'consent_id'=>$event['consent_id'],'event'=>'reject','stage'=>'committed','categories'=>['necessary'=>true,'analytics'=>false,'marketing'=>false,'external_content'=>false],'providers'=>$providers,'provider'=>null,'policy_version'=>$event['policy_version'],'page'=>$event['page'],'client_time'=>$event['timestamp']];
                foreach($expected as $key=>$value)if(!array_key_exists($key,$record)||$record[$key]!==$value)throw new CookieConsentAuditCheckException('audit_record_invalid',200);
                if(!is_string($record['ip']??null)||!filter_var($record['ip'],FILTER_VALIDATE_IP)||($record['user_agent']??null)!=='CookieConsent-Manager-AuditCheck')throw new CookieConsentAuditCheckException('audit_record_invalid',200);
                $found=true;break;
            }
        }finally{flock($h,LOCK_UN);fclose($h);}
        if(!$found)throw new CookieConsentAuditCheckException('audit_record_missing',200);
        return ['written'=>true,'event_id'=>$event['event_id'],'receiver_status'=>200];
    }
}
return 'CookieConsentAuditTestProcessor';
