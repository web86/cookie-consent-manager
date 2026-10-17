<?php
// First native vehicle captures old checksums before copies. No rollback claim.
if(($options[\xPDO\Transport\xPDOTransport::PACKAGE_ACTION]??0)===\xPDO\Transport\xPDOTransport::ACTION_UNINSTALL)return true;
try {
    $modx=$transport->xpdo;$version=$modx->getVersionData();
    if(version_compare(PHP_VERSION,'8.1.0','<')||version_compare($version['full_version'],'3.1.2','<')||version_compare($version['full_version'],'3.3.0','>='))throw new RuntimeException('PHP 8.1+ and MODX 3.1.2+ below 3.3 required');
    foreach(['dom','json','mbstring'] as $ext)if(!extension_loaded($ext))throw new RuntimeException('Required extension unavailable');
    $namespace=$modx->getObject('MODX\Revolution\modNamespace',['name'=>'cookie_consent']);
    if($namespace&&$namespace->get('path')!==''&&rtrim($namespace->getCorePath(),'/')!==rtrim($modx->getOption('core_path'),'/').'/components/cookieconsent')throw new RuntimeException('Namespace path conflict');
    foreach(['MODX\Revolution\modChunk'=>['CookiesPopup'],'MODX\Revolution\modSnippet'=>['CookieConsent','CookieConsentMap','CookieConsentVideo','CookieConsentAssets','CookieConsentBanner']] as $class=>$names)foreach($names as $name)if($modx->getCount($class,['name'=>$name])>1)throw new RuntimeException('Duplicate canonical element names; resolve before installing');
    $backup=$transport->path.$transport->signature;
    if(!is_dir($backup)||!is_writable($backup))throw new RuntimeException('Native package backup directory not writable');
    $preserved=$backup.'/preserved.php';clearstatcache(true,$preserved);if(is_link($preserved)||(file_exists($preserved)&&(!is_file($preserved)||!is_writable($preserved)||(stat($preserved)['nlink']??0)!==1)))throw new RuntimeException('Native preserved backup is unsafe/unwritable');
    foreach($spec['files'] as $entry){
        [$kind,$relative]=explode('/',$entry['target'],2);$root=rtrim($modx->getOption($kind.'_path'),'/');if(realpath($root)!==$root)throw new RuntimeException('Canonical MODX paths required');
        $target=$root.'/'.$relative;if(is_link($target))throw new RuntimeException('Symlink runtime target refused');
        for($parent=dirname($target);!is_dir($parent);$parent=dirname($parent))if(is_link($parent))throw new RuntimeException('Symlink parent refused');
        if(realpath($parent)!==$parent||!is_writable($parent)||(is_file($target)&&!is_writable($target)))throw new RuntimeException('Runtime path not writable');
    }
    $core=rtrim($modx->getOption('core_path'),'/').'/components/cookieconsent/';
    $manifestPath=$core.'frontend-manifest.json';
    $previous=is_file($manifestPath)&&!is_link($manifestPath)?json_decode((string)file_get_contents($manifestPath),true):null;
    $oldVersion='legacy';
    if(is_file($core.'src/CookieConsentVersion.php')&&preg_match("/const VERSION = '([a-zA-Z0-9.-]+)'/",(string)file_get_contents($core.'src/CookieConsentVersion.php'),$match))$oldVersion=$match[1];
    $modx->setOption('cookie_consent.install_snapshot',['manifest'=>is_array($previous)?$previous:[],'version'=>$oldVersion,'fresh'=>!$namespace&&!is_file($manifestPath)]);
    // This generated checksum file is deliberately absent from native file vehicles.
    $state=$core.'adapter-checksums.json';
    if(is_link($state)||(file_exists($state)&&(!is_file($state)||!is_writable($state)||(stat($state)['nlink']??0)!==1)))throw new RuntimeException('adapter_state');
    $dir=rtrim($modx->getOption('assets_path'),'/').'/js/cookie-consent';
    if(!is_dir($dir)&&!@mkdir($dir,0755,true))throw new RuntimeException('bundle_directory');
    if(realpath($dir)!==$dir||!is_writable($dir))throw new RuntimeException('bundle_directory');
    $services=$dir.'/services';
    if(is_link($services)||(is_dir($services)&&(realpath($services)!==$services||!is_writable($services))))throw new RuntimeException('adapter_directory');
    foreach(['cached-cookie-consent.min.js','cookie-consent.last-error.json','cookie-consent.build.lock'] as $name){$file=$dir.'/'.$name;if(is_link($file)||(file_exists($file)&&(!is_file($file)||(stat($file)['nlink']??0)!==1)))throw new RuntimeException('bundle_directory');}
    // Probe actual writes, and serialize file vehicles/synchronization with Manager builds.
    $probe=tempnam($dir,'.cc-preflight-');if(!$probe||dirname($probe)!==$dir)throw new RuntimeException('bundle_directory');
    try{if(file_put_contents($probe,'write-check')!==11||!chmod($probe,0644))throw new RuntimeException('bundle_directory');}finally{if(is_file($probe))unlink($probe);}
    $installLock=@fopen($dir.'/cookie-consent.build.lock','c');
    if(!$installLock||!flock($installLock,LOCK_EX|LOCK_NB)){if(is_resource($installLock))fclose($installLock);throw new RuntimeException('bundle_busy');}
    $modx->setOption('cookie_consent.install_lock',$installLock);
    $modx->log(\xPDO\xPDO::LOG_LEVEL_WARN,'WARNING: CookiesPopup, CookieConsent, CookieConsentMap, CookieConsentVideo, CookieConsentAssets and CookieConsentBanner CODE WILL BE REPLACED; IDs and user metadata retained. Back up DB, static source files and runtime before installation. Native preserved.php is not a permanent backup and is replaced on reinstall. Settings/translations/services/logs and templates/resources are retained.');return true;
}catch(Throwable $e){try{$transport->xpdo->log(\xPDO\xPDO::LOG_LEVEL_ERROR,'Cookie Consent preflight refused: '.$e->getMessage());}catch(Throwable $ignored){}return false;}
