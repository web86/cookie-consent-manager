<?php
if(PHP_SAPI!=='cli'||!is_dir('/opt/cc-source/tests/transport'))exit(1);
$kind=$argv[1]??'';$private=$kind==='clean'?'/opt/cc-clean':'/opt/cc-publiccore';
function writableTree($path){foreach(new RecursiveIteratorIterator(new RecursiveDirectoryIterator($path,FilesystemIterator::SKIP_DOTS),RecursiveIteratorIterator::SELF_FIRST) as $entry){if($entry->isLink())continue;chown($entry->getPathname(),'www-data');}chown($path,'www-data');}
writableTree('/var/www/html');if($kind==='clean')writableTree('/opt/cc-clean/core');
foreach(['logs','package-state','configs'] as $dir){$path=$private.'/'.$dir;if(!is_dir($path))mkdir($path,0700);chown($path,'www-data');chmod($path,0700);}
if(is_dir('/var/www/html/setup')){exec('cp -a /var/www/html/setup '.$private.'/completed-setup && rm -rf /var/www/html/setup',$out,$code);if($code)throw new RuntimeException('Cannot remove public setup');}
// Public-core fixture must allow its shipped per-directory deny rules on Apache.
file_put_contents('/etc/apache2/conf-enabled/cc-core-protection.conf',"<Directory /var/www/html/core>\nAllowOverride All\n</Directory>\n");
echo "Fixture PHP-worker ownership prepared\n";
