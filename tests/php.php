<?php
declare(strict_types=1);
require_once __DIR__.'/../server/src/CookieConsentEventValidator.php';
require_once __DIR__.'/../server/src/CookieConsentAuditLogger.php';
require_once __DIR__.'/../server/src/CookieConsentRateLimiter.php';
require_once __DIR__.'/../server/src/CookieConsentPrivatePath.php';
require_once __DIR__.'/../server/src/CookieConsentServiceRegistry.php';
$assertions=0;
function check(bool $ok,string $message): void { global $assertions; $assertions++; if (!$ok) throw new RuntimeException($message); }
function throws(callable $call,string $class): void { try { $call(); } catch (Throwable $e) { check($e instanceof $class,'Expected '.$class.', got '.get_class($e)); return; } throw new RuntimeException('Expected '.$class); }
function uuid(): string { $h=bin2hex(random_bytes(16)); return substr($h,0,8).'-'.substr($h,8,4).'-4'.substr($h,13,3).'-8'.substr($h,17,3).'-'.substr($h,20); }
function event(): array { return ['event_id'=>uuid(),'consent_id'=>uuid(),'event'=>'reject','stage'=>'committed','analytics'=>false,'marketing'=>false,'policy_version'=>'1','page'=>'/','timestamp'=>'2026-10-12T07:00:00.000Z']; }
$root=realpath(sys_get_temp_dir()).'/cc-unit-'.bin2hex(random_bytes(8));mkdir($root,0700);
$webroot=$root.'/web';$logs=$root.'/logs';mkdir($webroot);mkdir($logs,0700);
check(CookieConsentPrivatePath::directory($logs,$webroot)===$logs,'Private path');
foreach ([$webroot,$webroot.'/nested','relative',$logs.'/../logs',$root.'/missing','/'] as $path) throws(fn()=>CookieConsentPrivatePath::directory($path,$webroot),RuntimeException::class);
symlink($logs,$root.'/alias');throws(fn()=>CookieConsentPrivatePath::directory($root.'/alias',$webroot),RuntimeException::class);
mkdir($root.'/locked',0500);if (posix_geteuid()!==0) throws(fn()=>CookieConsentPrivatePath::directory($root.'/locked',$webroot),RuntimeException::class);
$registry=CookieConsentServiceRegistry::validateJson(json_encode(CookieConsentServiceRegistry::defaults()));
check(count($registry['services'])===7,'Default services');
$bad=$registry;$bad['services'][0]['loader']='javascript:alert(1)';throws(fn()=>CookieConsentServiceRegistry::validateJson(json_encode($bad)),InvalidArgumentException::class);
$bad=$registry;$bad['services'][0]['config']['script']='https://evil.test/x.js';throws(fn()=>CookieConsentServiceRegistry::validateJson(json_encode($bad)),InvalidArgumentException::class);
$bad=$registry;$bad['services'][0]['name']='<img onerror=alert(1)>';throws(fn()=>CookieConsentServiceRegistry::validateJson(json_encode($bad)),InvalidArgumentException::class);
$bad=$registry;$bad['services'][]=$bad['services'][0];throws(fn()=>CookieConsentServiceRegistry::validateJson(json_encode($bad)),InvalidArgumentException::class);
$bad=$registry;$bad['services'][0]['category']='necessary';throws(fn()=>CookieConsentServiceRegistry::validateJson(json_encode($bad)),InvalidArgumentException::class);
$old="{\"schema\":1,\"archive\":true}\n";file_put_contents($logs.'/2020-01-cookie-consent.log',$old);touch($logs.'/2020-01-cookie-consent.log',time()-86400*365);
$logger=new CookieConsentAuditLogger($logs,str_repeat('K',32),1000,$registry);
$e=event();$logger->append($e,'127.0.0.1',"Unit\nUA\xFF");
throws(fn()=>$logger->append($e,'127.0.0.2','changed IP'),DomainException::class);
$record=json_decode(trim(file_get_contents($logs.'/'.gmdate('Y-m').'-cookie-consent.log')),true,16,JSON_THROW_ON_ERROR);
check($record['ip']==='127.0.0.1' && $record['schema']===1,'Legacy record/IP');check(strpos($record['user_agent'],"\n")===false,'UA sanitization');
$e=event();$e+=['schema'=>2,'external_content'=>true,'providers'=>['google_maps'=>true,'yandex_maps'=>false],'provider'=>'google_maps'];$e['event']='map_allow';
$logger->append($e,'127.0.0.1','Unit');check(CookieConsentEventValidator::validate($e,$registry)===$e,'Schema 2');
foreach (['ip'=>'1.2.3.4','extra'=>true] as $k=>$v) { $bad=event();$bad[$k]=$v;throws(fn()=>CookieConsentEventValidator::validate($bad),InvalidArgumentException::class); }
foreach ([['timestamp','2026-99-12T07:00:00.000Z'],['page','//evil.test'],['analytics','true'],['stage','draft']] as [$k,$v]) {$bad=event();$bad[$k]=$v;throws(fn()=>CookieConsentEventValidator::validate($bad),InvalidArgumentException::class);}
$bad=$e;$bad['event']='accept_all';$bad['provider']=null;$bad['analytics']=true;$bad['marketing']=true;throws(fn()=>CookieConsentEventValidator::validate($bad,$registry),InvalidArgumentException::class);
$bad=$e;$bad['external_content']=false;throws(fn()=>CookieConsentEventValidator::validate($bad,$registry),InvalidArgumentException::class);
$bad=$e;$bad['provider']='yandex';throws(fn()=>CookieConsentEventValidator::validate($bad,$registry),InvalidArgumentException::class);
$limited=$root.'/limited';mkdir($limited);$limit=new CookieConsentAuditLogger($limited,str_repeat('K',32),1);$limit->append(event(),'127.0.0.1','UA');throws(fn()=>$limit->append(event(),'127.0.0.1','UA'),OverflowException::class);
$symlink=$root.'/symlink';mkdir($symlink);file_put_contents($root.'/sentinel','untouched');symlink($root.'/sentinel',$symlink.'/'.gmdate('Y-m').'-cookie-consent.log');
throws(fn()=>(new CookieConsentAuditLogger($symlink,str_repeat('K',32)))->append(event(),'127.0.0.1','UA'),RuntimeException::class);check(file_get_contents($root.'/sentinel')==='untouched','Symlink target unchanged');
$hard=$root.'/hardlink';mkdir($hard);link($root.'/sentinel',$hard.'/'.gmdate('Y-m').'-cookie-consent.log');throws(fn()=>(new CookieConsentAuditLogger($hard,str_repeat('K',32)))->append(event(),'127.0.0.1','UA'),RuntimeException::class);check(file_get_contents($root.'/sentinel')==='untouched','Hardlink target unchanged');
$states=$root.'/states';mkdir($states);symlink($root.'/sentinel',$states.'/.rate');throws(fn()=>(new CookieConsentAuditLogger($states,str_repeat('K',32)))->append(event(),'127.0.0.1','UA'),RuntimeException::class);
$corrupt=$root.'/corrupt';mkdir($corrupt);mkdir($corrupt.'/.rate');file_put_contents($corrupt.'/.rate/state.json','{');throws(fn()=>(new CookieConsentAuditLogger($corrupt,str_repeat('K',32)))->append(event(),'127.0.0.1','UA'),RuntimeException::class);
// A stream wrapper simulates partial writes then a zero write (disk failure).
class PartialStream { public $context; private int $calls=0; public function stream_open($p,$m,$o,&$op){return true;} public function stream_write($data){return ++$this->calls===1 ? 3 : 0;} public function stream_eof(){return false;} }
stream_wrapper_register('ccpartial',PartialStream::class);$h=fopen('ccpartial://failure','w');throws(fn()=>CookieConsentRateLimiter::writeAll($h,'abcdef'),RuntimeException::class);fclose($h);
// Concurrent real processes contend on the shared limiter and monthly append.
$concurrent=$root.'/concurrent';mkdir($concurrent);$ids=[];
for ($i=0;$i<20;$i++) {
    $pid=pcntl_fork();if ($pid===0) { try {(new CookieConsentAuditLogger($concurrent,str_repeat('K',32),1000))->append(event(),'127.0.0.1','Concurrent');exit(0);}catch(Throwable $e){exit(1);} }$ids[]=$pid;
}
foreach($ids as $pid){pcntl_waitpid($pid,$status);check(pcntl_wexitstatus($status)===0,'Concurrent child');}
$lines=file($concurrent.'/'.gmdate('Y-m').'-cookie-consent.log',FILE_IGNORE_NEW_LINES);check(count($lines)===20,'20 complete lines');$unique=[];
foreach($lines as $line){$r=json_decode($line,true,16,JSON_THROW_ON_ERROR);$unique[$r['event_id']]=1;check($r['stage']==='committed','Valid concurrent JSON');}check(count($unique)===20,'Unique concurrent IDs');
check(file_get_contents($logs.'/2020-01-cookie-consent.log')===$old,'Archive unchanged');check(!file_exists(__DIR__.'/../server/bin/prune.php'),'No prune');
echo json_encode(['suite'=>'PHP','assertions'=>$assertions,'result'=>'PASS'])."\n";
