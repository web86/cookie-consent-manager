<?php
if(PHP_SAPI!=='cli'||getenv('CC_MODX3_DISPOSABLE')!=='cookie-consent-modx3-acceptance')exit(1);
$config='/var/www/html/core/config/config.inc.php';
if(!is_file($config))throw new RuntimeException('MODX installation incomplete');
$source=file_get_contents($config);
if(!str_contains($source,"'load_deprecated_global_class_aliases'"))file_put_contents($config,$source."\n\$config_options['load_deprecated_global_class_aliases']=false;\n");
// The fixture owner protects core. The component does not install HTTP rules.
file_put_contents('/var/www/html/core/.htaccess',"Require all denied\n");
foreach(new RecursiveIteratorIterator(new RecursiveDirectoryIterator('/var/www/html',FilesystemIterator::SKIP_DOTS),RecursiveIteratorIterator::SELF_FIRST) as $entry)if(!$entry->isLink())chown($entry->getPathname(),'www-data');
chown('/var/www/html','www-data');
foreach(['logs','logs-new','configs'] as $dir){$path='/opt/cc-private/'.$dir;if(!is_dir($path))mkdir($path,0700);chown($path,'www-data');chmod($path,0700);}
if(is_dir('/var/www/html/setup')&&!is_dir('/opt/cc-private/completed-setup')){
    exec('cp -a /var/www/html/setup /opt/cc-private/completed-setup',$out,$code);if($code)throw new RuntimeException('Archive setup');
    // Only this explicitly marked disposable installation's setup is removed.
    exec('rm -rf /var/www/html/setup',$out,$code);if($code)throw new RuntimeException('Remove setup');
}
define('MODX_API_MODE',true);ob_start();require '/var/www/html/index.php';while(ob_get_level())ob_end_clean();
if($modx->getVersionData()['full_version']!=='3.2.4-pl'||class_exists('modX',false))throw new RuntimeException('Wrong CMS or aliases enabled');
echo json_encode(['modx'=>$modx->getVersionData()['full_version'],'php'=>PHP_VERSION,'xpdo'=>Composer\InstalledVersions::getPrettyVersion('xpdo/xpdo'),'mariadb'=>$modx->query('SELECT VERSION()')->fetchColumn(),'aliases'=>false])."\n";
