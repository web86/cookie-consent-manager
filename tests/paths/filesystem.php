<?php
declare(strict_types=1);
// Real filesystem + actual preflight, adapter, builder and ownership code; MODX DB is a test double.
require_once __DIR__.'/../../server/src/CookieConsentPath.php';
require_once __DIR__.'/../../server/src/CookieConsentLogDirectory.php';
require_once __DIR__.'/../../server/src/CookieConsentBundleManager.php';
require_once __DIR__.'/../../server/src/CookieConsentAdapterInstall.php';
require_once __DIR__.'/../../_build/ownership.php';
class PathTestTransportConstants { const PACKAGE_ACTION='package_action', ACTION_INSTALL=0, ACTION_UPGRADE=1, ACTION_UNINSTALL=2; }
class_alias(PathTestTransportConstants::class,'xPDOTransport');
class_alias(PathTestTransportConstants::class,'xPDO\Transport\xPDOTransport');
class PathTestLog {const LOG_LEVEL_WARN=2,LOG_LEVEL_ERROR=3,LOG_LEVEL_INFO=1;}
foreach(['xPDO','modX','MODX\Revolution\modX','xPDO\xPDO'] as $alias)class_alias(PathTestLog::class,$alias);
$repo=dirname(__DIR__,2);$inventory=json_decode(file_get_contents($repo.'/_build/transport-files.json'),true,32,JSON_THROW_ON_ERROR);
$product=str_contains(array_key_first($inventory),'cookieconsentmanager3')?'cookieconsentmanager3':'cookieconsentmanager';
// Inventory ordering differs between branches, derive product from core target instead.
foreach(array_keys($inventory) as $path)if(preg_match('~^core/components/([^/]+)/~',$path,$m)){$product=$m[1];break;}
$is3=$product==='cookieconsentmanager3';$checks=0;$skips=[];
function check(bool $ok,string $message):void{global $checks;$checks++;if(!$ok)throw new RuntimeException($message);}
function refused(callable $fn,string $message):void{try{$fn();}catch(Throwable $e){check(true,$message);return;}throw new RuntimeException('Expected refusal: '.$message);}
function nativeSpelling(string $path):string{
    if(DIRECTORY_SEPARATOR!=='\\')return $path;
    $parts=explode('/',$path);$result=array_shift($parts);foreach($parts as $i=>$part)$result.=($i%2?'\\':'/').$part;
    return $result.'\\';
}
class PathTestRow {
    public string $_class='modSystemSetting';
    public function __construct(public array $fields=[],private $owner=null){}
    public function get($key){return $this->fields[$key]??null;}
    public function set($key,$value){$this->fields[$key]=$value;}
    public function fromArray($fields,...$unused){$this->fields=$fields;}
    public function save(){if($this->owner)$this->owner->rows[$this->fields['key']]=$this;return true;}
    public function remove(){if($this->owner)unset($this->owner->rows[$this->fields['key']]);return true;}
    public function getPrimaryKey(){return $this->fields['key']??'namespace';}
    public function toArray(){return $this->fields;}
    public function getCorePath(){return $this->fields['path'];}
    public function getAssetsPath(){return $this->fields['assets_path'];}
}
class PathTestModx {
    public array $rows=[],$messages=[];public $namespace=null,$cacheManager;
    public function __construct(public array $options,private bool $is3){$this->cacheManager=new class{function refresh(...$a){}function clean(...$a){}};}
    function getOption($key,$unused=null,$default=null){return $this->options[$key]??$default;}
    function setOption($key,$v){$this->options[$key]=$v;}
    function getVersionData(){return ['full_version'=>$this->is3?'3.2.4':'2.8.8'];}
    function getObject($class,$criteria){if(str_ends_with($class,'modNamespace'))return $this->namespace;if(str_ends_with($class,'modSystemSetting'))return $this->rows[is_array($criteria)?$criteria['key']:$criteria]??null;return null;}
    function getCount(...$a){return 0;}
    function getCollection(...$a){return [];}
    function newObject($class){return new PathTestRow([],$this);}
    function beginTransaction(){return true;}function commit(){return true;}function rollBack(){}
    function log($level,$message){$this->messages[]=$message;}
}
class PathTestTransport {
    public array $_preserved=[];
    function __construct(public $xpdo,public string $path,public string $signature){}
    function loadPreserved(){return $this->_preserved;}function writePreserved(){return true;}
}
$root=realpath(sys_get_temp_dir()).'/cc-paths-'.bin2hex(random_bytes(6));mkdir($root);
function cleanup(string $path):void{
    if(is_link($path)){if(DIRECTORY_SEPARATOR==='\\'&&is_dir($path))rmdir($path);else unlink($path);return;}
    if(is_dir($path)){foreach(scandir($path) as $name)if($name!=='.'&&$name!=='..')cleanup($path.'/'.$name);rmdir($path);}elseif(file_exists($path))unlink($path);
}
try{
    foreach(['public_html','private-core','external-assets','logs','backup'] as $dir)mkdir($root.'/'.$dir);
    $web=$root.'/public_html';$core=$root.'/private-core';$assets=$root.'/external-assets';
    if(!CookieConsentPath::canonical($core)){for($p=CookieConsentPath::spelling($core);; $p=CookieConsentPath::parent($p)){echo json_encode(['path'=>$p,'real'=>realpath($p),'link'=>is_link($p),'readlink'=>@readlink($p)]).PHP_EOL;if(CookieConsentPath::isRoot($p))break;}}
    check(CookieConsentPath::canonical($core),'existing canonical directory');
    check(CookieConsentPath::canonical(nativeSpelling($core)),'mixed separators accepted on Windows');
    check(!CookieConsentPath::canonical($core.'/../private-core'),'traversal refused');
    check(!CookieConsentPath::canonical($core.'/./'),'dot refused');
    refused(fn()=>CookieConsentBundleManager::atomic($core.'/../../escape','bad'),'write traversal');
    check(!CookieConsentPath::canonical($root.'/missing'),'missing refused');
    check(CookieConsentPath::parentDirectory($core.'/missing/deep/file')===CookieConsentPath::spelling($core),'nearest existing directory');
    check(!CookieConsentPath::inside($core,$web),'relocated core outside webroot');
    check(!CookieConsentPath::inside($root.'/logs',$root.'/log'),'prefix collision');
    check(CookieConsentLogDirectory::validate(nativeSpelling($root.'/logs'),$web)===realpath($root.'/logs'),'log path');
    refused(fn()=>CookieConsentPrivatePath::directory($web,$web),'private webroot');
    refused(fn()=>CookieConsentLogDirectory::input('../logs',$web,'site'),'relative traversal');
    if(DIRECTORY_SEPARATOR==='\\'){
        check(CookieConsentPath::spelling('c:\\data/more')==='C:/data/more','drive letter');
        check(CookieConsentPath::parent('C:/')==='C:/','drive root terminates');
        check(CookieConsentPath::parent('C:/data')==='C:/','drive immediate parent');
        check(CookieConsentPath::parent('//server/share/')==='//server/share/','UNC root terminates');
        check(CookieConsentPath::spelling('\\\\server\\share\\folder')==='//server/share/folder','UNC spelling');
        foreach(['C:relative','/root-relative','\\\\?\\C:\\data','C:/data/file:stream','C:/data/space.','C:/data/NUL'] as $bad)refused(fn()=>CookieConsentPath::spelling($bad),'Windows alias '.$bad);
        $unc=getenv('CC_TEST_UNC_DIRECTORY');if($unc)check(CookieConsentPath::canonical($unc),'real UNC share');else $skips[]='No real UNC share configured';
    }else{
        mkdir($root.'/back\\slash');check(CookieConsentPath::canonical($root.'/back\\slash'),'Unix literal backslash');
        check(!CookieConsentPath::canonical(str_replace('/','\\',$core)),'Unix backslash not separator');
        check(!CookieConsentPath::canonical('C:/Windows'),'Unix drive syntax not absolute');
    }
    file_put_contents($root.'/sentinel','unchanged');
    if(@symlink($core,$root.'/alias')){
        check(!CookieConsentPath::canonical($root.'/alias'),'directory symlink refused');
        check(!CookieConsentPath::canonical($root.'/alias/child'),'symlink ancestor refused');
        refused(fn()=>CookieConsentBundleManager::atomic($root.'/alias/output','bad'),'write through symlink');
        if(DIRECTORY_SEPARATOR==='\\')rmdir($root.'/alias');else unlink($root.'/alias');
    }else $skips[]='Directory symlink privilege unavailable';
    if(DIRECTORY_SEPARATOR==='\\'){
        $junction=$root.'/junction';
        exec('cmd /c mklink /J '.escapeshellarg(str_replace('/','\\',$junction)).' '.escapeshellarg(str_replace('/','\\',$core)).' 2>&1',$out,$code);
        check($code===0,'junction fixture creation');
        try{check(!CookieConsentPath::canonical($junction),'junction refused');refused(fn()=>CookieConsentPath::parentDirectory($junction.'/missing/file'),'junction ancestor refused');}finally{rmdir($junction);}
    }
    if(@link($root.'/sentinel',$root.'/hard')){
        check(!CookieConsentPath::regular($root.'/hard'),'hardlink refused');
        refused(fn()=>CookieConsentBundleManager::atomic($root.'/hard','bad'),'hardlink replacement refused');unlink($root.'/hard');
    }else $skips[]='Hardlink unavailable';
    mkdir($root.'/locked');
    if(DIRECTORY_SEPARATOR==='\\'){exec('icacls '.escapeshellarg(str_replace('/','\\',$root.'/locked')).' /deny '.escapeshellarg('*S-1-1-0:(W)').' 2>&1',$acl,$aclCode);check($aclCode===0,'deny write ACL');}
    if(DIRECTORY_SEPARATOR!=='\\')chmod($root.'/locked',0500);clearstatcache();
    if(DIRECTORY_SEPARATOR==='\\'||!is_writable($root.'/locked'))refused(fn()=>CookieConsentBundleManager::atomic($root.'/locked/test','bad'),'unwritable directory');else $skips[]='chmod does not remove write access for this user; ACL probe required on Windows';
    if(DIRECTORY_SEPARATOR==='\\'){exec('icacls '.escapeshellarg(str_replace('/','\\',$root.'/locked')).' /remove:d *S-1-1-0 2>&1',$acl,$aclCode);check($aclCode===0,'restore write ACL');}
    chmod($root.'/locked',0700);
    $modx=new PathTestModx(['core_path'=>nativeSpelling($core),'assets_path'=>nativeSpelling($assets),'base_path'=>nativeSpelling($web)],$is3);
    $transport=new PathTestTransport($modx,$root.'/backup/',$product.'-test');mkdir($transport->path.$transport->signature);
    $spec=['signature'=>$transport->signature,'objects'=>[],'files'=>[]];
    foreach($inventory as $target=>$source)$spec['files'][]=['target'=>$target,'sha256'=>hash_file('sha256',$repo.'/'.$source)];
    $options=['package_action'=>0];
    $runPreflight=function()use($repo,$transport,$spec,&$options){return include $repo.'/_build/preflight.php';};
    $passed=$runPreflight();check($passed===true,'fresh preflight: '.implode(';',$modx->messages));
    foreach($inventory as $target=>$source){[$kind,$relative]=explode('/',$target,2);$to=($kind==='core'?$core:$assets).'/'.$relative;if(!is_dir(dirname($to)))mkdir(dirname($to),0755,true);check(copy($repo.'/'.$source,$to),'native inventory file copy '.$target);}
    // Actual parser, adapter and atomic file publication; cached setting saved via DB double.
    $build=fn()=>CookieConsentBundleManager::install($modx,fn()=>CookieConsentAdapterInstall::synchronize($modx));
    check($build()['state']==='ready','bundle built');
    $bundle=$assets.'/components/'.$product.'/js/cookie-consent/cached-cookie-consent.min.js';
    check(CookieConsentPath::regular($bundle),'bundle regular');
    check((int)$modx->rows['cookie_consent.bundle_version']->get('value')>0,'setting saved after build');
    $settings='user-settings-retained';$modx->setOption('cookie_consent.options',$settings);
    $modx->namespace=new PathTestRow(['path'=>nativeSpelling($core.'/components/'.$product),'assets_path'=>nativeSpelling($assets.'/components/'.$product)]);
    $service=$assets.'/components/'.$product.'/js/cookie-consent/services/yandex.js';file_put_contents($service,"\n// user edit\n",FILE_APPEND);$custom=hash_file('sha256',$service);
    $options=['package_action'=>1];check($runPreflight()===true,'upgrade preflight');check($build()['state']==='ready','upgrade build');
    check(hash_file('sha256',$service)===$custom,'custom adapter retained');check($modx->getOption('cookie_consent.options')===$settings,'settings retained');
    CookieConsentTransportOwnership::record($transport,$spec);
    check(CookieConsentTransportOwnership::start($transport,$spec),'ownership uninstall start');
    foreach($spec['files'] as $entry){if(CookieConsentTransportOwnership::fileEnabled($modx,$entry['target'])){[$kind,$relative]=explode('/',$entry['target'],2);unlink(($kind==='core'?$core:$assets).'/'.$relative);}}
    check(CookieConsentTransportOwnership::finish($transport,$spec),'ownership uninstall finish: '.implode(';',$modx->messages));
    check(!file_exists($bundle),'generated bundle removed');check(is_file($service),'modified adapter retained on uninstall');check(is_dir($root.'/logs'),'logs retained');
    check(file_get_contents($root.'/sentinel')==='unchanged','sentinel unchanged');
    echo json_encode(['suite'=>'paths + filesystem lifecycle (MODX DB double)','os'=>PHP_OS_FAMILY,'php'=>PHP_VERSION,'product'=>$product,'assertions'=>$checks,'skips'=>$skips,'result'=>'PASS'],JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES)."\n";
}finally{cleanup($root);}
