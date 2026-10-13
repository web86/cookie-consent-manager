<?php
require_once __DIR__.'/index.class.php';
/** Direct read-only route for roles without the existing manage-only menu permission. */
class Cookie_consentLogsManagerController extends Cookie_consentIndexManagerController {
    public function checkPermissions(){return $this->modx->hasPermission('cookie_consent_view_logs');}
}
return 'Cookie_consentLogsManagerController';
