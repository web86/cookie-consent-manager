<?php
/** Real MODX 2 modPackageBuilder. Never read installed user config/elements into artifacts. */
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
$root=dirname(__DIR__);$site=$argv[1]??'';$out=$argv[2]??($root.'/.local/artifacts');$releaseIndex=isset($argv[3])?(int)$argv[3]:null;
if($site===''||$site[0]!=='/'||!is_file($site.'/index.php'))throw new RuntimeException('Usage: build.php /local/MODX-root /build/output [beta-index]');
$metadata=json_decode(file_get_contents(__DIR__.'/package.json'),true,8,JSON_THROW_ON_ERROR);
if($releaseIndex!==null)$metadata['release_index']=$releaseIndex;
if($metadata['release_index']<1||$metadata['release_index']>999)throw new RuntimeException('Release index');
$signature=$metadata['name'].'-'.$metadata['version'].'-'.$metadata['release'].$metadata['release_index'];
if(!is_dir($out)&&!mkdir($out,0700,true))throw new RuntimeException('Output path');
$work=$out.'/work-'.$signature;
if(is_dir($work)){throw new RuntimeException('Use a new output/work directory; previous build preserved');}
mkdir($work,0700,true);mkdir($work.'/payload',0700);
$payload=$work.'/payload';$files=[];
function addSource(string $source,string $target,array &$files,string $payload,string $root):void{
    if(!is_file($source)||is_link($source))throw new RuntimeException('Missing/symlink source');
    $relative=substr($source,strlen($root)+1);
    if(preg_match('~(?:^|/)(?:\.git|\.local|node_modules|tests|config\.php|logs)(?:/|$)~',$relative)||preg_match('/\.(?:log|har|pem|env)$/',$relative))throw new RuntimeException('Excluded source');
    $to=$payload.'/'.$target;if(!is_dir(dirname($to)))mkdir(dirname($to),0700,true);copy($source,$to);
    $files[]=['source'=>$target,'target'=>$target,'sha256'=>hash_file('sha256',$source)];
}
$coreParts=['src','public','controllers','templates','processors','lexicon','bin'];
foreach($coreParts as $part){
    $paths=[];foreach(new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root.'/server/'.$part,FilesystemIterator::SKIP_DOTS)) as $entry)if($entry->isFile())$paths[]=$entry->getPathname();sort($paths);
    foreach($paths as $source){if($part==='bin'&&basename($source)==='install-modx2.php')continue;addSource($source,'core/components/cookieconsent/'.$part.'/'.substr($source,strlen($root.'/server/'.$part.'/')),$files,$payload,$root);}
}
foreach(['manager.js','manager.css'] as $name)addSource($root.'/assets/components/cookieconsent/'.$name,'assets/components/cookieconsent/'.$name,$files,$payload,$root);
addSource($root.'/server/modx2-manager-connector.php','assets/components/cookieconsent/connector.php',$files,$payload,$root);
addSource($root.'/server/modx2-public-endpoint.example.php','assets/components/cookieconsent/audit.php',$files,$payload,$root);
foreach(['consent-manager.js','provider-registry.js','i18n.js','lexicons.json'] as $name)addSource($root.'/assets/js/cookie-consent/'.$name,'assets/js/cookie-consent/'.$name,$files,$payload,$root);
$paths=[];foreach(new DirectoryIterator($root.'/assets/js/cookie-consent/mock') as $entry)if($entry->isFile())$paths[]=$entry->getPathname();sort($paths);foreach($paths as $source)addSource($source,'assets/js/cookie-consent/mock/'.basename($source),$files,$payload,$root);
addSource($root.'/assets/css/cookie-consent.css','assets/css/cookie-consent.css',$files,$payload,$root);
// Deny direct HTTP access to code/staged payload on Apache; nginx must protect core separately.
$guard=$work.'/guard.htaccess';file_put_contents($guard,"<IfModule mod_authz_core.c>\nRequire all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\nDeny from all\n</IfModule>\n");
$guardTarget='core/components/cookieconsent/.htaccess';if(!is_dir($payload.'/core/components/cookieconsent'))mkdir($payload.'/core/components/cookieconsent',0700,true);copy($guard,$payload.'/'.$guardTarget);$files[]=['source'=>$guardTarget,'target'=>$guardTarget,'sha256'=>hash_file('sha256',$guard)];
usort($files,static fn($a,$b)=>strcmp($a['target'],$b['target']));
define('MODX_API_MODE',true);ob_start();require $site.'/index.php';while(ob_get_level())ob_end_clean();
$modx->setLogLevel(modX::LOG_LEVEL_ERROR);$modx->setLogTarget('ECHO');
require_once $root.'/server/src/CookieConsentSettings.php';
$definitions=[];
function definition(string $class,array $criteria,array $fields,string $key,array &$definitions):void{$definitions[$key]=['class'=>$class,'criteria'=>$criteria,'fields'=>$fields,'hash'=>hash('sha256',json_encode($fields))];}
definition('modNamespace',['name'=>'cookie_consent'],['name'=>'cookie_consent','path'=>'{core_path}components/cookieconsent/','assets_path'=>'{assets_path}components/cookieconsent/'],'namespace',$definitions);
$defaults=CookieConsentServiceRegistry::defaults();foreach($defaults['services'] as &$service){$config=(array)$service['config'];unset($config['id']);$service['config']=$config?:new stdClass();$service['enabled']=false;}unset($service);
$settings=[
 'cookie_consent.options'=>[json_encode(CookieConsentSettings::defaults()),'textarea'],
 'cookie_consent.services'=>[json_encode($defaults,JSON_UNESCAPED_UNICODE),'textarea'],
 'cookie_consent.texts'=>[json_encode(CookieConsentTexts::defaults(),JSON_UNESCAPED_UNICODE),'textarea'],
 'cookie_consent.log_dir'=>['','textfield'],'cookie_consent.audit_config_file'=>['','textfield'],'cookie_consent.audit'=>['','textarea'],
];
foreach($settings as $key=>[$value,$xtype])definition('modSystemSetting',['key'=>$key],['key'=>$key,'value'=>$value,'xtype'=>$xtype,'namespace'=>'cookie_consent','area'=>'consent'],$key,$definitions);
definition('modMenu',['text'=>'Cookie Consent Manager'],['text'=>'Cookie Consent Manager','parent'=>'components','namespace'=>'cookie_consent','action'=>'index','permissions'=>'cookie_consent_manage','description'=>'Cookie consent settings','icon'=>'','menuindex'=>0,'params'=>'','handler'=>''],'menu',$definitions);
$snippet=preg_replace('/^<\?php\s*/','',file_get_contents($root.'/server/modx2-registry-snippet.php'));
definition('modSnippet',['name'=>'CookieConsentRegistry'],['snippet'=>trim($snippet)],'snippet',$definitions);
definition('modChunk',['name'=>'CookiesPopup'],['snippet'=>file_get_contents($root.'/CookiesPopup.html')],'chunk',$definitions);
foreach(['CookieConsent'=>'modx2-consent-snippet.php','CookieConsentMap'=>'modx2-map-snippet.php'] as $name=>$file) {
 definition('modSnippet',['name'=>$name],['snippet'=>trim(preg_replace('/^<\?php\s*/','',file_get_contents($root.'/server/'.$file)))],$name,$definitions);
}
foreach(['snippet','chunk','CookieConsent','CookieConsentMap'] as $name){$def=$definitions[$name];$def['criteria']['name'].='_package_'.str_replace(['.','-'],'_',$metadata['version'].'-'.$metadata['release'].$metadata['release_index']);$definitions[$name.'_stock']=$def;}
$spec=['schema'=>1,'signature'=>$signature,'version_release'=>$metadata['version'].'-'.$metadata['release'].$metadata['release_index'],'source_epoch'=>$metadata['source_epoch'],'files'=>$files,'objects'=>$definitions];
file_put_contents($work.'/source-inventory.json',json_encode($spec,JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES));
$prefix="<?php\n\$spec=".var_export($spec,true).";\n";
$preflight=$work.'/preflight.php';file_put_contents($preflight,$prefix.preg_replace('/^<\?php\s*/','',file_get_contents(__DIR__.'/preflight.php')));
$verify=$work.'/verify-install.php';file_put_contents($verify,$prefix.preg_replace('/^<\?php\s*/','',file_get_contents(__DIR__.'/verify-install.php')));
$adapt=$work.'/adapt-menu.php';file_put_contents($adapt,file_get_contents(__DIR__.'/adapt-menu.php'));
$modx->loadClass('transport.modPackageBuilder','',false,true);$builder=new modPackageBuilder($modx);$builder->directory=$work.'/native/';mkdir($builder->directory,0700);$builder->createPackage($metadata['name'],$metadata['version'],$metadata['release'].$metadata['release_index']);
$ns=$modx->newObject('modNamespace');$ns->fromArray($definitions['namespace']['fields'],'',true,true);$builder->registerNamespace($ns,false,false);
// Standard script vehicle preflight; its return value propagates to native PM.
$start=$builder->createVehicle(['source'=>$preflight],['vehicle_class'=>'xPDOScriptVehicle','guid'=>md5('cookieconsent/preflight'),xPDOTransport::ABORT_INSTALL_ON_VEHICLE_FAIL=>true]);if(!$builder->putVehicle($start))throw new RuntimeException('Preflight vehicle');
$objectNumber=1;
foreach($definitions as $name=>$def){
    $obj=$modx->newObject($def['class']);$obj->fromArray(array_merge($def['criteria'],$def['fields']),'',true,true);if(in_array($def['class'],['modSnippet','modChunk'],true))$obj->set('id',$objectNumber++);
    $attributes=[xPDOTransport::UNIQUE_KEY=>array_keys($def['criteria']),xPDOTransport::PRESERVE_KEYS=>!in_array($def['class'],['modSnippet','modChunk'],true),xPDOTransport::UPDATE_OBJECT=>false,xPDOTransport::UNINSTALL_OBJECT=>false,xPDOTransport::ABORT_INSTALL_ON_VEHICLE_FAIL=>true,'guid'=>md5('cookieconsent/'.$name)];
    $vehicle=$builder->createVehicle($obj,$attributes);if($name==='menu')$vehicle->validate('php',['source'=>$adapt]);
    if(!$builder->putVehicle($vehicle))throw new RuntimeException('Native object vehicle failed: '.$name);
}
// One exact file per native vehicle avoids recursive uninstall of untracked files.
foreach($files as $entry){
    [$kind,$relative]=explode('/',$entry['target'],2);$parent=dirname($relative);$target='return $transport->xpdo->getOption('.var_export($kind.'_path',true).').'.var_export(($parent==='.'?'':$parent.'/'),true).';';
    $vehicle=$builder->createVehicle(['source'=>$payload.'/'.$entry['source'],'target'=>$target],['vehicle_class'=>'xPDOFileVehicle','guid'=>md5('cookieconsent/file/'.$entry['target']),'relative_target'=>$entry['target'],xPDOTransport::INSTALL_FILES=>true,xPDOTransport::UNINSTALL_FILES=>true,xPDOTransport::ABORT_INSTALL_ON_VEHICLE_FAIL=>true,'copy_preserve_filemtime'=>false]);
    if(!$builder->putVehicle($vehicle))throw new RuntimeException('Native file vehicle failed');
}
$end=$builder->createVehicle(['source'=>$verify],['vehicle_class'=>'xPDOScriptVehicle','guid'=>md5('cookieconsent/verify'),xPDOTransport::ABORT_INSTALL_ON_VEHICLE_FAIL=>true]);if(!$builder->putVehicle($end))throw new RuntimeException('Verification vehicle');
$builder->setPackageAttributes(['readme'=>file_get_contents(__DIR__.'/package-readme.md'),'changelog'=>file_get_contents(__DIR__.'/changelog.md'),'license'=>'Private beta. Refer to the repository owner for applicable licensing terms.','requires'=>['php'=>'>=8.1.0','modx'=>'>=2.8.8,<3.0.0'],'source_inventory_sha256'=>hash_file('sha256',$work.'/source-inventory.json')]);
if(!$builder->pack())throw new RuntimeException('modPackageBuilder pack failed');
copy($builder->directory.$signature.'.transport.zip',$out.'/'.$signature.'.transport.zip');
copy($work.'/source-inventory.json',$out.'/'.$signature.'.inventory.json');
echo $signature." built by native modPackageBuilder. Normalize ZIP metadata and verify before distribution.\n";
