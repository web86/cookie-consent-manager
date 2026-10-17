<?php
declare(strict_types=1);
// Only the repository's existing release-test fixture; no general site path input.
$case=$argv[1]??'';$op=$argv[2]??'';
if(PHP_SAPI!=='cli'||$case!=='ui-refinement-banner2-pl1-a'||!getenv('CC_DB_PASSWORD'))throw new RuntimeException('Known disposable fixture required');
$base='/opt/cc-updates/cases/'.$case.'/';
$destination=(static function($file){require $file;return [$database_server??null,$dbase??null];})($base.'private/core/config/config.inc.php');
$database='cc_adapter_'.str_replace('-','_',$case);
if($destination!==['db',$database]||realpath('/opt/cc-updates/active')!==rtrim($base,'/'))throw new RuntimeException('Foreign/inactive fixture');
define('MODX_API_MODE',true);ob_start();require $base.'site/index.php';while(ob_get_level())ob_end_clean();
if($modx->query('SELECT DATABASE()')->fetchColumn()!==$database||$modx->getVersionData()['full_version']!=='2.8.8-pl')throw new RuntimeException('Wrong baseline');
if($op==='info'){
    echo json_encode(['modx'=>$modx->getVersionData()['full_version'],'php'=>PHP_VERSION,'xpdo'=>(preg_match('/xPDO ([0-9.]+-pl)/',file_get_contents(MODX_CORE_PATH.'xpdo/changelog.txt'),$m)?$m[1]:null)]);exit;
}
if($op==='page'){
    $r=$modx->getObject('modResource',['alias'=>'modx2-compatibility-regression'])?:$modx->newObject('modResource');
    $r->fromArray(['pagetitle'=>'Compatibility regression','alias'=>'modx2-compatibility-regression','published'=>1,'template'=>0,'cacheable'=>1,'content'=>stream_get_contents(STDIN)],'',true,true);if(!$r->save())throw new RuntimeException('Resource');$modx->cacheManager->refresh();echo json_encode(['id'=>$r->get('id')]);exit;
}
throw new RuntimeException('Unknown action');
