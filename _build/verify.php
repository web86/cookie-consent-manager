<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli')exit(1);
$file=$argv[1]??'';$spec=json_decode(file_get_contents(str_replace('.transport.zip','.inventory.json',$file)),true,64,JSON_THROW_ON_ERROR);
if(!class_exists('ZipArchive')) {
    require ($argv[2]??'/opt/cc-private/core').'/xpdo/compression/pclzip.lib.php';
    class ZipArchive { public $numFiles=0;private $files=[];function open($f){$z=new PclZip($f);$this->files=$z->extract(PCLZIP_OPT_EXTRACT_AS_STRING);if(!is_array($this->files))return false;$this->numFiles=count($this->files);return true;}function getNameIndex($i){return $this->files[$i]['filename'];}function getFromIndex($i){return $this->files[$i]['content'];}function getFromName($n){foreach($this->files as $f)if($f['filename']===$n)return $f['content'];return false;} }
}
$zip=new ZipArchive();if($zip->open($file)!==true)throw new RuntimeException('ZIP');
$prefix=$spec['signature'].'/';$vehicles=0;$found=[];
for($i=0;$i<$zip->numFiles;$i++){
    $name=$zip->getNameIndex($i);if(strpos($name,$prefix)!==0||strpos($name,'../')!==false||$name[0]==='/')throw new RuntimeException('ZIP path');
    if(preg_match('~/(?:\.git|\.local|node_modules|tests|logs)/|\.(?:har|log|pem|env)$|(?:config\.php|audit-config\.json)$~',$name))throw new RuntimeException('Excluded content');
    $body=$zip->getFromIndex($i);
    if(preg_match('/gh[opusr]_[A-Za-z0-9]{20,}|-----BEGIN (?:RSA |EC )?PRIVATE KEY-----|"rate_limit_key"\s*:\s*"[^"]+"/',$body))throw new RuntimeException('Secret content');
    if(substr($name,-8)==='.vehicle'){
        $payload=(static function($bytes){return eval(substr($bytes,5));})($body);
        if(!is_array($payload)||($payload['vehicle_class']??'')!=='xPDOObjectVehicle')throw new RuntimeException('Native vehicle');
        if(($payload['update_object']??true)!==false||($payload['uninstall_object']??true)!==false)throw new RuntimeException('Unsafe object retention');
        $obj=json_decode($payload['object'],true,16,JSON_THROW_ON_ERROR);$vehicles++;
        if($payload['class']==='modSystemSetting'){
            $found[$obj['key']]=$obj['value'];
            if($obj['key']==='cookie_consent.services'){
                $registry=json_decode($obj['value'],true,16,JSON_THROW_ON_ERROR);foreach($registry['services'] as $s)if($s['enabled']!==false||isset($s['config']['id']))throw new RuntimeException('Fresh service unsafe');
            }
        }
    }
}
foreach(['cookie_consent.options','cookie_consent.services','cookie_consent.texts','cookie_consent.log_dir','cookie_consent.audit_config_file','cookie_consent.package_state_dir','cookie_consent.package_version'] as $key)if(!array_key_exists($key,$found))throw new RuntimeException('Setting vehicle missing');
if($found['cookie_consent.log_dir']!==''||$found['cookie_consent.audit_config_file']!==''||$found['cookie_consent.package_state_dir']!=='')throw new RuntimeException('Customer paths in ZIP');
foreach($spec['files'] as $entry){
    $matches=[];for($i=0;$i<$zip->numFiles;$i++){ $name=$zip->getNameIndex($i);if(substr($name,-strlen('/payload/'.$entry['source']))==='/payload/'.$entry['source'])$matches[]=$name; }
    if(count($matches)!==1||hash('sha256',$zip->getFromName($matches[0]))!==$entry['sha256'])throw new RuntimeException('Inventory/checksum mismatch');
}
$expected=trim(explode(' ',file_get_contents($file.'.sha256'))[0]);if(!hash_equals($expected,hash_file('sha256',$file)))throw new RuntimeException('Archive SHA256 mismatch');
echo json_encode(['signature'=>$spec['signature'],'native_vehicles'=>$vehicles,'runtime_files'=>count($spec['files']),'zip_entries'=>$zip->numFiles,'sha256'=>$expected,'result'=>'PASS'])."\n";
