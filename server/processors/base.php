<?php
require_once dirname(__DIR__).'/src/CookieConsentSettings.php';
require_once dirname(__DIR__).'/src/CookieConsentAuditCheckException.php';
abstract class CookieConsentManagerProcessor extends modProcessor
{
    public function checkPermissions(){return $this->modx->user->isAuthenticated('mgr') && $this->modx->hasPermission('cookie_consent_manage');}
    public function draft(): array {
        $raw=$this->getProperty('draft','');
        if (!is_string($raw) || strlen($raw)>393216) throw new InvalidArgumentException('Draft size');
        $value=json_decode($raw,true,32,JSON_THROW_ON_ERROR);if(!is_array($value))throw new InvalidArgumentException('Draft object');return $value;
    }
    public function process(){
        $requestId=bin2hex(random_bytes(8));
        try {
            if (($_SERVER['REQUEST_METHOD']??'')!=='POST') throw new InvalidArgumentException('POST required');
            return $this->success('', $this->execute());
        } catch(Throwable $e) {
            $code=$e instanceof DomainException?'conflict':($e instanceof InvalidArgumentException||$e instanceof JsonException?'validation':'unavailable');
            // Log only a bounded diagnostic, never draft/configuration/secret values.
            $reason=preg_match('/^[a-z_]{1,40}$/D',$e->getMessage())?$e->getMessage():$code;
            $this->modx->log(modX::LOG_LEVEL_ERROR,'[CookieConsentManager] request='.$requestId.' processor='.get_class($this).' exception='.get_class($e).' reason='.$reason);
            $diagnostic=['code'=>$code,'request_id'=>$requestId,'reason'=>$reason];
            if($e instanceof CookieConsentAuditCheckException){$diagnostic['receiver_status']=$e->receiverStatus;if($e->receiverCode!=='')$diagnostic['receiver_code']=$e->receiverCode;}
            return $this->failure($code,$diagnostic);
        }
    }
    abstract protected function execute(): array;
}
