<?php
if (PHP_SAPI!=='cli' || !is_dir('/opt/cc-source/tests/local')) exit(1);
function copyTree(string $from,string $to): void {
    if (!is_dir($to)) mkdir($to,0755,true);
    foreach (new DirectoryIterator($from) as $entry) {
        if ($entry->isDot()) continue;
        if ($entry->isDir()) copyTree($entry->getPathname(),$to.'/'.$entry->getFilename());
        else copy($entry->getPathname(),$to.'/'.$entry->getFilename());
    }
}
copyTree('/opt/cc-source/assets','/var/www/html/assets');
copyTree('/opt/cc-source/server/src','/opt/cc-private/core/components/cookieconsent/src');
copyTree('/opt/cc-source/server/public','/opt/cc-private/core/components/cookieconsent/public');
if (!is_dir('/var/www/html/assets/components/cookieconsent')) mkdir('/var/www/html/assets/components/cookieconsent',0755,true);
copy('/opt/cc-source/server/modx2-public-endpoint.example.php','/var/www/html/assets/components/cookieconsent/audit.php');
foreach (['logs','logs-new'] as $dir) {
    if (!is_dir('/opt/cc-private/'.$dir)) mkdir('/opt/cc-private/'.$dir,0700);
    chown('/opt/cc-private/'.$dir,'www-data');chmod('/opt/cc-private/'.$dir,0700);
}
echo "Fixture source synced\n";
