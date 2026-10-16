<?php
declare(strict_types=1);
require_once __DIR__.'/../../server/src/CookieConsentBundleManager.php';
final class BundleFixture {
    public object $context;
    public object $user;
    public function __construct(public string $root, string $context='mgr', bool $authenticated=true) {
        $this->context=new class($context) {public function __construct(private string $key){} public function get($key){return $this->key;}};
        $this->user=new class($authenticated) {public function __construct(private bool $authenticated){} public function isAuthenticated($context){return $this->authenticated;}};
    }
    public function getOption($key){return $this->root.'/'.($key==='core_path'?'core/':'assets/');}
}
if(($argv[1]??'')==='worker') {
    try {echo json_encode(CookieConsentBundleManager::rebuild(new BundleFixture($argv[2]),true));}
    catch(Throwable $e){echo json_encode(['error'=>$e->getMessage()]);}
    exit;
}
$project=dirname(__DIR__,2);$out=$project.'/.local/adapter-cache';
if(!is_dir($out))mkdir($out,0755,true);
$root=$out.'/fixture-'.bin2hex(random_bytes(4));
mkdir($root.'/core/components/cookieconsent',0755,true);
$manifest=$project.'/_build/frontend-manifest.json';
copy($manifest,$root.'/core/components/cookieconsent/frontend-manifest.json');
$inputs=json_decode(file_get_contents($manifest),true)['inputs'];
foreach($inputs as $path=>$unused)if(str_ends_with($path,'.js')) {
    if(!is_dir(dirname($root.'/'.$path)))mkdir(dirname($root.'/'.$path),0755,true);
    copy($project.'/'.$path,$root.'/'.$path);
}
$modx=new BundleFixture($root);$n=0;
function eq($a,$b,$message=''):void{global $n;$n++;if($a!==$b)throw new RuntimeException($message.' '.json_encode([$a,$b]));}
function rejects(callable $fn, ?string $message=null):void{global $n;try{$fn();}catch(Throwable $e){$n++;if($message!==null&&$e->getMessage()!==$message)throw $e;return;}throw new RuntimeException('Expected rejection');}
$file=$root.'/assets/js/cookie-consent/cached-cookie-consent.min.js';$dir=dirname($file);
$source=$root.'/assets/js/cookie-consent/embeds/youtube.js';$original=file_get_contents($source);
$oldPath=getenv('PATH');putenv('PATH='); // Neither Node nor npm can be found by the PHP build.
eq(CookieConsentBundleManager::status($modx)['state'],'fallback','Fresh fallback');
eq(str_starts_with(CookieConsentBundleManager::asset($modx),'js/cookie-consent/cookie-consent.min.js?v='),true,'Prebuilt selection');
rejects(fn()=>CookieConsentBundleManager::rebuild(new BundleFixture($root,'web')),'bundle_forbidden');
rejects(fn()=>CookieConsentBundleManager::rebuild(new BundleFixture($root,'mgr',false)),'bundle_forbidden');
eq(is_file($file),false,'Public requests never create cache');
$first=CookieConsentBundleManager::install($modx);eq($first['rebuilt'],true,'First installation warmup');eq($first['state'],'ready');
$old=file_get_contents($file);$url=CookieConsentBundleManager::asset($modx);$stat=stat($file);
eq(CookieConsentBundleManager::rebuild($modx)['rebuilt'],false,'Unchanged skip');
clearstatcache(true,$file);eq(stat($file)['ino'],$stat['ino'],'Unchanged inode');eq(file_get_contents($file),$old);
// Regex, comments, division, template literals, optional chaining, nullish, ASI and UTF-8.
$syntax="\nwindow.__bundleSyntax=(()=>{const r=/[/*]/g;const q=12/3/2;const v={x:{y:0}};function asi(){return\n{wrong:true};}return [r.test('*'),q,`a\${v.x?.y ?? 9}b`,asi(), 'Привет'];})();\n";
file_put_contents($source,$original.$syntax);
$changed=CookieConsentBundleManager::rebuild($modx);eq($changed['rebuilt'],true,'Adapter edit');eq(CookieConsentBundleManager::asset($modx)!==$url,true,'Cache bust');
$good=file_get_contents($file);$meta=CookieConsentBundleManager::status($modx);
copy($file,$out.'/php-bundle.js');
file_put_contents($out.'/syntax-source.js',$syntax);
$forced=CookieConsentBundleManager::rebuild($modx,true);eq($forced['rebuilt'],true,'Force unchanged');eq($forced['version'],$changed['version'],'Content-based version');
$good=file_get_contents($file);$meta=CookieConsentBundleManager::status($modx);
file_put_contents($source,$original."\nfunction { broken");
rejects(fn()=>CookieConsentBundleManager::rebuild($modx));eq(file_get_contents($file),$good,'Parse failure keeps bundle and success metadata');eq(CookieConsentBundleManager::status($modx)['built_at'],$meta['built_at']);eq(CookieConsentBundleManager::status($modx)['state'],'error');
file_put_contents($source,$original.$syntax);
eq(CookieConsentBundleManager::rebuild($modx)['rebuilt'],false,'Repaired unchanged sources reuse last success');eq(CookieConsentBundleManager::status($modx)['state'],'ready');
$manifestPath=$root.'/core/components/cookieconsent/frontend-manifest.json';$valid=file_get_contents($manifestPath);$bad=json_decode($valid,true);
foreach(['../escape.js','assets/js/cookie-consent/../escape.js','assets/js/cookie-consent/mock/../../escape.js','/tmp/escape.js','assets/js/cookie-consent/cookie-consent.min.js'] as $path){
    $bad['inputs'][$path]='unused';file_put_contents($manifestPath,json_encode($bad));rejects(fn()=>CookieConsentBundleManager::rebuild($modx),'bundle_manifest');eq(file_get_contents($file),$good,'Unsafe manifest preserves bundle');unset($bad['inputs'][$path]);
}
file_put_contents($manifestPath,$valid);
rename($source,$source.'.real');symlink($source.'.real',$source);rejects(fn()=>CookieConsentBundleManager::rebuild($modx),'bundle_manifest');unlink($source);rename($source.'.real',$source);
chmod($dir,0555);rejects(fn()=>CookieConsentBundleManager::rebuild($modx),'bundle_directory');eq(file_get_contents($file),$good,'Permission failure preserves bundle');chmod($dir,0755);
// Deterministic cross-process lock check, then two competing writers.
$lock=fopen($dir.'/cookie-consent.build.lock','c');flock($lock,LOCK_EX);
$pipes=[];$child=proc_open([PHP_BINARY,__FILE__,'worker',$root],[1=>['pipe','w'],2=>['pipe','w']],$pipes);
$result=stream_get_contents($pipes[1]);$error=stream_get_contents($pipes[2]);fclose($pipes[1]);fclose($pipes[2]);eq(proc_close($child),0);eq(json_decode($result,true)['error'],'bundle_busy');eq($error,'');flock($lock,LOCK_UN);fclose($lock);
$children=[];for($i=0;$i<2;$i++){$pipes=[];$process=proc_open([PHP_BINARY,__FILE__,'worker',$root],[1=>['pipe','w'],2=>['pipe','w']],$pipes);$children[]=[$process,$pipes];}
$success=0;foreach($children as [$process,$pipes]){$result=json_decode(stream_get_contents($pipes[1]),true);$error=stream_get_contents($pipes[2]);fclose($pipes[1]);fclose($pipes[2]);eq(proc_close($process),0);eq($error,'');if(isset($result['error']))eq($result['error'],'bundle_busy');else{eq($result['rebuilt'],true);$success++;}}
eq($success>=1,true,'At least one writer succeeds');
eq(CookieConsentBundleManager::status($modx)['state'],'ready');
file_put_contents($source,$original);
CookieConsentBundleManager::rebuild($modx);
copy($file,$out.'/production.js');
$productionVersion=CookieConsentBundleManager::status($modx)['version'];
// Visitors keep serving ready static JS even when sources/manifest are unavailable.
foreach($inputs as $path=>$unused)if(str_ends_with($path,'.js'))unlink($root.'/'.$path);unlink($manifestPath);
$before=file_get_contents($file);$files=scandir($dir);$stat=stat($file);
$visitor=new BundleFixture($root,'web',false);
eq(CookieConsentBundleManager::asset($visitor),'js/cookie-consent/cached-cookie-consent.min.js?v='.$productionVersion);eq(file_get_contents($file),$before);eq(scandir($dir),$files);clearstatcache(true,$file);eq(stat($file)['ino'],$stat['ino']);
unlink($file);eq(str_starts_with(CookieConsentBundleManager::asset($visitor),'js/cookie-consent/cookie-consent.min.js?v='),true,'Missing cache uses shipped fallback without rebuilding');eq(is_file($file),false);
putenv('PATH='.$oldPath);
$report=['result'=>'PASS','assertions'=>$n,'php'=>PHP_VERSION,'node_available_during_build'=>false,'php_bundle_bytes'=>filesize($out.'/php-bundle.js')];
file_put_contents($out.'/php.json',json_encode($report,JSON_PRETTY_PRINT)."\n");echo json_encode($report)."\n";
