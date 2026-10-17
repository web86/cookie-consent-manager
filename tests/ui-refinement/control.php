<?php
/** Disposable native UI fixtures only. Never included in the transport allowlist. */
declare(strict_types=1);
if(PHP_SAPI!=='cli'||!getenv('CC_DB_PASSWORD'))exit(1);
$case=$argv[1]??'';$op=$argv[2]??'';
if(!preg_match('/^ui-refinement-[a-z0-9-]+$/D',$case))exit(1);
$base='/opt/cc-updates/cases/'.$case.'/';
if(!is_file($base.'private/manager.json'))exit(1);
define('MODX_API_MODE',true);ob_start();require $base.'site/index.php';while(ob_get_level())ob_end_clean();
if(!preg_match('/^cc_adapter3?_ui_refinement_/D',(string)$modx->getOption('dbname')))exit(1);
$class=fn($name)=>str_starts_with($modx->getVersionData()['version'],'3')?'MODX\\Revolution\\'.$name:$name;
if($op==='setting'){
    $key=$argv[3]??'';if(!in_array($key,['cookie_consent.options','cookie_consent.services','cookie_consent.texts','cookie_consent.log_dir','manager_language'],true))exit(1);
    $row=$modx->getObject($class('modSystemSetting'),['key'=>$key]);
    if(($argv[4]??'get')==='set'){$row->set('value',stream_get_contents(STDIN));$row->save();$modx->cacheManager->refresh();}
    echo json_encode(['value'=>$row->get('value')]);exit;
}
if($op==='inventory'){
    $runtime=json_decode(file_get_contents('/opt/cc-reference/_build/transport-files.json'),true,16,JSON_THROW_ON_ERROR);$hashes=[];
    foreach($runtime as $target=>$source){$file=str_starts_with($target,'core/')?MODX_CORE_PATH.substr($target,5):MODX_ASSETS_PATH.substr($target,7);$hashes[$target]=is_file($file)?hash_file('sha256',$file):null;}
    echo json_encode(['modx'=>$modx->getVersionData()['full_version'],'runtime'=>$hashes]);exit;
}
if($op==='logs'){
    $dir=rtrim((string)$modx->getOption('cookie_consent.log_dir'),'/');
    if(!str_starts_with($dir,$base))throw new RuntimeException('Fixture log directory required');
    require_once MODX_CORE_PATH.'components/cookieconsent/src/CookieConsentAuditReader.php';
    $reader=new CookieConsentAuditReader($dir);$records=[];
    foreach($reader->scan($reader->snapshot(CookieConsentAuditReader::filters(['year'=>'all']))) as $item)if(isset($item['record']))$records[]=$item['record'];
    echo json_encode(['records'=>$records]);exit;
}
if($op==='seed'){
    $dir=rtrim((string)$modx->getOption('cookie_consent.log_dir'),'/');
    if(!str_starts_with($dir,$base)||!is_dir($dir))throw new RuntimeException('Fixture log directory required');
    $file=$dir.'/2025-01-cookie-consent.log';
    $lines=[];for($i=1;$i<=55;$i++){$r=['schema'=>1,'server_time'=>sprintf('2025-01-01T00:00:%02dZ',$i),'event_id'=>sprintf('aaaaaaaa-aaaa-4aaa-8aaa-%012d',$i),'consent_id'=>'bbbbbbbb-bbbb-4bbb-8bbb-000000000001','ip'=>'127.0.0.1','user_agent'=>'UI fixture','event'=>'reject','stage'=>'committed','categories'=>['necessary'=>true,'analytics'=>false,'marketing'=>false],'policy_version'=>'1'];if($i!==55)$r['page']=$i===54?'/<img src=x onerror=alert(1)>/':'/catalog/item-'.$i.'/';$lines[]=json_encode($r);}
    $bytes=implode("\n",$lines)."\n";if(file_exists($file)){if(file_get_contents($file)!==$bytes)throw new RuntimeException('Existing logs preserved');}else file_put_contents($file,$bytes);echo json_encode(['records'=>55]);exit;
}
throw new RuntimeException('Unknown UI fixture operation');
