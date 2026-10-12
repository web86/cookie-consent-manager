<?php
require_once __DIR__.'/../server/src/CookieConsentSettings.php';
require_once __DIR__.'/../server/src/CookieConsentLogDirectory.php';
$n=0;
function check($a,$b,$why){global $n;$n++;if($a!==$b)throw new RuntimeException($why);}
function reject($fn){global $n;try{$fn();}catch(Throwable $e){$n++;return;}throw new RuntimeException('Expected rejection');}
$en=CookieConsentTexts::lexicon('en');$ru=CookieConsentTexts::lexicon('ru');$a=array_keys($en);$b=array_keys($ru);sort($a);sort($b);check($a,$b,'Complete bilingual lexicon');check(isset($en['m.upgrade_elements']),true,'Correct manager key');check(isset($en['cookie_consent.upgrade_elements']),false,'No wrong stock key');
$texts=CookieConsentTexts::defaults();$texts['locales']['pt-br']=['reject'=>'Legado','cookie_consent.upgrade_elements'=>'Legacy accidental key'];$valid=CookieConsentTexts::validate($texts);check($valid['locales']['pt-br']['reject'],'Legado','Legacy custom locale kept');check($valid['locales']['pt-br']['cookie_consent.upgrade_elements'],'Legacy accidental key','Legacy entry kept');check(isset(CookieConsentTexts::resolve($valid,'pt-br')['cookie_consent.upgrade_elements']),false,'Manager-only legacy key excluded');
$base=sys_get_temp_dir().'/cc-ux-'.bin2hex(random_bytes(6));mkdir($base);mkdir($base.'/root');mkdir($base.'/root/logs');mkdir($base.'/private');$origin='http://127.0.0.1:8889';
try {
 check(CookieConsentLogDirectory::validate($base.'/private',$base.'/root',$origin),$base.'/private','Private directory requires no HTTP/Apache');
 foreach([$base.'/root',$base.'/root/../root/logs',$base.'/root/logs/missing'] as $dir)reject(fn()=>CookieConsentLogDirectory::canonical($dir,$base.'/root'));
 symlink($base.'/root/logs',$base.'/root/alias');reject(fn()=>CookieConsentLogDirectory::canonical($base.'/root/alias',$base.'/root'));
 $_SERVER['DOCUMENT_ROOT']=$base.'/root';check(CookieConsentAuditConfiguration::webroot(),$base.'/root','Actual document root used');
 reject(fn()=>CookieConsentAuditConfiguration::path($base.'/root/logs/config.json',CookieConsentAuditConfiguration::webroot()));
 $_SERVER['SERVER_SOFTWARE']='nginx';reject(fn()=>CookieConsentLogDirectory::prepare($base.'/root/logs',$base.'/root'));
 $_SERVER['SERVER_SOFTWARE']='unknown';reject(fn()=>CookieConsentLogDirectory::prepare($base.'/root/logs',$base.'/root'));
 $_SERVER['SERVER_SOFTWARE']='Apache/2.4';$_SERVER['HTTP_CF_RAY']='test';reject(fn()=>CookieConsentLogDirectory::prepare($base.'/root/logs',$base.'/root'));unset($_SERVER['HTTP_CF_RAY']);
 CookieConsentLogDirectory::prepare($base.'/root/logs',$base.'/root');check(file_get_contents($base.'/root/logs/.htaccess'),CookieConsentLogDirectory::DENY,'Explicit guard installed');
 file_put_contents($base.'/root/logs/.htaccess','Customer guard');CookieConsentLogDirectory::prepare($base.'/root/logs',$base.'/root');check(file_get_contents($base.'/root/logs/.htaccess'),'Customer guard','Never overwrite customer guard');
}finally{foreach([$base.'/root/logs/.htaccess',$base.'/root/alias'] as $f)if(file_exists($f)||is_link($f))unlink($f);rmdir($base.'/root/logs');rmdir($base.'/root');rmdir($base.'/private');rmdir($base);}
echo json_encode(['suite'=>'Manager UX security/lexicon PHP','assertions'=>$n,'result'=>'PASS'])."\n";
