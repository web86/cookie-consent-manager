<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli')exit(1);
$file=$argv[1]??'';$spec=json_decode(file_get_contents(str_replace('.transport.zip','.inventory.json',$file)),true,64,JSON_THROW_ON_ERROR);
if(!class_exists('ZipArchive')) {
    require ($argv[2]??'/opt/cc-private/core').'/xpdo/compression/pclzip.lib.php';
    class ZipArchive { public $numFiles=0;private $files=[];function open($f){$z=new PclZip($f);$this->files=$z->extract(PCLZIP_OPT_EXTRACT_AS_STRING);if(!is_array($this->files))return false;$this->numFiles=count($this->files);return true;}function getNameIndex($i){return $this->files[$i]['filename'];}function getFromIndex($i){return $this->files[$i]['content'];}function getFromName($n){foreach($this->files as $f)if($f['filename']===$n)return $f['content'];return false;} }
}
$zip=new ZipArchive();if($zip->open($file)!==true)throw new RuntimeException('ZIP');
$prefix=$spec['signature'].'/';$zipFiles=[];$expectedZip=[$prefix.'manifest.php'=>true];$vehicles=0;$found=[];$fileVehicles=[];$classes=[];$canonical=[];$categories=0;
for($i=0;$i<$zip->numFiles;$i++){
    $name=$zip->getNameIndex($i);if(str_ends_with($name,'/'))continue;$zipFiles[$name]=true;if(strpos($name,$prefix)!==0||strpos($name,'../')!==false||$name[0]==='/')throw new RuntimeException('ZIP path');
    if(preg_match('~/(?:\.git|\.github|\.local|node_modules|tests|fixtures|debug|logs|mock|mocks|mok)/|\.(?:har|log|pem|env|map)$|(?:config\.php|audit-config\.json)$~',$name))throw new RuntimeException('Excluded content');
    $body=$zip->getFromIndex($i);
    if(preg_match('/gh[opusr]_[A-Za-z0-9]{20,}|-----BEGIN (?:RSA |EC )?PRIVATE KEY-----|"rate_limit_key"\s*:\s*"[^"]+"/',$body))throw new RuntimeException('Secret content');
    if(substr($name,-12)==='manifest.php'&&strpos($body,'setup-options')!==false)throw new RuntimeException('Unexpected Setup Options');
    if(strpos($body,'CookieConsentPackageLifecycle')!==false||strpos($body,'cc_package_state_dir')!==false)throw new RuntimeException('Custom lifecycle infrastructure in ZIP');
    if(substr($name,-8)==='.vehicle'){
        $payload=(static function($bytes){return eval(substr($bytes,5));})($body);
        if(!is_array($payload)||!in_array($payload['vehicle_class']??'',['xPDOObjectVehicle','xPDOFileVehicle','xPDOScriptVehicle'],true))throw new RuntimeException('Native vehicle');
        $expectedZip[$name]=true;
        foreach(['resolve','validate'] as $kind)foreach($payload[$kind]??[] as $hook){
            $hook=json_decode($hook['body'],true,16,JSON_THROW_ON_ERROR);$expectedZip[$hook['source']]=true;
        }
        $vehicles++;$classes[$payload['vehicle_class']]=($classes[$payload['vehicle_class']]??0)+1;
        if($payload['vehicle_class']==='xPDOFileVehicle'){$target=$payload['relative_target'];if(isset($fileVehicles[$target]))throw new RuntimeException('Duplicate runtime target');$fileVehicles[$target]=$payload['object'];$expectedZip[$payload['object']['source'].$payload['object']['name']]=true;if(empty($payload['uninstall_files']))throw new RuntimeException('Native file uninstall missing');continue;}
        if($payload['vehicle_class']==='xPDOScriptVehicle'){$expectedZip[$payload['object']['source']]=true;continue;}
        $obj=json_decode($payload['object'],true,16,JSON_THROW_ON_ERROR);
        if(($payload['uninstall_object']??true)!==false)throw new RuntimeException('Object uninstall must retain data');
        $isElement=in_array($payload['class'],['modChunk','modSnippet'],true);
        if($isElement){
            $names=['CookiesPopup'=>'modChunk','CookieConsent'=>'modSnippet','CookieConsentMap'=>'modSnippet','CookieConsentVideo'=>'modSnippet','CookieConsentAssets'=>'modSnippet','CookieConsentBanner'=>'modSnippet'];
            if(!isset($names[$obj['name']??''])||$names[$obj['name']]!==$payload['class']||isset($canonical[$obj['name']])||($payload['update_object']??false)!==true||($payload['unique_key']??[])!==['name'])throw new RuntimeException('Canonical update/unique policy');
            $canonical[$obj['name']]=true;
        }elseif(($payload['update_object']??true)!==false)throw new RuntimeException('Non-element object must retain user values');
        if($payload['class']==='modCategory'){
            if($obj['category']!=='CookieConsentManager'||($payload['unique_key']??[])!==['category']||($payload['preserve_keys']??true)!==false||!empty($obj['id']))throw new RuntimeException('Native category policy');
            $categories++;
        }
        if($payload['class']==='modSystemSetting'){
            $found[$obj['key']]=$obj['value'];
            if($obj['key']==='cookie_consent.services'){
                $registry=json_decode($obj['value'],true,16,JSON_THROW_ON_ERROR);foreach($registry['services'] as $s)if($s['enabled']!==false||isset($s['config']['id']))throw new RuntimeException('Fresh service unsafe');
            }
        }
    }
}
if(count($canonical)!==6)throw new RuntimeException('Exactly six canonical elements required');
if($categories!==1)throw new RuntimeException('Exactly one native CookieConsentManager category vehicle required');
foreach(['cookie_consent.options','cookie_consent.services','cookie_consent.texts','cookie_consent.log_dir','cookie_consent.audit_config_file','cookie_consent.audit'] as $key)if(!array_key_exists($key,$found))throw new RuntimeException('Setting vehicle missing');
if($found['cookie_consent.log_dir']!==''||$found['cookie_consent.audit_config_file']!==''||$found['cookie_consent.audit']!=='')throw new RuntimeException('Customer paths in ZIP');
if(count($found)!==6)throw new RuntimeException('Only canonical product settings allowed');
foreach($spec['files'] as $entry){if(basename($entry['target'])==='.htaccess')throw new RuntimeException('Package must not manage administrator .htaccess');$object=$fileVehicles[$entry['target']]??null;if(!$object||hash('sha256',$zip->getFromName($object['source'].$object['name']))!==$entry['sha256'])throw new RuntimeException('Native file inventory mismatch');}
// Both the installed payload and every raw ZIP file must be accounted for.
$runtime=json_decode(file_get_contents(__DIR__.'/transport-files.json'),true,16,JSON_THROW_ON_ERROR);
if(isset($runtime['assets/js/cookie-consent/cookie-consent.min.js']))throw new RuntimeException('Prebuilt production JS in transport');
$frontend=json_decode(file_get_contents(__DIR__.'/frontend-manifest.json'),true,16,JSON_THROW_ON_ERROR);
foreach($runtime as $target=>$source)if(str_starts_with($target,'assets/js/cookie-consent/services/'))throw new RuntimeException('User adapter target in transport');
foreach($frontend['inputs'] as $source=>$hash)if(str_starts_with($source,'assets/js/cookie-consent/services/')&&($runtime['core/components/cookieconsentmanager/adapters/services/'.basename($source)]??null)!==$source)throw new RuntimeException('Missing private adapter original');
$targets=array_keys($runtime);$actual=array_keys($fileVehicles);sort($targets);sort($actual);
if($actual!==$targets||count($spec['files'])!==count($runtime))throw new RuntimeException('Transport allowlist mismatch');
$expectedNames=array_keys($expectedZip);$actualNames=array_keys($zipFiles);sort($expectedNames);sort($actualNames);
if($actualNames!==$expectedNames)throw new RuntimeException('Unexpected or missing ZIP content');
if(($classes['xPDOScriptVehicle']??0)!==2||($classes['xPDOObjectVehicle']??0)!==15)throw new RuntimeException('Native installation vehicles');
foreach($spec['files'] as $entry)if($entry['sha256']!==hash_file('sha256',dirname(__DIR__).'/'.$runtime[$entry['target']]))throw new RuntimeException('Transport source mismatch');
$expected=trim(explode(' ',file_get_contents($file.'.sha256'))[0]);if(!hash_equals($expected,hash_file('sha256',$file)))throw new RuntimeException('Archive SHA256 mismatch');
echo json_encode(['signature'=>$spec['signature'],'native_vehicles'=>$vehicles,'vehicle_classes'=>$classes,'runtime_files'=>count($spec['files']),'zip_entries'=>$zip->numFiles,'sha256'=>$expected,'result'=>'PASS'])."\n";
