<?php
// Exercise only the original xPDO cache manager; do not bootstrap MODX/components.
if(PHP_SAPI!=='cli'||!function_exists('pcntl_fork'))exit(1);
require '/var/www/html/core/xpdo/xpdo.class.php';
$x=new xPDO('mysql:host=127.0.0.1');$cache=$x->getCacheManager();
$root='/opt/cc-private/upstream-cache-'.bin2hex(random_bytes(4));mkdir($root,0700);
$children=[];
for($i=0;$i<12;$i++){
    $pid=pcntl_fork();if($pid<0)throw new RuntimeException('fork');
    if($pid===0){
        $messages=[];set_error_handler(static function($level,$message,$file,$line)use(&$messages){if(str_contains($file,'xpdocachemanager.class.php'))$messages[]=['message'=>$message,'file'=>basename($file),'line'=>$line];return true;});
        while(!is_file($root.'/go'))usleep(1000);
        for($j=0;$j<30;$j++){$cache->writeTree($root.'/round-'.$j.'/a/b/c');clearstatcache();}
        restore_error_handler();file_put_contents($root.'/child-'.$i.'.json',json_encode($messages));exit(0);
    }
    $children[]=$pid;
}
file_put_contents($root.'/go','go');foreach($children as $pid){pcntl_waitpid($pid,$status);if(pcntl_wexitstatus($status)!==0)throw new RuntimeException('Child');}
$messages=[];foreach(glob($root.'/child-*.json') as $file)$messages=array_merge($messages,json_decode(file_get_contents($file),true));
$unexpected=array_values(array_filter($messages,static fn($m)=>$m['message']!=='mkdir(): File exists'));
$component=array_values(array_filter(get_included_files(),static fn($f)=>str_contains($f,'components/cookieconsent')));
$result=['result'=>$messages&&!$unexpected&&!$component?'PASS':'FAIL','component_loaded'=>(bool)$component,'reproduced'=>count($messages),'signatures'=>array_values(array_unique(array_map(static fn($m)=>$m['file'].':'.$m['line'].' '.$m['message'],$messages))),'unexpected'=>$unexpected];
echo json_encode($result)."\n";exit($result['result']==='PASS'?0:1);
