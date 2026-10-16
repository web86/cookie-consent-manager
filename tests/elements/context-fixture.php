<?php
// Local acceptance entrypoint only; not shipped in the transport package.
if(!getenv('CC_DB_PASSWORD')||!in_array($_GET['ctx']??'', ['cc-en','cc-ru'],true)||!str_starts_with($_SERVER['HTTP_HOST']??'','127.0.0.1:8890')){http_response_code(404);exit;}
require __DIR__.'/config.core.php';require MODX_CORE_PATH.'model/modx/modx.class.php';$modx=new modX();$modx->initialize($_GET['ctx']);$modx->handleRequest();
