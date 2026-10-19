<?php
declare(strict_types=1);
require_once __DIR__.'/../../server/src/CookieConsentBundleManager.php';
require_once __DIR__.'/../../server/src/CookieConsentAdapterInstall.php';
$out=dirname(__DIR__,2).'/.local/adapter-updates';if(!is_dir($out))mkdir($out,0755,true);
$root=$out.'/unit-'.bin2hex(random_bytes(5));mkdir($root,0755,true);
final class AdapterFixture {
    public array $options=[];public array $logs=[];
    public function __construct(public string $root){mkdir($root.'/core/components/cookieconsentmanager/adapters/services',0755,true);mkdir($root.'/assets/components/cookieconsentmanager/js/cookie-consent/services',0755,true);}
    public function getOption($key,$unused=null,$default=null){return match($key){'core_path'=>$this->root.'/core/','assets_path'=>$this->root.'/assets/',default=>$this->options[$key]??$default};}
    public function log($level,$message){$this->logs[]=$message;}
}
if(!class_exists('modX')){class modX {const LOG_LEVEL_WARN=2;}}
$n=0;function eq($a,$b,$message=''){global $n;$n++;if($a!==$b)throw new RuntimeException($message.' '.json_encode([$a,$b]));}
function rejects($fn,$reason){global $n;try{$fn();}catch(Throwable $e){eq($e->getMessage(),$reason);return;}throw new RuntimeException('Expected '.$reason);}
function dirFor($m){return $m->root.'/assets/components/cookieconsentmanager/js/cookie-consent/services/';}
function manifest($files,$version){$inputs=[];foreach($files as $name=>$body)$inputs['assets/components/cookieconsentmanager/js/cookie-consent/services/'.$name]=hash('sha256',$body);return ['tool'=>'esbuild','package_version'=>$version,'inputs'=>$inputs];}
function originals($m,$files,$version){$core=$m->root.'/core/components/cookieconsentmanager/';foreach($files as $name=>$body)file_put_contents($core.'adapters/services/'.$name,$body);file_put_contents($core.'frontend-manifest.json',json_encode(manifest($files,$version)));}
function state($m){return json_decode(file_get_contents($m->root.'/core/components/cookieconsentmanager/adapter-checksums.json'),true);}
$old=['google-common.js'=>'window.common=1;','google-ga4.js'=>'window.ga4=1;','yandex.js'=>'window.yandex=1;','deleted.js'=>'window.deleted=1;'];
$next=['google-common.js'=>'window.common=2;','google-ga4.js'=>'window.ga4=2;','yandex.js'=>'window.yandex=2;','deleted.js'=>'window.deleted=2;','added.js'=>'window.added=2;','occupied.js'=>'window.occupied=2;'];
$m=new AdapterFixture($root.'/upgrade');foreach($old as $name=>$body)file_put_contents(dirFor($m).$name,$body);
$userCommon='window.common="FTP change";';$userGa4='window.ga4="SSH change";';
file_put_contents(dirFor($m).'google-common.js',$userCommon);file_put_contents(dirFor($m).'google-ga4.js',$userGa4);unlink(dirFor($m).'deleted.js');
file_put_contents(dirFor($m).'user-only.js','window.extra="must not execute";');file_put_contents(dirFor($m).'occupied.js','window.occupied="user";');
foreach(['google-common.js','google-ga4.js','yandex.js'] as $name)touch(dirFor($m).$name,1000000000);
file_put_contents($m->root.'/core/components/cookieconsentmanager/adapter-checksums.json',json_encode(['schema'=>1,'current'=>'1.0.6','versions'=>['1.0.6'=>manifest($old,'1.0.6')['inputs']]]));
originals($m,$next,'1.0.7-beta1');$report=CookieConsentAdapterInstall::synchronize($m);
eq(file_get_contents(dirFor($m).'google-common.js'),$userCommon,'Shared helper retained by SHA, regardless of timestamp');eq(file_get_contents(dirFor($m).'google-ga4.js'),$userGa4);
eq(file_get_contents(dirFor($m).'yandex.js'),$next['yandex.js'],'Unmodified updated');eq(is_file(dirFor($m).'deleted.js'),false,'Deletion is user intent');
eq(file_get_contents(dirFor($m).'added.js'),$next['added.js']);eq(file_get_contents(dirFor($m).'occupied.js'),'window.occupied="user";');eq(file_get_contents(dirFor($m).'user-only.js'),'window.extra="must not execute";');
eq($report['conflicts'],['google-common.js','google-ga4.js']);eq($report['deleted'],['deleted.js']);eq($report['unknown'],['occupied.js']);eq(CookieConsentAdapterInstall::preserved($m),4);eq(count($m->logs),1);
$before=[];foreach($next as $name=>$unused)if(is_file(dirFor($m).$name))$before[$name]=file_get_contents(dirFor($m).$name);
CookieConsentAdapterInstall::synchronize($m);foreach($before as $name=>$bytes)eq(file_get_contents(dirFor($m).$name),$bytes,'Reinstall');eq(is_file(dirFor($m).'deleted.js'),false);
eq(array_keys(state($m)['versions']),['1.0.6','1.0.7-beta1']);
$later=$next;$later['yandex.js']='window.yandex=3;';$later['google-common.js']='window.common=3;';
$m->options['cookie_consent.install_snapshot']=['manifest'=>manifest($next,'1.0.7-beta1'),'version'=>'1.0.7-beta1'];originals($m,$later,'1.0.7-beta2');CookieConsentAdapterInstall::synchronize($m);
eq(file_get_contents(dirFor($m).'yandex.js'),$later['yandex.js']);eq(file_get_contents(dirFor($m).'google-common.js'),$userCommon);eq(file_get_contents(dirFor($m).'google-ga4.js'),$userGa4);eq(is_file(dirFor($m).'deleted.js'),false);eq(count(state($m)['versions']),3);
$removed=$later;unset($removed['deleted.js']);originals($m,$removed,'1.0.7-beta3');CookieConsentAdapterInstall::synchronize($m);originals($m,$later,'1.0.7-beta4');CookieConsentAdapterInstall::synchronize($m);eq(is_file(dirFor($m).'deleted.js'),false,'Historical deletion survives removal/reintroduction');eq(count(state($m)['versions']),5);
originals($m,$next,'1.0.7-beta4');rejects(fn()=>CookieConsentAdapterInstall::synchronize($m),'adapter_version_collision');
$fresh=new AdapterFixture($root.'/fresh');$fresh->options['cookie_consent.install_snapshot']=['fresh'=>true];originals($fresh,$old,'1.0.7-beta1');CookieConsentAdapterInstall::synchronize($fresh);foreach($old as $name=>$bytes)eq(file_get_contents(dirFor($fresh).$name),$bytes);eq(count(state($fresh)['versions']),1);
$unknown=new AdapterFixture($root.'/unknown');file_put_contents(dirFor($unknown).'yandex.js','user');originals($unknown,$old,'1.0.7-beta1');$unknown->options['cookie_consent.install_snapshot']=['manifest'=>['inputs'=>['bad'=>'invalid']],'fresh'=>false];CookieConsentAdapterInstall::synchronize($unknown);eq(file_get_contents(dirFor($unknown).'yandex.js'),'user');eq(is_file(dirFor($unknown).'deleted.js'),false,'Unknown origin does not restore potentially deleted input');
$corrupt=new AdapterFixture($root.'/corrupt');$corrupt->options['cookie_consent.install_snapshot']=['fresh'=>true];originals($corrupt,$old,'1.0.7-beta1');file_put_contents($corrupt->root.'/core/components/cookieconsentmanager/adapters/services/yandex.js','tampered');rejects(fn()=>CookieConsentAdapterInstall::synchronize($corrupt),'adapter_integrity');eq(scandir(dirFor($corrupt)),['.','..'],'All originals verified before first public copy');
$unsafe=new AdapterFixture($root.'/unsafe');$unsafe->options['cookie_consent.install_snapshot']=['fresh'=>true];originals($unsafe,$old,'1.0.7-beta1');file_put_contents($unsafe->root.'/outside','outside');symlink($unsafe->root.'/outside',dirFor($unsafe).'google-common.js');rejects(fn()=>CookieConsentAdapterInstall::synchronize($unsafe),'adapter_path');eq(file_get_contents($unsafe->root.'/outside'),'outside');unlink(dirFor($unsafe).'google-common.js');link($unsafe->root.'/outside',dirFor($unsafe).'google-common.js');rejects(fn()=>CookieConsentAdapterInstall::synchronize($unsafe),'adapter_path');
$atomic=$root.'/atomic.js';file_put_contents($atomic,'user');eq(CookieConsentBundleManager::atomic($atomic,'new',hash('sha256','old')),false);eq(file_get_contents($atomic),'user');eq(CookieConsentBundleManager::atomic($atomic,'new',false),false);eq(file_get_contents($atomic),'user');eq(CookieConsentBundleManager::atomic($root.'/new.js','new',false),true);
$stateFile=$fresh->root.'/core/components/cookieconsentmanager/adapter-checksums.json';$before=file_get_contents(dirFor($fresh).'yandex.js');file_put_contents($stateFile,'not json');try{CookieConsentAdapterInstall::synchronize($fresh);throw new RuntimeException('Expected failure');}catch(JsonException $e){$n++;}eq(file_get_contents(dirFor($fresh).'yandex.js'),$before);
// Legacy layout, historical SHA keys and extra user adapters are preserved on relocation.
$moved=new AdapterFixture($root.'/relocation');originals($moved,$old,'1.0.8-pl6');
$legacy=$moved->root.'/assets/js/cookie-consent/services/';mkdir($legacy,0755,true);
$legacyHashes=[];foreach($old as $name=>$bytes){file_put_contents($legacy.$name,$bytes);$legacyHashes['assets/js/cookie-consent/services/'.$name]=hash('sha256',$bytes);}
file_put_contents($legacy.'google-ga4.js','customer-change');file_put_contents($legacy.'customer-extra.js','extra');unlink($legacy.'deleted.js');
$oldBundle='// CookieConsentBundle '.json_encode(['fingerprint'=>str_repeat('a',64)])."\nwindow.old=true;\n";file_put_contents(dirname($legacy).'/cached-cookie-consent.min.js',$oldBundle);
file_put_contents($moved->root.'/core/components/cookieconsentmanager/adapter-checksums.json',json_encode(['schema'=>1,'current'=>'1.0.8-pl5','versions'=>['1.0.8-pl5'=>$legacyHashes]]));
CookieConsentAdapterInstall::synchronize($moved);
eq(file_get_contents(dirFor($moved).'google-ga4.js'),'customer-change');eq(file_get_contents(dirFor($moved).'customer-extra.js'),'extra');eq(is_file(dirFor($moved).'deleted.js'),false);
eq(file_get_contents(dirname(dirFor($moved)).'/cached-cookie-consent.min.js'),$oldBundle,'Old working bundle survives relocation before parsing');eq(is_file($legacy.'google-ga4.js'),false,'No repeated adapter copies');
CookieConsentAdapterInstall::synchronize($moved);eq(file_get_contents(dirFor($moved).'google-ga4.js'),'customer-change');eq(count(state($moved)['versions']),2);
// A migration conflict must retain both user versions and publish the working fallback first.
$conflict=new AdapterFixture($root.'/migration-conflict');originals($conflict,$old,'1.0.8-pl7');$legacy=$conflict->root.'/assets/js/cookie-consent/services/';mkdir($legacy,0755,true);file_put_contents($legacy.'google-common.js','old-user');file_put_contents(dirFor($conflict).'google-common.js','new-user');file_put_contents(dirname($legacy).'/cached-cookie-consent.min.js',$oldBundle);
file_put_contents($conflict->root.'/core/components/cookieconsentmanager/adapter-checksums.json',json_encode(['schema'=>1,'current'=>'1.0.8-pl5','versions'=>['1.0.8-pl5'=>$legacyHashes]]));
rejects(fn()=>CookieConsentAdapterInstall::synchronize($conflict),'adapter_migration_conflict');eq(file_get_contents(dirFor($conflict).'google-common.js'),'new-user');eq(file_get_contents($legacy.'google-common.js'),'old-user');eq(file_get_contents(dirname(dirFor($conflict)).'/cached-cookie-consent.min.js'),$oldBundle,'Fallback exists even when migration refuses a conflict');
// A fresh install must never clean shared files belonging to a different installation.
$foreign=new AdapterFixture($root.'/fresh-foreign');$foreign->options['cookie_consent.install_snapshot']=['fresh'=>true];originals($foreign,$old,'1.0.8-pl7');CookieConsentAdapterInstall::synchronize($foreign);$legacy=$foreign->root.'/assets/js/cookie-consent/';mkdir($legacy,0755,true);file_put_contents($legacy.'runtime.js','foreign');CookieConsentAdapterInstall::cleanupLegacy($foreign);eq(file_get_contents($legacy.'runtime.js'),'foreign');
$result=['result'=>'PASS','assertions'=>$n,'php'=>PHP_VERSION];file_put_contents($out.'/php.json',json_encode($result,JSON_PRETTY_PRINT)."\n");echo json_encode($result)."\n";
