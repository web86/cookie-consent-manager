<?php
if(PHP_SAPI!=='cli')exit(1);
$roots=['/opt/cc-source/server','/opt/cc-source/_build','/opt/cc-source/tests/public-install'];$files=[];$errors=[];
foreach($roots as $root)foreach(new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root,FilesystemIterator::SKIP_DOTS)) as $f)if($f->isFile()&&$f->getExtension()==='php')$files[]=$f->getPathname();
foreach($files as $file){$pipes=[];$p=proc_open([PHP_BINARY,'-l',$file],[1=>['pipe','w'],2=>['pipe','w']],$pipes);$out=stream_get_contents($pipes[1]);$err=stream_get_contents($pipes[2]);fclose($pipes[1]);fclose($pipes[2]);if(proc_close($p)!==0)$errors[]=['path'=>$file,'error'=>$out.$err];}
echo json_encode(['result'=>$errors?'FAIL':'PASS','php'=>PHP_VERSION,'files'=>count($files),'errors'=>$errors])."\n";exit($errors?1:0);
