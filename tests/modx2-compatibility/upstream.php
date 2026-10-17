<?php
declare(strict_types=1);
// Reproduce the Manager's RSS warning with ONLY original distribution code, no component.
if(PHP_SAPI!=='cli'||!preg_match('/^m284p8[12]final$/D',(string)getenv('CC_MATRIX_CASE')))throw new RuntimeException('Final disposable fixture required');
define('MAGPIE_DIR','/opt/cc-matrix/download/modx-2.8.4-pl/core/model/modx/xmlrss/');
require MAGPIE_DIR.'magpierss.class.php';
$messages=[];set_error_handler(static function($severity,$message)use(&$messages){$messages[]=$message;return true;});
try{$rss=new MagpieRSS('<?xml version="1.0"?><rss version="2.0"><channel><title>Local fixture</title><description>Local controlled RSS</description><link>https://example.invalid/</link></channel></rss>');}finally{restore_error_handler();}
$reference=array_values(array_filter($messages,static fn($m)=>str_contains($m,'MagpieRSS::feed_start_element(): Argument #3 ($attrs) must be passed by reference')));
if(!$reference||class_exists('CookieConsentSettings',false))throw new RuntimeException('Upstream reproduction failed');
echo json_encode(['result'=>'PASS','php'=>PHP_VERSION,'component_loaded'=>false,'reproduced'=>array_values(array_unique($messages))])."\n";
