<?php
declare(strict_types=1);
require_once __DIR__.'/../../server/src/CookieConsentBundleManager.php';
final class BundleFixture {
    public object $context;
    public object $user;
    public function __construct(public string $root, string $context='mgr', bool $authenticated=true) {
        if(is_file($root.'/settings.json'))$this->options=json_decode(file_get_contents($root.'/settings.json'),true);
        $this->cacheManager=new class {
            public array $refreshes=[];public array $cleans=[];
            public function refresh($partitions){$this->refreshes[]=$partitions;return true;}
            public function clean($options){$this->cleans[]=$options;return true;}
        };
        $this->context=new class($context) {public function __construct(private string $key){} public function get($key){return $this->key;}};
        $this->user=new class($authenticated) {public function __construct(private bool $authenticated){} public function isAuthenticated($context){return $this->authenticated;}};
    }
    public array $options = [];
    public bool $failVersion = false;
    public bool $failCommit = false;
    private string|false $transaction = false;
    public int $queries = 0;
    public object $cacheManager;
    public function getOption($key, $options=null, $default=null){
        if($key==='core_path'||$key==='assets_path')return $this->root.'/'.($key==='core_path'?'core/':'assets/');
        return $this->options[$key]??$default;
    }
    public function beginTransaction(){$this->transaction=is_file($this->root.'/settings.json')?file_get_contents($this->root.'/settings.json'):false;return true;}
    public function commit(){return !$this->failCommit;}
    public function rollBack(){if($this->transaction===false)@unlink($this->root.'/settings.json');else file_put_contents($this->root.'/settings.json',$this->transaction);}
    public function setOption($key,$value){$this->options[$key]=$value;}
    public function getObject($class,$criteria){
        $this->queries++;
        $values=is_file($this->root.'/settings.json')?json_decode(file_get_contents($this->root.'/settings.json'),true):[];
        return isset($values[$criteria['key']])?$this->row($criteria['key'],$values[$criteria['key']]):null;
    }
    public function newObject($class){return $this->row('',null);}
    private function row($key,$value){return new class($this,['key'=>$key,'value'=>$value]){
        public function __construct(private BundleFixture $owner,private array $values){}
        public function get($key){return $this->values[$key]??null;}
        public function set($key,$value){$this->values[$key]=$value;}
        public function fromArray($values,$prefix='', $keys=false,$raw=false){$this->values=array_merge($this->values,$values);}
        public function save(){
            if($this->owner->failVersion)return false;
            file_put_contents($this->owner->root.'/settings.json',json_encode([$this->values['key']=>$this->values['value']]));return true;
        }
    };}

}
if(($argv[1]??'')==='worker') {
    try {echo json_encode(CookieConsentBundleManager::rebuild(new BundleFixture($argv[2]),true));}
    catch(Throwable $e){echo json_encode(['error'=>$e->getMessage()]);}
    exit;
}
$project=dirname(__DIR__,2);$out=$project.'/.local/adapter-cache';
if(!is_dir($out))mkdir($out,0755,true);
$root=$out.'/fixture-'.bin2hex(random_bytes(4));
mkdir($root.'/core/components/cookieconsentmanager',0755,true);
$manifest=$project.'/_build/frontend-manifest.json';
copy($manifest,$root.'/core/components/cookieconsentmanager/frontend-manifest.json');
$inputs=json_decode(file_get_contents($manifest),true)['inputs'];
foreach($inputs as $path=>$unused)if(str_ends_with($path,'.js')) {
    if(!is_dir(dirname($root.'/'.$path)))mkdir(dirname($root.'/'.$path),0755,true);
    copy($project.'/'.$path,$root.'/'.$path);
}
$package=json_decode(file_get_contents($project.'/_build/package.json'),true);
$releaseVersion=$package['version'].($package['release']?'-'.$package['release'].$package['release_index']:'');
$modx=new BundleFixture($root);$n=0;
function eq($a,$b,$message=''):void{global $n;$n++;if($a!==$b)throw new RuntimeException($message.' '.json_encode([$a,$b]));}
function rejects(callable $fn, ?string $message=null):void{global $n;try{$fn();}catch(Throwable $e){$n++;if($message!==null&&$e->getMessage()!==$message)throw $e;return;}throw new RuntimeException('Expected rejection');}
$file=$root.'/assets/js/cookie-consent/cached-cookie-consent.min.js';$dir=dirname($file);
$source=$root.'/assets/js/cookie-consent/embeds/youtube.js';$original=file_get_contents($source);
$oldPath=getenv('PATH');putenv('PATH='); // Neither Node nor npm can be found by the PHP build.
// MODX can log suppressed @ warnings; optional absent state must never call I/O.
$optionalWarnings=[];$captureOptional=static function($severity,$message)use(&$optionalWarnings){if($severity===E_WARNING)$optionalWarnings[]=$message;return true;};
set_error_handler($captureOptional);
eq(CookieConsentBundleManager::status($modx)['state'],'fallback','Fresh fallback');
$metadata=new ReflectionMethod(CookieConsentBundleManager::class,'metadata');
eq($metadata->invoke(null,$file),null,'Missing first bundle has no metadata');
restore_error_handler();eq($optionalWarnings,[],'Absent bundle/status produce no PHP warning, including suppressed warnings');
eq(CookieConsentBundleManager::asset($modx),'','No executable JS until installation builds it');
rejects(fn()=>CookieConsentBundleManager::rebuild(new BundleFixture($root,'web')),'bundle_forbidden');
rejects(fn()=>CookieConsentBundleManager::rebuild(new BundleFixture($root,'mgr',false)),'bundle_forbidden');
eq(is_file($file),false,'Public requests never create cache');
$modx->failVersion=true;
rejects(fn()=>CookieConsentBundleManager::install($modx),'bundle_version');
eq(is_file($file),false,'First failed setting save leaves no published cache');
eq($modx->getOption('cookie_consent.bundle_version',null,0),0,'Failed first build stays prebuilt');
$modx->failVersion=false;
$first=CookieConsentBundleManager::install($modx);eq($first['rebuilt'],true,'First installation warmup');eq($first['state'],'ready');
eq($first['version']>=time()-1&&$first['version']<=time(),true,'Version is a Unix timestamp generated after publication');
eq(json_decode(file_get_contents($root.'/settings.json'),true)['cookie_consent.bundle_version'],(string)$first['version'],'Timestamp saved in system setting');
eq($modx->cacheManager->refreshes,[['system_settings'=>[]]],'Only native settings partition refresh');
eq($modx->cacheManager->cleans[0]['cache_key'],'resource','HTML resource cache invalidated');
$old=file_get_contents($file);$url=CookieConsentBundleManager::asset($modx);$stat=stat($file);
$refreshes=count($modx->cacheManager->refreshes);
set_error_handler($captureOptional);$skipped=CookieConsentBundleManager::rebuild($modx);restore_error_handler();eq($optionalWarnings,[],'Unchanged build has no missing error-marker unlink warning');eq($skipped['rebuilt'],false,'Unchanged skip');eq($skipped['version'],$first['version'],'Skip preserves timestamp');eq(count($modx->cacheManager->refreshes),$refreshes,'Skip does not refresh cache');
clearstatcache(true,$file);eq(stat($file)['ino'],$stat['ino'],'Unchanged inode');eq(file_get_contents($file),$old);
// Regex, comments, division, template literals, optional chaining, nullish, ASI and UTF-8.
$syntax="\nwindow.__bundleSyntax=(()=>{const r=/[/*]/g;const q=12/3/2;const v={x:{y:0}};function asi(){return\n{wrong:true};}return [r.test('*'),q,`a\${v.x?.y ?? 9}b`,asi(), 'Привет'];})();\n";
file_put_contents($source,$original.$syntax);
$changed=CookieConsentBundleManager::rebuild($modx);eq($changed['rebuilt'],true,'Adapter edit');eq(CookieConsentBundleManager::asset($modx)!==$url,true,'Cache bust');
$good=file_get_contents($file);$meta=CookieConsentBundleManager::status($modx);
copy($file,$out.'/php-bundle.js');
file_put_contents($out.'/syntax-source.js',$syntax);
$forced=CookieConsentBundleManager::rebuild($modx,true);eq($forced['rebuilt'],true,'Force unchanged');eq($forced['version']>$changed['version'],true,'Immediate force rebuild advances the timestamp');
$good=file_get_contents($file);$meta=CookieConsentBundleManager::status($modx);
$modx->failVersion=true;$refreshes=count($modx->cacheManager->refreshes);
rejects(fn()=>CookieConsentBundleManager::rebuild($modx,true),'bundle_version');
eq(file_get_contents($file),$good,'DB save failure restores previous JS and fingerprint');
eq(CookieConsentBundleManager::status($modx)['version'],$meta['version'],'DB failure preserves active timestamp');
eq(count($modx->cacheManager->refreshes),$refreshes,'Failed version save does not invalidate caches');
$modx->failVersion=false;$modx->failCommit=true;
$stored=file_get_contents($root.'/settings.json');
rejects(fn()=>CookieConsentBundleManager::rebuild($modx,true),'bundle_version');
eq(file_get_contents($root.'/settings.json'),$stored,'Failed commit rolls back the persisted version');
eq(file_get_contents($file),$good,'Failed commit restores JS');
$modx->failCommit=false;
file_put_contents($source,$original."\nfunction { broken");
rejects(fn()=>CookieConsentBundleManager::rebuild($modx));eq(file_get_contents($file),$good,'Parse failure keeps bundle and success metadata');eq(CookieConsentBundleManager::status($modx)['built_at'],$meta['built_at']);eq(CookieConsentBundleManager::status($modx)['state'],'error');eq(CookieConsentBundleManager::status($modx)['version'],$meta['version'],'Syntax error preserves timestamp');
file_put_contents($source,$original.$syntax);
eq(CookieConsentBundleManager::rebuild($modx)['rebuilt'],false,'Repaired unchanged sources reuse last success');eq(CookieConsentBundleManager::status($modx)['state'],'ready');
$manifestPath=$root.'/core/components/cookieconsentmanager/frontend-manifest.json';$valid=file_get_contents($manifestPath);$bad=json_decode($valid,true);
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
unlink($file);
eq(CookieConsentBundleManager::asset($visitor),'js/cookie-consent/cached-cookie-consent.min.js?v='.$productionVersion,'Frontend does not track deletion of an active file');eq(is_file($file),false);
eq($visitor->queries,0,'Frontend never queries system settings');
unset($visitor->options['cookie_consent.bundle_version']);
eq(CookieConsentBundleManager::asset($visitor),'','No active version never selects a missing prebuilt');
$method=new ReflectionMethod(CookieConsentBundleManager::class,'asset');
$code=implode('',array_slice(file($method->getFileName()),$method->getStartLine()-1,$method->getEndLine()-$method->getStartLine()+1));
eq((bool)preg_match('/\\b(?:filemtime|file_get_contents|fopen|fgets|hash_file|is_file|metadata|manifest|time)\\s*\\(/',$code),false,'Frontend selection has no file, freshness or time operations');
putenv('PATH='.$oldPath);
$report=['result'=>'PASS','assertions'=>$n,'php'=>PHP_VERSION,'node_available_during_build'=>false,'php_bundle_bytes'=>filesize($out.'/php-bundle.js')];
file_put_contents($out.'/php.json',json_encode($report,JSON_PRETTY_PRINT)."\n");echo json_encode($report)."\n";
