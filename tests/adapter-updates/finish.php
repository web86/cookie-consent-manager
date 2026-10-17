<?php
// Fixture-only: verify native MODX 3 with all deprecated global aliases disabled.
if(PHP_SAPI!=='cli'||!getenv('CC_DB_PASSWORD'))exit(1);
$case=$argv[1]??'';if(!preg_match('/^[a-z0-9-]+$/D',$case))exit(1);
$path='/opt/cc-updates/cases/'.$case.'/private/core/config/config.inc.php';
if(!is_file($path))throw new RuntimeException('New fixture installation incomplete');
$source=file_get_contents($path);
if(!str_contains($source,"'load_deprecated_global_class_aliases'"))file_put_contents($path,$source."\n\$config_options['load_deprecated_global_class_aliases']=false;\n");
