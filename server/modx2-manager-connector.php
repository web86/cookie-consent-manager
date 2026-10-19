<?php
// Install /assets/components/cookieconsentmanager/connector.php, never disable MODX_REQP.
require_once __DIR__.'/bootstrap.php';
require_once MODX_CORE_PATH.'config/'.MODX_CONFIG_KEY.'.inc.php';
require_once MODX_CONNECTORS_PATH.'index.php';
header('Cache-Control: no-store');
if ($modx->context->get('key')!=='mgr') {http_response_code(403);echo '{"success":false}';exit;}
$modx->request->handleRequest(['processors_path'=>MODX_CORE_PATH.'components/cookieconsentmanager/processors/','location'=>'']);
