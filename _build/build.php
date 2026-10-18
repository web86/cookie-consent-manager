<?php
/** Real MODX 2 modPackageBuilder. Never read installed user config/elements into artifacts. */
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
$root=dirname(__DIR__);
// Fail if build-time guide outputs no longer match the single RU/EN source.
$guideManifest=json_decode(file_get_contents(__DIR__.'/user-guide-manifest.json'),true,8,JSON_THROW_ON_ERROR);
if(hash_file('sha256',__DIR__.'/user-guide.json')!==$guideManifest['source'])throw new RuntimeException('Run npm run build:guide');
foreach($guideManifest['outputs'] as $path=>$hash)if(hash_file('sha256',$root.'/'.$path)!==$hash)throw new RuntimeException('Stale guide output; run npm run build:guide');
$guide=json_decode(file_get_contents(__DIR__.'/user-guide.json'),true,16,JSON_THROW_ON_ERROR);
require_once $root.'/server/src/CookieConsentGuide.php';
foreach($guide['languages'] as $language=>$document)if(CookieConsentGuide::forLanguage($language)!==$document)throw new RuntimeException('Run npm run build:guide');
$site=$argv[1]??'';$out=$argv[2]??($root.'/.local/artifacts');$releaseIndex=isset($argv[3])?(int)$argv[3]:null;
if($site===''||$site[0]!=='/'||!is_file($site.'/index.php'))throw new RuntimeException('Usage: build.php /local/MODX-root /build/output [beta-index]');
$metadata=json_decode(file_get_contents(__DIR__.'/package.json'),true,8,JSON_THROW_ON_ERROR);
if($releaseIndex!==null)$metadata['release_index']=$releaseIndex;
if(!in_array($metadata['release'],['','beta','pl'],true)||($metadata['release']===''&&$metadata['release_index']!==0)||($metadata['release']!==''&&($metadata['release_index']<1||$metadata['release_index']>999)))throw new RuntimeException('Release metadata');
$release=$metadata['release']===''?'':$metadata['release'].$metadata['release_index'];
$versionRelease=$metadata['version'].($release===''?'':'-'.$release);
$signature=$metadata['name'].'-'.$versionRelease;
require_once $root.'/server/src/CookieConsentVersion.php';
if(CookieConsentVersion::VERSION!==$versionRelease)throw new RuntimeException('Stale package version; run node _build/version.mjs');
if(!is_dir($out)&&!mkdir($out,0700,true))throw new RuntimeException('Output path');
$work=$out.'/work-'.$signature;
if(is_dir($work)){throw new RuntimeException('Use a new output/work directory; previous build preserved');}
mkdir($work,0700,true);mkdir($work.'/payload',0700);
$payload=$work.'/payload';$files=[];
function addSource(string $source,string $target,array &$files,string $payload,string $root):void{
    if(!is_file($source)||is_link($source))throw new RuntimeException('Missing/symlink source');
    $relative=substr($source,strlen($root)+1);
    if(preg_match('~(?:^|/)(?:\.git|\.github|\.local|node_modules|tests|fixtures|debug|docs|mock|mocks|mok|config\.php|logs)(?:/|$)~',$relative)||preg_match('/\.(?:log|har|pem|env|map|md)$/',$relative))throw new RuntimeException('Excluded source');
    $to=$payload.'/'.$target;if(!is_dir(dirname($to)))mkdir(dirname($to),0700,true);copy($source,$to);
    $files[]=['source'=>$target,'target'=>$target,'sha256'=>hash_file('sha256',$source)];
}
// CI inputs remain pinned. Production JavaScript is built only on the installed site.
$frontend=json_decode(file_get_contents(__DIR__.'/frontend-manifest.json'),true,16,JSON_THROW_ON_ERROR);
if(($frontend['tool']??'')!=='esbuild'||($frontend['version']??'')!=='0.28.2')throw new RuntimeException('Run npm ci and npm run build:frontend');
foreach($frontend['inputs'] as $path=>$hash)if(hash_file('sha256',$root.'/'.$path)!==$hash)throw new RuntimeException('Stale frontend inputs; run npm run build:frontend');
foreach($frontend['outputs'] as $path=>$info)if(str_ends_with($path,'.css')&&hash_file('sha256',$root.'/'.$path)!==$info['sha256'])throw new RuntimeException('Frontend hash mismatch');
// Closed, reviewed runtime inventory: never recurse through source directories.
$runtime=json_decode(file_get_contents(__DIR__.'/transport-files.json'),true,16,JSON_THROW_ON_ERROR);
foreach(array_keys($frontend['inputs']) as $path)if(str_ends_with($path,'.js')){$target=str_starts_with($path,'assets/js/cookie-consent/services/')?'core/components/cookieconsentmanager/adapters/services/'.basename($path):$path;if(($runtime[$target]??null)!==$path)throw new RuntimeException('Bundle source missing from transport allowlist');}
if(isset($runtime['assets/js/cookie-consent/cookie-consent.min.js']))throw new RuntimeException('Prebuilt production JS must not be shipped');
foreach($runtime as $target=>$source){
    if(!is_string($source)||!preg_match('~^(?:assets/|core/components/cookieconsentmanager/)[a-zA-Z0-9_./-]+$~D',$target)||str_contains($target,'..')||str_contains($source,'..'))throw new RuntimeException('Transport allowlist path');
    addSource($root.'/'.$source,$target,$files,$payload,$root);
}
// HTTP access policy, including existing .htaccess files, belongs to the site owner.
usort($files,static fn($a,$b)=>strcmp($a['target'],$b['target']));
define('MODX_API_MODE',true);ob_start();require $site.'/index.php';while(ob_get_level())ob_end_clean();
$modx->setLogLevel(modX::LOG_LEVEL_ERROR);$modx->setLogTarget('ECHO');
require_once $root.'/server/src/CookieConsentSettings.php';
$definitions=[];
function definition(string $class,array $criteria,array $fields,string $key,array &$definitions):void{$definitions[$key]=['class'=>$class,'criteria'=>$criteria,'fields'=>$fields,'hash'=>hash('sha256',json_encode($fields))];}
definition('modNamespace',['name'=>'cookie_consent'],['name'=>'cookie_consent','path'=>'{core_path}components/cookieconsentmanager/','assets_path'=>'{assets_path}components/cookieconsentmanager/'],'namespace',$definitions);
$defaults=CookieConsentServiceRegistry::defaults();foreach($defaults['services'] as &$service){$config=(array)$service['config'];unset($config['id']);$service['config']=$config?:new stdClass();$service['enabled']=false;}unset($service);
$settings=[
 'cookie_consent.options'=>[json_encode(CookieConsentSettings::defaults()),'textarea'],
 'cookie_consent.services'=>[json_encode($defaults,JSON_UNESCAPED_UNICODE),'textarea'],
 'cookie_consent.texts'=>[json_encode(CookieConsentTexts::defaults(),JSON_UNESCAPED_UNICODE),'textarea'],
 'cookie_consent.log_dir'=>['','textfield'],'cookie_consent.audit_config_file'=>['','textfield'],'cookie_consent.audit'=>['','textarea'],
];
foreach($settings as $key=>[$value,$xtype])definition('modSystemSetting',['key'=>$key],['key'=>$key,'value'=>$value,'xtype'=>$xtype,'namespace'=>'cookie_consent','area'=>'consent'],$key,$definitions);
definition('modMenu',['text'=>'CookieConsentManager'],['text'=>'CookieConsentManager','parent'=>'components','namespace'=>'cookie_consent','action'=>'index','permissions'=>'cookie_consent_manage','description'=>'Cookie consent settings','icon'=>'','menuindex'=>0,'params'=>'','handler'=>''],'menu',$definitions);
// Native vehicle precedes elements; reuse the category without changing its metadata.
definition('modCategory',['category'=>'CookieConsentManager'],[],'category',$definitions);
definition('modChunk',['name'=>'CookiesPopup'],['snippet'=>file_get_contents($root.'/CookiesPopup.html')],'chunk',$definitions);
foreach(['CookieConsent'=>'modx2-consent-snippet.php','CookieConsentMap'=>'modx2-map-snippet.php','CookieConsentVideo'=>'modx2-video-snippet.php','CookieConsentAssets'=>'modx2-assets-snippet.php','CookieConsentBanner'=>'modx2-banner-snippet.php'] as $name=>$file) {
 definition('modSnippet',['name'=>$name],['snippet'=>trim(preg_replace('/^<\?php\s*/','',file_get_contents($root.'/server/'.$file)))],$name,$definitions);
}
$spec=['schema'=>1,'signature'=>$signature,'version_release'=>$versionRelease,'source_epoch'=>$metadata['source_epoch'],'files'=>$files,'objects'=>$definitions];
file_put_contents($work.'/source-inventory.json',json_encode($spec,JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES));
$prefix="<?php\n\$spec=".var_export($spec,true).";\n";
$preflight=$work.'/preflight.php';file_put_contents($preflight,$prefix.preg_replace('/^<\?php\s*/','',file_get_contents(__DIR__.'/preflight.php')));
$verify=$work.'/verify-install.php';file_put_contents($verify,$prefix.preg_replace('/^<\?php\s*/','',file_get_contents(__DIR__.'/verify-install.php')));
$canonical=$work.'/canonical-elements.php';file_put_contents($canonical,file_get_contents(__DIR__.'/validators/canonical-elements.php'));
$logDefault=$work.'/default-log-directory.php';file_put_contents($logDefault,file_get_contents(__DIR__.'/validators/default-log-directory.php'));
$adapt=$work.'/adapt-menu.php';file_put_contents($adapt,file_get_contents(__DIR__.'/adapt-menu.php'));
$modx->loadClass('transport.modPackageBuilder','',false,true);$builder=new modPackageBuilder($modx);$builder->directory=$work.'/native/';mkdir($builder->directory,0700);$builder->createPackage($metadata['name'],$metadata['version'],$release);
$ns=$modx->newObject('modNamespace');$ns->fromArray($definitions['namespace']['fields'],'',true,true);$builder->registerNamespace($ns,false,false);
// Standard script vehicle preflight; its return value propagates to native PM.
$start=$builder->createVehicle(['source'=>$preflight],['vehicle_class'=>'xPDOScriptVehicle','guid'=>md5('cookieconsentmanager/preflight'),xPDOTransport::ABORT_INSTALL_ON_VEHICLE_FAIL=>true]);if(!$builder->putVehicle($start))throw new RuntimeException('Preflight vehicle');
$objectNumber=1;
foreach($definitions as $name=>$def){
    $obj=$modx->newObject($def['class']);$obj->fromArray(array_merge($def['criteria'],$def['fields']),'',true,true);if(in_array($def['class'],['modSnippet','modChunk'],true))$obj->set('id',$objectNumber++);
    $attributes=[xPDOTransport::UNIQUE_KEY=>array_keys($def['criteria']),xPDOTransport::PRESERVE_KEYS=>!in_array($def['class'],['modSnippet','modChunk','modCategory'],true),xPDOTransport::UPDATE_OBJECT=>in_array($name,['chunk','CookieConsent','CookieConsentMap','CookieConsentVideo','CookieConsentAssets','CookieConsentBanner'],true),xPDOTransport::UNINSTALL_OBJECT=>false,xPDOTransport::ABORT_INSTALL_ON_VEHICLE_FAIL=>true,'guid'=>md5('cookieconsentmanager/'.$name)];
    $vehicle=$builder->createVehicle($obj,$attributes);if(in_array($name,['chunk','CookieConsent','CookieConsentMap','CookieConsentVideo','CookieConsentAssets','CookieConsentBanner'],true))$vehicle->validate('php',['source'=>$canonical]);if($name==='cookie_consent.log_dir')$vehicle->validate('php',['source'=>$logDefault]);if($name==='menu')$vehicle->validate('php',['source'=>$adapt]);
    if(!$builder->putVehicle($vehicle))throw new RuntimeException('Native object vehicle failed: '.$name);
}
// One exact file per native vehicle avoids recursive uninstall of untracked files.
foreach($files as $entry){
    [$kind,$relative]=explode('/',$entry['target'],2);$parent=dirname($relative);$target='return $transport->xpdo->getOption('.var_export($kind.'_path',true).').'.var_export(($parent==='.'?'':$parent.'/'),true).';';
    $vehicle=$builder->createVehicle(['source'=>$payload.'/'.$entry['source'],'target'=>$target],['vehicle_class'=>'xPDOFileVehicle','guid'=>md5('cookieconsentmanager/file/'.$entry['target']),'relative_target'=>$entry['target'],xPDOTransport::INSTALL_FILES=>true,xPDOTransport::UNINSTALL_FILES=>true,xPDOTransport::ABORT_INSTALL_ON_VEHICLE_FAIL=>true,'copy_preserve_filemtime'=>false]);
    if(!$builder->putVehicle($vehicle))throw new RuntimeException('Native file vehicle failed');
}
$end=$builder->createVehicle(['source'=>$verify],['vehicle_class'=>'xPDOScriptVehicle','guid'=>md5('cookieconsentmanager/verify'),xPDOTransport::ABORT_INSTALL_ON_VEHICLE_FAIL=>true]);if(!$builder->putVehicle($end))throw new RuntimeException('Verification vehicle');
$builder->setPackageAttributes(['readme'=>file_get_contents(__DIR__.'/package-readme.md'),'changelog'=>file_get_contents(__DIR__.'/changelog.md'),'license'=>'Refer to the repository owner for applicable licensing terms.','requires'=>['php'=>'>=8.1.0','modx'=>'>=2.8.4,<3.0.0'],'source_inventory_sha256'=>hash_file('sha256',$work.'/source-inventory.json')]);
if(!$builder->pack())throw new RuntimeException('modPackageBuilder pack failed');
copy($builder->directory.$signature.'.transport.zip',$out.'/'.$signature.'.transport.zip');
copy($work.'/source-inventory.json',$out.'/'.$signature.'.inventory.json');
echo $signature." built by native modPackageBuilder. Normalize ZIP metadata and verify before distribution.\n";
