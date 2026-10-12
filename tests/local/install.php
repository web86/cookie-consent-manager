<?php
// Disposable local fixture only. Never invoke against an existing customer's site.
if (PHP_SAPI!=='cli' || !is_dir('/opt/cc-source/tests/local')) exit(1);
$root='/var/www/html/';
$secret=getenv('CC_DB_PASSWORD');
if (!$secret) throw new RuntimeException('Missing fixture password');
// The entire MODX core, source, configuration and audit logs stay outside webroot.
if (!is_dir('/opt/cc-private/core')) {
    // Bind mounts are separate devices inside Docker, so rename cannot move them.
    exec('cp -a /var/www/html/core /opt/cc-private/core', $output, $status);
    if ($status!==0) throw new RuntimeException('Cannot move fixture core');
    exec('rm -rf /var/www/html/core', $output, $status);
    if ($status!==0) throw new RuntimeException('Cannot remove public fixture core');
}
file_put_contents($root.'setup/includes/config.core.php',"<?php if (!defined('MODX_CORE_PATH')) define('MODX_CORE_PATH','/opt/cc-private/core/'); if (!defined('MODX_CONFIG_KEY')) define('MODX_CONFIG_KEY','config'); define('MODX_SETUP_KEY','@traditional@');\n");
$xml=new SimpleXMLElement(file_get_contents($root.'setup/config.dist.new.xml'));
foreach ([
    'database_server'=>'db','database'=>'cookie_consent_test','database_user'=>'root','database_password'=>$secret,
    'database_connection_charset'=>'utf8mb4','database_charset'=>'utf8mb4','database_collation'=>'utf8mb4_unicode_ci',
    'http_host'=>'127.0.0.1:8888','inplace'=>'1','unpacked'=>'0','cmsadmin'=>'acceptance',
    'cmspassword'=>bin2hex(random_bytes(24)),'cmsadminemail'=>'acceptance@example.invalid',
    'core_path'=>'/opt/cc-private/core/','context_mgr_path'=>$root.'manager/','context_mgr_url'=>'/manager/',
    'context_connectors_path'=>$root.'connectors/','context_connectors_url'=>'/connectors/',
    'context_web_path'=>$root,'context_web_url'=>'/','remove_setup_directory'=>'0',
] as $key=>$value) $xml->$key=$value;
$xml->asXML('/opt/cc-private/setup.xml');
file_put_contents('/opt/cc-private/manager.json',json_encode(['username'=>'acceptance','password'=>(string)$xml->cmspassword]));
echo "Local install config created; credentials remain outside repository/webroot.\n";
