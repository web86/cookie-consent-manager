<?php
// Test-only internal HTTP listener: ordinary product HTTP code still uses its configured origin.
$prefix=getenv('CC_MODSTORE_CUSTOM')==='1'?'/files/':'/assets/';
$path=$prefix.'components/cookieconsentmanager'.(getenv('CC_MODSTORE_MODX')[0]==='3'?'3':'').'/audit.php';
if(parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH)!==$path){http_response_code(404);exit;}
$assets=getenv('CC_MODSTORE_CUSTOM')==='1'?'/opt/cc-case/relocated-assets/':'/var/www/html/assets/';
require $assets.substr($path,strlen($prefix));
