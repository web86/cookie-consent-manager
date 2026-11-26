<?php
declare(strict_types=1);
$probeMode=PHP_SAPI==='cli'?($argv[1]??'environment'):($_GET['probe']??'environment');
header('Content-Type: application/json');
$probeLog=getenv('CC_PROBE_LOG');
function mark(string $event):void{global $probeLog;if($probeLog)file_put_contents($probeLog,json_encode(['event'=>$event,'sapi'=>PHP_SAPI,'pid'=>getmypid()])."\n",FILE_APPEND|LOCK_EX);}
mark('request.begin.'.$probeMode);
if($probeMode==='environment'){echo json_encode(['php'=>PHP_VERSION,'sapi'=>PHP_SAPI,'opcache'=>function_exists('opcache_get_status')?opcache_get_status(false):false]);return;}
require_once __DIR__.'/../../server/src/CookieConsentPath.php';
require_once __DIR__.'/../../_build/ownership.php';
mark('embedded.classes.loaded');
if($probeMode==='declare'){echo json_encode(['classes_loaded'=>true]);return;}
// Valid PHP early return: no MODX API, native uninstall, opcache_invalidate or file deletion executes.
$probeTransport=(object)['xpdo'=>new class{public function getOption(...$args){return [];}}];
mark('finish.empty_plan.before');
$probeResult=CookieConsentTransportOwnership::finish($probeTransport,[]);
mark('finish.empty_plan.after');
if($probeResult!==false)throw new RuntimeException('Expected empty plan refusal');
echo json_encode(['result'=>'PASS','empty_plan_refused'=>true]);
