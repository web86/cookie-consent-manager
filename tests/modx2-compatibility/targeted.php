<?php
declare(strict_types=1);
// Separate PHP process: each original xPDO tree is loaded without altering any CMS.
$case=getenv('CC_MATRIX_CASE');$version=$argv[1]??'';
if(PHP_SAPI!=='cli'||!preg_match('/^m284p8[12]$/D',(string)$case)||trim(file_get_contents('/opt/cc-private/disposable-marker'))!==$case||!in_array($version,['2.8.4','2.8.5','2.8.6','2.8.7','2.8.8'],true))throw new RuntimeException('Disposable fixture required');
$source='/opt/cc-matrix/download/modx-'.$version.'-pl/core/';
require $source.'xpdo/xpdo.class.php';
$xpdo=new xPDO('mysql:host=db;dbname=cc2_compat_'.$case.';charset=utf8mb4','root',getenv('CC_MATRIX_PASSWORD'));
if($xpdo->query('SELECT DATABASE()')->fetchColumn()!=='cc2_compat_'.$case)throw new RuntimeException('Foreign DB');
$xpdo->addPackage('modx',$source.'model/','modx_');
$rows=$xpdo->getCollection('modSystemSetting',['key:IN'=>['site_name','manager_language']]);
if(count($rows)!==2)throw new RuntimeException('Uppercase IN criteria');
$tmp='/opt/cc-private/targeted-'.$version.'-'.bin2hex(random_bytes(5));mkdir($tmp,0700);mkdir($tmp.'/nested');file_put_contents($tmp.'/nested/probe.cache.php','fixture');
$manager=$xpdo->getCacheManager();
if(!$manager->deleteTree($tmp,['deleteTop'=>true,'extensions'=>['.cache.php']])||file_exists($tmp))throw new RuntimeException('Nested deleteTree');
echo json_encode(['result'=>'PASS','modx_source'=>$version.'-pl','php'=>PHP_VERSION,'assertions'=>3,'original_xpdo'=>true])."\n";
