<?php
// Native preflight checks only this product before any file copy. No rollback claims.
if(($options[xPDOTransport::PACKAGE_ACTION]??0)===xPDOTransport::ACTION_UNINSTALL)return CookieConsentTransportOwnership::finish($transport,$spec);
try {
    $modx=$transport->xpdo;$version=$modx->getVersionData();
    if(version_compare(PHP_VERSION,'8.1.0','<')||version_compare($version['full_version'],'2.8.4','<')||version_compare($version['full_version'],'3.0.0','>='))throw new RuntimeException('PHP 8.1+ and MODX 2.8.4+ (not MODX 3) required');
    foreach(['dom','json','mbstring'] as $ext)if(!extension_loaded($ext))throw new RuntimeException('Required extension unavailable');
    $namespace=$modx->getObject('modNamespace',['name'=>'cookie_consent']);
    $base=rtrim($modx->getOption('core_path'),'/').'/components/';
    $core=$base.'cookieconsentmanager/';
    $existing=$namespace?rtrim($namespace->getCorePath(),'/').'/':null;
    if($namespace&&$existing!==$core)throw new RuntimeException('Namespace path conflict');
    $assets=rtrim($modx->getOption('assets_path'),'/').'/components/cookieconsentmanager/';
    if($namespace&&$namespace->get('assets_path')&&rtrim($namespace->getAssetsPath(),'/').'/'!==$assets)throw new RuntimeException('Namespace assets path conflict');
    $manifestPath=$core.'frontend-manifest.json';
    $previous=is_file($manifestPath)&&!is_link($manifestPath)&&realpath($manifestPath)===$manifestPath?json_decode((string)file_get_contents($manifestPath),true):null;
    $owned=$namespace&&is_array($previous)&&($previous['tool']??null)==='esbuild'&&is_array($previous['inputs']??null)&&(isset($previous['inputs']['assets/components/cookieconsentmanager/js/cookie-consent/consent-manager.js'])||isset($previous['inputs']['assets/js/cookie-consent/consent-manager.js']));
    // A namespace can survive an interrupted native install. It is neither proof
    // of ownership nor a conflict by itself: without a manifest, require no data.
    if(!$owned){
        foreach(['modChunk'=>['CookiesPopup'],'modSnippet'=>['CookieConsent','CookieConsentMap','CookieConsentVideo','CookieConsentAssets','CookieConsentBanner'],'modPlugin'=>['CookieConsentCacheBuild']] as $class=>$names)foreach($names as $name)if($modx->getCount($class,['name'=>$name]))throw new RuntimeException('Unowned canonical element conflict: '.$name);
        $settingKeys=[];foreach($spec['objects'] as $definition)if($definition['class']==='modSystemSetting')$settingKeys[]=$definition['criteria']['key'];
        if($modx->getCount('modSystemSetting',['namespace'=>'cookie_consent','OR:key:IN'=>$settingKeys])||$modx->getCount('modMenu',['namespace'=>'cookie_consent','OR:text:='=>'CookieConsentManager']))throw new RuntimeException('Unowned cookie_consent objects');
        foreach([$core,$assets] as $directory){
            $directory=rtrim($directory,'/');
            if(is_link($directory)||(file_exists($directory)&&!is_dir($directory)))throw new RuntimeException('Occupied component path; inspect before retry');
            if(!is_dir($directory))continue;
            foreach(new RecursiveIteratorIterator(new RecursiveDirectoryIterator($directory,FilesystemIterator::SKIP_DOTS),RecursiveIteratorIterator::SELF_FIRST) as $file){
                if($file->isLink())throw new RuntimeException('Unowned component symlink; inspect before retry');
                if($file->isDir())continue;
                // A refused/contended preflight may leave only this empty lock.
                if($file->getPathname()===rtrim($modx->getOption('assets_path'),'/').'/components/cookieconsentmanager/js/cookie-consent/cookie-consent.build.lock'&&$file->isFile()&&$file->getSize()===0)continue;
                throw new RuntimeException('Unowned component files; inspect before retry');
            }
        }
    }
    if($modx->getCount('modPlugin',['name'=>'CookieConsentCacheBuild'])>1||$modx->getCount('modMenu',['namespace'=>'cookie_consent','action'=>'index'])>1)throw new RuntimeException('Duplicate administrative objects');
    foreach(['modChunk'=>['CookiesPopup'],'modSnippet'=>['CookieConsent','CookieConsentMap','CookieConsentVideo','CookieConsentAssets','CookieConsentBanner']] as $class=>$names)foreach($names as $name)if($modx->getCount($class,['name'=>$name])>1)throw new RuntimeException('Duplicate canonical element names; resolve before installing');
    $backup=$transport->path.$transport->signature;
    if(!is_dir($backup)||!is_writable($backup))throw new RuntimeException('Native package backup directory not writable');
    $preserved=$backup.'/preserved.php';clearstatcache(true,$preserved);if(is_link($preserved)||(file_exists($preserved)&&(!is_file($preserved)||!is_writable($preserved)||(stat($preserved)['nlink']??0)!==1)))throw new RuntimeException('Native preserved backup is unsafe/unwritable');
    foreach($spec['files'] as $entry){
        [$kind,$relative]=explode('/',$entry['target'],2);$root=rtrim($modx->getOption($kind.'_path'),'/');if(realpath($root)!==$root)throw new RuntimeException('Canonical MODX paths required');
        $target=$root.'/'.$relative;if(is_link($target))throw new RuntimeException('Symlink runtime target refused');
        if(!$owned&&file_exists($target))throw new RuntimeException('Occupied runtime target; inspect before retry');
        for($parent=dirname($target);!is_dir($parent);$parent=dirname($parent))if(is_link($parent))throw new RuntimeException('Symlink parent refused');
        if(realpath($parent)!==$parent||!is_writable($parent)||(is_file($target)&&!is_writable($target)))throw new RuntimeException('Runtime path not writable');
    }
    CookieConsentTransportOwnership::prepare($transport,$spec);
    $modx->setOption('cookie_consent.install_snapshot',['fresh'=>!$owned&&!is_file($manifestPath),'manifest'=>$owned?$previous:null]);
    // This generated checksum file is deliberately absent from native file vehicles.
    $state=$core.'adapter-checksums.json';
    if(is_link($state)||(file_exists($state)&&(!is_file($state)||!is_writable($state)||(stat($state)['nlink']??0)!==1)))throw new RuntimeException('adapter_state');
    $dir=rtrim($modx->getOption('assets_path'),'/').'/components/cookieconsentmanager/js/cookie-consent';
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
    $legacyDir=rtrim($modx->getOption('assets_path'),'/').'/js/cookie-consent';
    if($owned && is_dir($legacyDir)){
        if(realpath($legacyDir)!==$legacyDir)throw new RuntimeException('adapter_path');
        $legacyFile=$legacyDir.'/cookie-consent.build.lock';
        if(is_link($legacyFile)||(file_exists($legacyFile)&&(!is_file($legacyFile)||(stat($legacyFile)['nlink']??0)!==1)))throw new RuntimeException('bundle_directory');
        $legacyLock=@fopen($legacyFile,'c');
        if(!$legacyLock||!flock($legacyLock,LOCK_EX|LOCK_NB))throw new RuntimeException('bundle_busy');
        $modx->setOption('cookie_consent.legacy_lock',$legacyLock);
    }
    $modx->log(xPDO::LOG_LEVEL_WARN,'WARNING: CookiesPopup, CookieConsent, CookieConsentMap, CookieConsentVideo, CookieConsentAssets and CookieConsentBanner CODE WILL BE REPLACED; IDs and user metadata retained. Back up DB, static source files and runtime before installation. Native preserved.php is not a permanent backup and is replaced on reinstall. Settings/translations/services/logs and templates/resources are retained.');return true;
}catch(Throwable $e){try{$transport->xpdo->log(xPDO::LOG_LEVEL_ERROR,'Cookie Consent preflight refused: '.$e->getMessage());}catch(Throwable $ignored){}return false;}
