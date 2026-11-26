<?php
// Test-only structured application tracing. Never copied into a transport/runtime inventory.
if (!function_exists('cc_stage')) {
    function cc_stage(string $event,array $data=[]):void {
        $file=getenv('CC_NATIVE_TRACE');if(!$file)return;
        $classes=[];foreach(['CookieConsentPath','CookieConsentTransportOwnership'] as $name)if(class_exists($name,false))$classes[$name]=(new ReflectionClass($name))->getFileName();
        file_put_contents($file,json_encode(['time'=>microtime(true),'pid'=>getmypid(),'sapi'=>PHP_SAPI,'event'=>$event,'data'=>$data,'class_origins'=>$classes],JSON_UNESCAPED_SLASHES)."\n",FILE_APPEND|LOCK_EX);
    }
    cc_stage('request.begin',['method'=>$_SERVER['REQUEST_METHOD']??'cli','path'=>parse_url($_SERVER['REQUEST_URI']??'',PHP_URL_PATH)]);
    register_shutdown_function(static function(){cc_stage('request.shutdown',['error'=>error_get_last()]);});
}
