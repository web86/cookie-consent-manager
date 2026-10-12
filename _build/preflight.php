<?php
// Native script vehicle only. No durable state or custom rollback.
if(($options[xPDOTransport::PACKAGE_ACTION]??0)===xPDOTransport::ACTION_UNINSTALL)return true;
try {
    $modx=$transport->xpdo;$version=$modx->getVersionData();
    if(version_compare(PHP_VERSION,'8.1.0','<')||version_compare($version['full_version'],'2.8.8','<')||version_compare($version['full_version'],'3.0.0','>='))throw new RuntimeException('PHP 8.1+ and MODX 2.8.8+ (not MODX 3) required');
    foreach(['dom','json','mbstring'] as $ext)if(!extension_loaded($ext))throw new RuntimeException('Required extension unavailable');
    $namespace=$modx->getObject('modNamespace',['name'=>'cookie_consent']);
    if($namespace&&$namespace->get('path')!==''&&rtrim($namespace->getCorePath(),'/')!==rtrim($modx->getOption('core_path'),'/').'/components/cookieconsent')throw new RuntimeException('Namespace path conflict');
    foreach($spec['files'] as $entry){
        [$kind,$relative]=explode('/',$entry['target'],2);$root=rtrim($modx->getOption($kind.'_path'),'/');if(realpath($root)!==$root)throw new RuntimeException('Canonical MODX paths required');
        $target=$root.'/'.$relative;if(is_link($target))throw new RuntimeException('Symlink runtime target refused');
        for($parent=dirname($target);!is_dir($parent);$parent=dirname($parent))if(is_link($parent))throw new RuntimeException('Symlink parent refused');
        if(realpath($parent)!==$parent||!is_writable($parent)||(is_file($target)&&!is_writable($target)))throw new RuntimeException('Runtime path not writable');
    }
    $modx->log(xPDO::LOG_LEVEL_WARN,'Existing settings/elements are retained. Compare versioned stock elements explicitly. Back up customized runtime files before native copying. Audit setup is in the CMP.');return true;
}catch(Throwable $e){try{$transport->xpdo->log(xPDO::LOG_LEVEL_ERROR,'Cookie Consent preflight refused: '.$e->getMessage());}catch(Throwable $ignored){}return false;}
