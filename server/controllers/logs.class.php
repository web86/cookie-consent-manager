<?php
require_once __DIR__.'/index.class.php';
/** Direct read-only route for roles without the existing manage-only menu permission. */
class CookieconsentLogsManagerController extends CookieconsentIndexManagerController {
    public function checkPermissions(){return $this->modx->hasPermission('cookie_consent_view_logs');}
}
return 'CookieconsentLogsManagerController';
