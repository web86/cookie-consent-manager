<?php
declare(strict_types=1);
/** CLI-only recovery from MODX native preserved.php. Default is a hash-only dry run. */
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
$site=$argv[1]??'';$signature=$argv[2]??'';$apply=($argv[3]??'')==='--apply';
if(realpath($site)!==rtrim($site,'/')||!is_file($site.'/index.php')||!preg_match('/^cookieconsentmanager-[0-9]{1,4}\.[0-9]{1,4}\.[0-9]{1,4}(?:-(?:beta|pl)[1-9][0-9]{0,2})?$/D',$signature))throw new RuntimeException('Usage: restore-elements.php /canonical/MODX-root cookieconsentmanager-VERSION [--apply]');
define('MODX_API_MODE',true);ob_start();require $site.'/index.php';while(ob_get_level())ob_end_clean();
require_once __DIR__.'/../src/CookieConsentPrivatePath.php';
$file=MODX_CORE_PATH.'packages/'.$signature.'/preserved.php';CookieConsentPrivatePath::file($file);if(!is_readable($file))throw new RuntimeException('Native backup not available');$backup=require $file;if(!is_array($backup))throw new RuntimeException('Native backup invalid');
$definitions=['chunk'=>['modChunk','CookiesPopup'],'snippet'=>['modSnippet','CookieConsentRegistry'],'CookieConsent'=>['modSnippet','CookieConsent'],'CookieConsentMap'=>['modSnippet','CookieConsentMap'],'CookieConsentVideo'=>['modSnippet','CookieConsentVideo'],'CookieConsentAssets'=>['modSnippet','CookieConsentAssets'],'CookieConsentBanner'=>['modSnippet','CookieConsentBanner']];$items=[];$report=[];
foreach($definitions as $key=>[$class,$name]){
 $entry=$backup[md5('cookieconsentmanager/'.$key)]['object']??null;if(!$entry)continue;
 if(($entry['name']??null)!==$name||!isset($entry['id'])||!is_string($entry['snippet']??null))throw new RuntimeException('Backup identity mismatch');$row=$modx->getObject($class,['name'=>$name]);if(!$row||$row->get('id')!=$entry['id'])throw new RuntimeException('Current identity mismatch; no element created');
 if(!empty($entry['static']))throw new RuntimeException('Static-element restore requires reviewing original static file and DB backup; no file modified');
 $items[]=[$row,$entry];$report[]=['name'=>$name,'id'=>$row->get('id'),'current_sha256'=>hash('sha256',$row->get('snippet')),'backup_sha256'=>hash('sha256',$entry['snippet'])];
}
if(!$items)throw new RuntimeException('No canonical native backups');
if($apply){$modx->beginTransaction();try{foreach($items as [$row,$entry]){$row->fromArray($entry,'',false,true);if(!$row->save())throw new RuntimeException('Restore failed');}$modx->commit();}catch(Throwable $e){$modx->rollBack();throw $e;}$modx->cacheManager->refresh();}
echo json_encode(['applied'=>$apply,'elements'=>$report],JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE)."\n";
