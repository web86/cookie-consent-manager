<?php
require_once dirname(__DIR__).'/src/CookieConsentSettings.php';
abstract class CookieConsentManagerProcessor extends modProcessor
{
    public function checkPermissions(){return $this->modx->user->isAuthenticated('mgr') && $this->modx->hasPermission('cookie_consent_manage');}
    public function draft(): array {
        $raw=$this->getProperty('draft','');
        if (!is_string($raw) || strlen($raw)>393216) throw new InvalidArgumentException('Draft size');
        $value=json_decode($raw,true,32,JSON_THROW_ON_ERROR);if(!is_array($value))throw new InvalidArgumentException('Draft object');return $value;
    }
    public function process(){
        try {return $this->success('', $this->execute());}
        catch(DomainException $e){return $this->failure('conflict');}
        catch(InvalidArgumentException|JsonException $e){return $this->failure($e->getMessage());}
        catch(Throwable $e){$this->modx->log(modX::LOG_LEVEL_ERROR,'[CookieConsentManager] '.get_class($e));return $this->failure('Settings unavailable');}
    }
    abstract protected function execute(): array;
}
