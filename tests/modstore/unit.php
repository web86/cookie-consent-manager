<?php
declare(strict_types=1);
// Run the repository's standalone PHP suites in disposable writable storage; source mounts stay read-only.
if(PHP_SAPI!=='cli')exit(1);
$source=dirname(__DIR__,2);$kind=$argv[1]??'';
if($kind==='lint'){
 $files=array_unique(array_values(json_decode(file_get_contents($source.'/_build/transport-files.json'),true)));$count=0;
 foreach($files as $file)if(str_ends_with($file,'.php')){exec(escapeshellarg(PHP_BINARY).' -l '.escapeshellarg($source.'/'.$file).' 2>&1',$output,$status);if($status!==0)throw new RuntimeException(implode("\n",$output));$output=[];$count++;}
 echo json_encode(['result'=>'PASS','files'=>$count,'php'=>PHP_VERSION]);exit;
}
if(!in_array($kind,['adapter-cache','adapter-updates'],true))exit(1);
$root=sys_get_temp_dir().'/cc-modstore-unit-'.bin2hex(random_bytes(6));mkdir($root,0755,true);
foreach(['server','assets','_build'] as $dir)foreach(new RecursiveIteratorIterator(new RecursiveDirectoryIterator($source.'/'.$dir,FilesystemIterator::SKIP_DOTS),RecursiveIteratorIterator::SELF_FIRST) as $file){$to=$root.substr($file->getPathname(),strlen($source));if($file->isDir()){if(!is_dir($to))mkdir($to,0755,true);}else{if(!is_dir(dirname($to)))mkdir(dirname($to),0755,true);copy($file->getPathname(),$to);}}
mkdir($root.'/tests/'.$kind,0755,true);copy($source.'/tests/'.$kind.'/php.php',$root.'/tests/'.$kind.'/php.php');require $root.'/tests/'.$kind.'/php.php';
