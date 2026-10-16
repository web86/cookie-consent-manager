<?php
require_once __DIR__ . '/base.php';
class CookieConsentBundleRebuildProcessor extends CookieConsentManagerProcessor
{
    protected function execute(): array
    {
        require_once dirname(__DIR__) . '/src/CookieConsentBundleManager.php';
        return CookieConsentBundleManager::rebuild($this->modx, true);
    }
}
return 'CookieConsentBundleRebuildProcessor';
