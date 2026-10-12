<?php
// Install /assets/components/cookieconsent/connector.php, never disable MODX_REQP.
require_once dirname(__DIR__,3).'/config.core.php';
require_once MODX_CORE_PATH.'config/'.MODX_CONFIG_KEY.'.inc.php';
require_once MODX_CONNECTORS_PATH.'index.php';
header('Cache-Control: no-store');
if ($modx->context->get('key')!=='mgr') {http_response_code(403);echo '{"success":false}';exit;}
$modx->request->handleRequest(['processors_path'=>MODX_CORE_PATH.'components/cookieconsent/processors/','location'=>'']);
