<?php
// Local fixture only. Both listeners execute installed PHP; no MODX API stubs.
$work=str_replace('\\','/',getenv('CC_NATIVE_WORK'));$site=$work.'/public_html';
$path=rawurldecode(parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH));
if(str_contains($path,'..')||str_contains($path,'\\')||str_contains($path,"\0")){http_response_code(400);exit;}
$_SERVER['DOCUMENT_ROOT']=$site;
if(str_starts_with($path,'/files/')){
 $target=$work.'/external-assets/'.substr($path,7);
 if(!is_file($target)){http_response_code(404);exit;}
 if(str_ends_with($target,'.php')){$_SERVER['SCRIPT_FILENAME']=$target;$_SERVER['SCRIPT_NAME']=$path;$_SERVER['PHP_SELF']=$path;require $target;exit;}
 $ext=pathinfo($target,PATHINFO_EXTENSION);header('Content-Type: '.(['js'=>'application/javascript','css'=>'text/css','svg'=>'image/svg+xml','png'=>'image/png','gif'=>'image/gif','jpg'=>'image/jpeg','woff'=>'font/woff','woff2'=>'font/woff2'][$ext]??'application/octet-stream'));readfile($target);exit;
}
return false;
