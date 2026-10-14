<?php
if(PHP_SAPI!=='cli'||!is_dir('/opt/cc-source/tests/transport'))exit(1);
$kind=$argv[1]??'';if(!in_array($kind,['clean','publiccore'],true))exit(1);
$private=$kind==='clean'?'/opt/cc-clean':'/opt/cc-publiccore';$core=$kind==='clean'?$private.'/core/':'/var/www/html/core/';$port=$kind==='clean'?18889:18890;
if(is_file($core.'config/config.inc.php')&&filesize($core.'config/config.inc.php')>100){echo "Existing disposable MODX preserved\n";exit;}
if($kind==='clean'&&!is_dir($core)){exec('cp -a /var/www/html/core /opt/cc-clean/core && rm -rf /var/www/html/core',$output,$status);if($status)throw new RuntimeException('Fixture core copy');}
file_put_contents('/var/www/html/setup/includes/config.core.php',"<?php if(!defined('MODX_CORE_PATH'))define('MODX_CORE_PATH',".var_export($core,true).");if(!defined('MODX_CONFIG_KEY'))define('MODX_CONFIG_KEY','config');define('MODX_SETUP_KEY','@traditional@');");
$pdo=new PDO('mysql:host=db','root',getenv('CC_DB_PASSWORD'));$pdo->exec('CREATE DATABASE IF NOT EXISTS cookie_consent_modx3_transport_'.$kind.' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
$xml=new SimpleXMLElement(file_get_contents('/var/www/html/setup/config.dist.new.xml'));$password=bin2hex(random_bytes(24));
foreach(['database_server'=>'db','database'=>'cookie_consent_modx3_transport_'.$kind,'database_user'=>'root','database_password'=>getenv('CC_DB_PASSWORD'),'database_connection_charset'=>'utf8mb4','database_charset'=>'utf8mb4','database_collation'=>'utf8mb4_unicode_ci','http_host'=>'127.0.0.1:'.$port,'inplace'=>'1','unpacked'=>'0','cmsadmin'=>'package-acceptance','cmspassword'=>$password,'cmsadminemail'=>'package-acceptance@example.invalid','core_path'=>$core,'context_mgr_path'=>'/var/www/html/manager/','context_mgr_url'=>'/manager/','context_connectors_path'=>'/var/www/html/connectors/','context_connectors_url'=>'/connectors/','context_web_path'=>'/var/www/html/','context_web_url'=>'/','remove_setup_directory'=>'0'] as $key=>$value)$xml->$key=$value;
$xml->asXML($private.'/setup.xml');file_put_contents($private.'/manager.json',json_encode(['username'=>'package-acceptance','password'=>$password]));chmod($private.'/manager.json',0600);
echo "Disposable MODX setup prepared\n";
