<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'||!is_dir('/opt/cc-updates/cases'))exit(1);
$name=$argv[1]??'';if(!preg_match('/^[a-z0-9-]+$/D',$name))exit(1);
$case='/opt/cc-updates/cases/'.$name.'/';$site=$case.'site/';$core=$case.'private/core/';
if(is_file($core.'config/config.inc.php'))throw new RuntimeException('Existing site preserved');
if(!rename($site.'core',rtrim($core,'/')))throw new RuntimeException('Move new fixture core');
file_put_contents($site.'setup/includes/config.core.php',"<?php if(!defined('MODX_CORE_PATH'))define('MODX_CORE_PATH',".var_export($core,true).");if(!defined('MODX_CONFIG_KEY'))define('MODX_CONFIG_KEY','config');define('MODX_SETUP_KEY','@traditional@');");
$db='cc_adapter_'.str_replace('-','_',$name);$pdo=new PDO('mysql:host=db','root',getenv('CC_DB_PASSWORD'));$pdo->exec('CREATE DATABASE `'.$db.'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
$xml=new SimpleXMLElement(file_get_contents($site.'setup/config.dist.new.xml'));
foreach(['database_server'=>'db','database'=>$db,'database_user'=>'root','database_password'=>getenv('CC_DB_PASSWORD'),'database_connection_charset'=>'utf8mb4','database_charset'=>'utf8mb4','database_collation'=>'utf8mb4_unicode_ci','http_host'=>'127.0.0.1:22888','inplace'=>'1','unpacked'=>'0','cmsadmin'=>'acceptance','cmspassword'=>bin2hex(random_bytes(24)),'cmsadminemail'=>'acceptance@example.invalid','core_path'=>$core,'context_mgr_path'=>$site.'manager/','context_mgr_url'=>'/manager/','context_connectors_path'=>$site.'connectors/','context_connectors_url'=>'/connectors/','context_web_path'=>$site,'context_web_url'=>'/','remove_setup_directory'=>'0'] as $key=>$value)$xml->$key=$value;
$xml->asXML($case.'private/setup.xml');file_put_contents($case.'private/manager.json',json_encode(['username'=>'acceptance','password'=>(string)$xml->cmspassword]));chmod($case.'private/manager.json',0600);
echo "New isolated fixture configured\n";
