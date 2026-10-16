<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli' || getenv('CC_MODX3_DISPOSABLE') !== 'cookie-consent-modx3-acceptance' || trim(file_get_contents('/opt/cc-private/disposable-marker')) !== 'cookie-consent-modx3-acceptance') exit(1);
$root='/var/www/html/';$core=$root.'core/';
$database=getenv('CC_DB_NAME')?:'cookie_consent_modx3_test';$port=getenv('CC_HTTP_PORT')?:'20888';
if(!in_array($database,['cookie_consent_modx3_test','cookie_consent_modx3_clean','cookie_consent_modx3_fresh','cookie_consent_modx3_pristine','cookie_consent_modx3_finalclean','cookie_consent_modx3_finalfresh','cookie_consent_modx3_finalpristine'],true))throw new RuntimeException('Disposable DB required');
if(is_file($core.'config/config.inc.php')&&filesize($core.'config/config.inc.php')>100){echo "Existing MODX 3 fixture preserved\n";exit;}
$pdo=new PDO('mysql:host=db','root',getenv('CC_DB_PASSWORD'));$pdo->exec('CREATE DATABASE IF NOT EXISTS `'.$database.'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
$xml=new SimpleXMLElement(file_get_contents($root.'setup/config.dist.new.xml'));
foreach(['database_server'=>'db','database'=>$database,'database_user'=>'root','database_password'=>getenv('CC_DB_PASSWORD'),'database_connection_charset'=>'utf8mb4','database_charset'=>'utf8mb4','database_collation'=>'utf8mb4_unicode_ci','http_host'=>'127.0.0.1:'.$port,'inplace'=>'1','unpacked'=>'0','cmsadmin'=>'acceptance','cmspassword'=>bin2hex(random_bytes(24)),'cmsadminemail'=>'acceptance@example.invalid','core_path'=>$core,'context_mgr_path'=>$root.'manager/','context_mgr_url'=>'/manager/','context_connectors_path'=>$root.'connectors/','context_connectors_url'=>'/connectors/','context_web_path'=>$root,'context_web_url'=>'/','remove_setup_directory'=>'0'] as $key=>$value)$xml->$key=$value;
$xml->asXML('/opt/cc-private/setup.xml');chmod('/opt/cc-private/setup.xml',0600);
file_put_contents('/opt/cc-private/manager.json',json_encode(['username'=>'acceptance','password'=>(string)$xml->cmspassword]));chmod('/opt/cc-private/manager.json',0600);
echo "Disposable MODX 3 setup prepared\n";
