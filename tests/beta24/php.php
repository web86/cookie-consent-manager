<?php
require_once __DIR__.'/../../server/src/CookieConsentAuditDirectoryCheck.php';
$n=0;function eq($a,$b,$why=''){global $n;$n++;if($a!==$b)throw new RuntimeException($why);}
$root=sys_get_temp_dir().'/cc-fs-check-'.bin2hex(random_bytes(8));mkdir($root,0700);$dir=$root.'/logs';mkdir($dir,0700);
file_put_contents($dir.'/error.log','MODX error sentinel');file_put_contents($dir.'/2000-01-cookie-consent.log','Historical sentinel');$before=[];foreach(glob($dir.'/*') as $file)$before[$file]=hash_file('sha256',$file);
class CCShortWrites extends CookieConsentAuditDirectoryCheck {protected static function write($h,string $bytes){return fwrite($h,substr($bytes,0,3));}}
class CCPartialFailure extends CookieConsentAuditDirectoryCheck {private static int $count=0;protected static function write($h,string $bytes){return self::$count++===0?fwrite($h,substr($bytes,0,3)):0;}}
class CCWriteFailure extends CookieConsentAuditDirectoryCheck {protected static function write($h,string $bytes){return false;}}
class CCReadFailure extends CookieConsentAuditDirectoryCheck {protected static function read($h,int $length){return false;}}
class CCReadMismatch extends CookieConsentAuditDirectoryCheck {protected static function read($h,int $length){return str_repeat('z',$length);}}
foreach([CookieConsentAuditDirectoryCheck::class,CCShortWrites::class] as $class){$class::check($dir,$root);eq(glob($dir.'/.cc-audit-check-*'),[],'No leftover success file');}
foreach([CCPartialFailure::class=>'log_write_failed',CCWriteFailure::class=>'log_write_failed',CCReadFailure::class=>'log_read_failed',CCReadMismatch::class=>'log_read_failed'] as $class=>$reason){try{$class::check($dir,$root);throw new LogicException('Fault accepted');}catch(RuntimeException $e){eq($e->getMessage(),$reason);eq(glob($dir.'/.cc-audit-check-*'),[],'Cleanup after fault');}}
foreach([$root.'/missing'=>'log_missing',$dir.'/../logs'=>'log_traversal',$root=>'log_root'] as $path=>$reason){try{CookieConsentAuditDirectoryCheck::check($path,$root);throw new LogicException('Unsafe accepted');}catch(RuntimeException $e){eq($e->getMessage(),$reason);}}
symlink($dir,$root.'/alias');try{CookieConsentAuditDirectoryCheck::check($root.'/alias',$root);throw new LogicException('Symlink accepted');}catch(RuntimeException $e){eq($e->getMessage(),'log_symlink');}unlink($root.'/alias');
foreach($before as $file=>$hash){eq(hash_file('sha256',$file),$hash,'Untouched user log');unlink($file);}eq(glob($dir.'/.cc-audit-check-*'),[]);rmdir($dir);rmdir($root);
echo json_encode(['suite'=>'Local journal write/read safety and failure injections','tests'=>1,'assertions'=>$n,'failed'=>0,'result'=>'PASS'])."\n";
