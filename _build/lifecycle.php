<?php
// PHP 7.4-compatible preflight/resolver support. Called only by native MODX transport.
if (!class_exists('CookieConsentPackageLifecycle',false)) {
class CookieConsentPackageLifecycle
{
    public static function environment($php,$version) {
        return version_compare($php,'8.1.0','>=') && version_compare($version,'2.8.8','>=') && version_compare($version,'3.0.0','<');
    }
    private static function outside($path,$webroot) {
        return $path!==$webroot && strpos($path,$webroot.'/')!==0;
    }
    private static function canonical($path) {
        if (!is_string($path)||$path===''||$path[0]!=='/'||strpos($path,"\0")!==false||preg_match('~(?:^|/)\.\.?(/|$)~',$path)) throw new RuntimeException('An absolute canonical path is required');
        $real=realpath($path);
        if ($real!==rtrim($path,'/')) throw new RuntimeException('Missing or symlinked path');
        return $real;
    }
    public static function roots($modx) {
        return ['core'=>self::canonical(rtrim($modx->getOption('core_path'),'/')),'assets'=>self::canonical(rtrim($modx->getOption('assets_path'),'/')),'web'=>self::canonical(rtrim($modx->getOption('base_path'),'/'))];
    }
    private static function setting($modx,$key) {
        $row=$modx->getObject('modSystemSetting',['key'=>$key]);return $row ? (string)$row->get('value') : '';
    }
    public static function stateDirectory($modx,$options,$roots) {
        $stored=self::setting($modx,'cookie_consent.package_state_dir');
        $selected=isset($options['cc_package_state_dir']) ? trim((string)$options['cc_package_state_dir']) : '';
        if ($stored!=='' && $selected!=='' && rtrim($stored,'/')!==rtrim($selected,'/')) throw new RuntimeException('Existing package state path is preserved');
        $dir=$stored!==''?$stored:$selected;
        if ($dir==='') {
            if (!self::outside($roots['core'],$roots['web'])) throw new RuntimeException('A pre-created writable private package-state directory is required for public core hosting');
            $dir=$roots['core'].'/.cookieconsent-package';
        }
        if (!self::outside($dir,$roots['web'])) throw new RuntimeException('Package state must stay outside document root');
        if (is_dir($dir)) {self::canonical($dir);if(!is_writable($dir))throw new RuntimeException('Private package-state directory is not writable');}
        else {self::canonical(dirname($dir));if(!is_writable(dirname($dir))||is_link($dir))throw new RuntimeException('Private package-state parent is not writable');}
        return $dir;
    }
    public static function target($entry,$roots) {
        $relative=$entry['target'];
        if (!preg_match('~^(?:core|assets)/[a-zA-Z0-9_.\-/]+$~D',$relative)||strpos($relative,'..')!==false) throw new RuntimeException('Invalid file inventory');
        if(!preg_match('~^(?:core/components/cookieconsent/|assets/(?:components/cookieconsent/|js/cookie-consent/|css/cookie-consent\.css$))~D',$relative))throw new RuntimeException('File outside component ownership');
        list($kind,$path)=explode('/',$relative,2);
        $target=$roots[$kind].'/'.$path;
        for($parent=dirname($target);!is_dir($parent);$parent=dirname($parent)){if(is_link($parent))throw new RuntimeException('Symlink target parent');}
        self::canonical($parent);
        if(!is_writable($parent))throw new RuntimeException('Runtime destination is not writable');
        if(is_link($target)||(file_exists($target)&&(!is_file($target)||(stat($target)['nlink']??0)!==1||!is_writable($target))))throw new RuntimeException('Unsafe or readonly runtime file');
        return $target;
    }
    private static function loadState($dir) {
        $file=$dir.'/state.json';
        if(is_link($file))throw new RuntimeException('Symlink state');
        if(!is_file($file))return ['schema'=>1,'active'=>false,'files'=>[],'objects'=>[],'generation'=>0];
        $raw=file_get_contents($file);if($raw===false||strlen($raw)>262144)throw new RuntimeException('State size');
        $state=json_decode($raw,true);
        if(!is_array($state)||($state['schema']??0)!==1)throw new RuntimeException('Invalid package state');
        return $state;
    }
    private static function definitions($spec) { return $spec['objects']; }
    private static function lookup($modx,$definition) {
        $row=$modx->getObject($definition['class'],$definition['criteria']);
        // A customized menu label keeps its natural identity (namespace/action).
        if(!$row&&$definition['class']==='modMenu') {
            $rows=$modx->getCollection('modMenu',['namespace'=>'cookie_consent','action'=>'index']);
            if(count($rows)>1)throw new RuntimeException('Ambiguous existing CMP menus');
            if(count($rows)===1)$row=reset($rows);
        }
        return $row;
    }
    public static function abort($modx) {
        if(!empty($GLOBALS['cookieConsentPackageTransaction'])){$modx->rollBack();$GLOBALS['cookieConsentPackageTransaction']=false;$modx->cacheManager->refresh();}
    }
    private static function begin($modx) {
        if(!empty($GLOBALS['cookieConsentPackageTransaction']))return;
        if(!$modx->beginTransaction())throw new RuntimeException('Cannot start package transaction');
        $GLOBALS['cookieConsentPackageTransaction']=true;
        // Native MODX aborts a failed earlier vehicle before final activation.
        register_shutdown_function(static function() use ($modx){self::abort($modx);});
    }
    public static function preflight($modx,$spec,$options) {
        $action=$options[xPDOTransport::PACKAGE_ACTION]??xPDOTransport::ACTION_INSTALL;
        $roots=self::roots($modx);$dir=self::stateDirectory($modx,$options,$roots);$state=self::loadState($dir);
        if($action===xPDOTransport::ACTION_UNINSTALL) {
            if(!empty($state['active'])&&$state['signature']!==$spec['signature'])throw new RuntimeException('Uninstall the active version, not a superseded package');
            $GLOBALS['cookieConsentPackagePlan']=['roots'=>$roots,'dir'=>$dir,'state'=>$state,'before'=>[]];return true;
        }
        $version=$modx->getVersionData();
        if(!self::environment(PHP_VERSION,$version['full_version']))throw new RuntimeException('Cookie Consent requires PHP 8.1+ and MODX 2.8.8 (not MODX 3)');
        foreach(['dom','json','mbstring'] as $extension)if(!extension_loaded($extension))throw new RuntimeException('Required PHP extension is unavailable');
        $ns=$modx->getObject('modNamespace',['name'=>'cookie_consent']);
        if($ns) {
            $path=(string)$ns->get('path');
            if($path!==''&&rtrim(str_replace('{core_path}',$roots['core'].'/',$path),'/')!==$roots['core'].'/components/cookieconsent')throw new RuntimeException('Existing namespace path conflicts; no files changed');
        }
        foreach($spec['files'] as $entry) {
            $target=self::target($entry,$roots);
            if(is_file($target)) {
                $hash=hash_file('sha256',$target);$prior=$state['files'][$entry['target']]['installed_hash']??null;
                $known=array_merge([$entry['sha256']],$entry['manual_hashes']??[],$prior?[$prior]:[]);
                if(!in_array($hash,$known,true))throw new RuntimeException('Modified existing runtime file needs manual review: '.$entry['target']);
            }
        }
        // Atomic DB rollback requires transactional MODX object tables.
        if($modx->getOption('dbtype')!=='mysql')throw new RuntimeException('This beta requires MySQL/MariaDB with InnoDB object tables');
        foreach(array_unique(array_merge(array_column($spec['objects'],'class'),['modAccessPermission'])) as $class){
            $table=trim($modx->getTableName($class),'`');$query=$modx->prepare('SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?');
            if(!$query||!$query->execute([$table])||!in_array(strtolower((string)$query->fetchColumn()),['innodb','xtradb'],true))throw new RuntimeException('Transactional InnoDB object tables are required');
        }
        self::begin($modx);
        $before=[];
        foreach(self::definitions($spec) as $name=>$definition) {
            $row=self::lookup($modx,$definition);
            $before[$name]=$row?['exists'=>true,'id'=>$row->getPrimaryKey(),'hash'=>self::objectHash($row,$definition)]:['exists'=>false];
        }
        $GLOBALS['cookieConsentPackagePlan']=['roots'=>$roots,'dir'=>$dir,'state'=>$state,'before'=>$before];
        return true;
    }
    public static function objectHash($object,$definition) {
        $values=[];foreach($definition['fields'] as $key=>$value)$values[$key]=$object->get($key);
        return hash('sha256',json_encode($values));
    }
    private static function write($file,$bytes) {
        $parent=dirname($file);
        if(!is_dir($parent)&&!mkdir($parent,0700,true)&&!is_dir($parent))throw new RuntimeException('Cannot create private/runtime directory');
        if(is_link($file))throw new RuntimeException('Symlink write blocked');
        $temp=$file.'.cc-tmp-'.bin2hex(random_bytes(6));$mask=umask(0077);
        try{$handle=fopen($temp,'xb');}finally{umask($mask);}
        if(!$handle)throw new RuntimeException('Cannot open atomic output');
        try{$written=0;while($written<strlen($bytes)){$n=fwrite($handle,substr($bytes,$written));if(!$n)throw new RuntimeException('Partial package write');$written+=$n;}if(!fflush($handle))throw new RuntimeException('Cannot flush package output');}finally{fclose($handle);}
        if(!rename($temp,$file)){@unlink($temp);throw new RuntimeException('Cannot commit package file');}
        if(substr($file,-4)==='.php'&&function_exists('opcache_invalidate'))opcache_invalidate($file,true);
    }
    public static function elementValidator($modx,$object,$spec,$name) {
        $row=self::lookup($modx,$spec['objects'][$name]);
        if($row&&$spec['objects'][$name]['class']==='modMenu')$object->set('text',$row->get('text'));
        return true;
    }
    public static function resolve($modx,$spec,$options,$payload) {
        $action=$options[xPDOTransport::PACKAGE_ACTION]??xPDOTransport::ACTION_INSTALL;
        if(!isset($GLOBALS['cookieConsentPackagePlan']))self::preflight($modx,$spec,$options);
        $plan=$GLOBALS['cookieConsentPackagePlan'];
        $roots=$plan['roots'];$dir=$plan['dir'];$old=$plan['state'];
        if(!is_dir($dir)&&!mkdir($dir,0700,true)&&!is_dir($dir))throw new RuntimeException('Cannot create private package state');
        $lock=fopen($dir.'/lock','c+');if(!$lock||!flock($lock,LOCK_EX))throw new RuntimeException('Cannot lock package state');
        try {
            $current=self::loadState($dir);
            if(($current['generation']??0)!==($old['generation']??0))throw new RuntimeException('Concurrent package operation; retry');
            if($action===xPDOTransport::ACTION_UNINSTALL)return self::uninstall($modx,$spec,$plan,$lock);
            return self::install($modx,$spec,$plan,$options,$payload);
        } finally {flock($lock,LOCK_UN);fclose($lock);}
    }
    private static function install($modx,$spec,$plan,$options,$payload) {
        $dir=$plan['dir'];$roots=$plan['roots'];$old=$plan['state'];$state=$old;$state['schema']=1;
        $filesChanged=[];$objectChanged=[];$created=[];$stateWritten=false;
        try {
            // Vehicles already created only absent objects, never updated user values.
            foreach($spec['objects'] as $name=>$definition) {
                $row=self::lookup($modx,$definition);
                // Last chunk validator runs before native vehicle saves a missing chunk.
                if(!$row && $name==='chunk'){$row=$modx->newObject($definition['class']);$row->fromArray(array_merge($definition['criteria'],$definition['fields']),'',true,true);if(!$row->save())throw new RuntimeException('Cannot create final vehicle element');}
                if(!$row)throw new RuntimeException('Native object vehicle missing');
                $before=$plan['before'][$name];
                if(empty($before['exists']))$created[]=[$definition['class'],$row->getPrimaryKey()];
                if(!isset($state['objects'][$name]))$state['objects'][$name]=['preexisting'=>!empty($before['exists']),'id'=>$row->getPrimaryKey(),'hash'=>self::objectHash($row,$definition)];
                if(in_array($definition['class'],['modSnippet','modChunk'],true)) {
                    $hash=self::objectHash($row,$definition);
                    $known=array_merge([$definition['hash']],$definition['manual_hashes']??[],isset($old['objects'][$name]['installed_hash'])?[$old['objects'][$name]['installed_hash']]:[]);
                    if(in_array($hash,$known,true)) {
                        $objectChanged[]=[$row,$row->toArray()];foreach($definition['fields'] as $key=>$value)$row->set($key,$value);
                        if(!$row->save())throw new RuntimeException('Cannot update stock element');
                        $state['objects'][$name]['installed_hash']=self::objectHash($row,$definition);
                    } else {
                        $alternate=$definition['criteria']['name'].'_package_'.str_replace(['.','-'],'_',$spec['version_release']);
                        $alt=$modx->getObject($definition['class'],['name'=>$alternate]);
                        if(!$alt){$alt=$modx->newObject($definition['class']);$alt->set('name',$alternate);foreach($definition['fields'] as $key=>$value)$alt->set($key,$value);if(!$alt->save())throw new RuntimeException('Cannot create versioned stock element');$created[]=[$definition['class'],$alt->getPrimaryKey()];}
                        $state['element_conflicts'][$name]=$alternate;
                    }
                }
            }
            foreach($spec['files'] as $entry) {
                $source=$payload.'/'.$entry['source'];
                if(!is_file($source)||is_link($source)||hash_file('sha256',$source)!==$entry['sha256'])throw new RuntimeException('Payload checksum mismatch');
                $target=self::target($entry,$roots);$bytes=is_file($target)?file_get_contents($target):null;
                $filesChanged[]=[$target,$bytes,$bytes===null?null:(fileperms($target)&0777)];
                if(!isset($state['files'][$entry['target']])) {
                    $state['files'][$entry['target']]=['preexisting'=>$bytes!==null,'installed_hash'=>$entry['sha256']];
                    if($bytes!==null){$backup='originals/'.hash('sha256',$entry['target']).'.bin';self::write($dir.'/'.$backup,$bytes);$state['files'][$entry['target']]['original']=$backup;}
                }
                self::write($target,file_get_contents($source));chmod($target,0644);
                $state['files'][$entry['target']]['installed_hash']=$entry['sha256'];
            }
            // Definitions only; never grant a permission in Access Policy data.
            foreach($modx->getCollection('modAccessPolicyTemplate') as $template) {
                $permission=$modx->getObject('modAccessPermission',['template'=>$template->get('id'),'name'=>'cookie_consent_manage']);
                if(!$permission){$permission=$modx->newObject('modAccessPermission');$permission->fromArray(['template'=>$template->get('id'),'name'=>'cookie_consent_manage','description'=>'Manage Cookie Consent Manager','value'=>true]);if(!$permission->save())throw new RuntimeException('Cannot install permission definition');$created[]=['modAccessPermission',$permission->getPrimaryKey()];}
            }
            foreach(['cookie_consent.package_state_dir'=>$dir,'cookie_consent.package_version'=>$spec['signature']] as $key=>$value) {
                $s=$modx->getObject('modSystemSetting',['key'=>$key]);$objectChanged[]=[$s,$s->toArray()];$s->set('value',$value);if(!$s->save())throw new RuntimeException('Cannot set package marker');
            }
            $state['active']=true;$state['signature']=$spec['signature'];$state['generation']=($old['generation']??0)+1;
            $state['mode']=!empty($old['active'])?($old['signature']===$spec['signature']?'reinstall':'upgrade'):(($old['generation']??0)>0?'reinstall':(count(array_filter($plan['before'],static function($b){return !empty($b['exists']);}))?'manual_migration':'install'));
            self::write($dir.'/state.json',json_encode($state,JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES));
            $stateWritten=true;
            if(!$modx->commit())throw new RuntimeException('Cannot commit package transaction');
            $GLOBALS['cookieConsentPackageTransaction']=false;
            $modx->cacheManager->refresh();
            $modx->log(xPDO::LOG_LEVEL_INFO,'Cookie Consent installed: '.$state['mode'].'. Audit requires private configuration; templates were not changed.');return true;
        } catch(Exception $e) {
            if($stateWritten)self::write($dir.'/state.json',json_encode($old,JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES));
            foreach(array_reverse($filesChanged) as $change){if($change[1]===null){if(is_file($change[0]))unlink($change[0]);}else {self::write($change[0],$change[1]);chmod($change[0],$change[2]);}}
            foreach(array_reverse($objectChanged) as $change){$change[0]->fromArray($change[1],'',true,true);$change[0]->save();}
            foreach(array_reverse($created) as $change){$row=$modx->getObject($change[0],$change[1]);if($row)$row->remove();}
            self::abort($modx);$modx->cacheManager->refresh();throw $e;
        }
    }
    private static function uninstall($modx,$spec,$plan,$lock) {
        $state=$plan['state'];$dir=$plan['dir'];$roots=$plan['roots'];
        if(empty($state['active']))return true;
        // Validate all restore inputs before removing any active file.
        $changes=[];
        foreach($state['files'] as $relative=>$info) {
            $target=self::target(['target'=>$relative],$roots);
            if(!is_file($target)||hash_file('sha256',$target)!==$info['installed_hash'])continue;
            $replacement=null;
            if(!empty($info['preexisting'])) {
                if(($info['original']??'')!=='originals/'.hash('sha256',$relative).'.bin')throw new RuntimeException('Invalid manual backup identity');
                $backup=$dir.'/'.$info['original'];
                if(!is_file($backup)||is_link($backup))throw new RuntimeException('Missing or unsafe manual file backup');
                $replacement=file_get_contents($backup);
                if($replacement===false)throw new RuntimeException('Unreadable manual file backup');
            }
            $changes[]=[$target,file_get_contents($target),$replacement];
        }
        $done=[];
        try {
            foreach($changes as $change) {
                $done[]=$change;
                if($change[2]===null){if(!unlink($change[0]))throw new RuntimeException('Cannot remove runtime file');}
                else {self::write($change[0],$change[2]);chmod($change[0],0644);}
            }
        } catch(Exception $e) {
            foreach(array_reverse($done) as $change){self::write($change[0],$change[1]);chmod($change[0],0644);}
            throw $e;
        }
        if(isset($state['objects']['menu'])&&empty($state['objects']['menu']['preexisting'])) {
            $menu=$modx->getObject('modMenu',$state['objects']['menu']['id']);
            if($menu&&self::objectHash($menu,$spec['objects']['menu'])===$state['objects']['menu']['hash'])$menu->remove();
        }
        $state['active']=false;$state['generation']++;self::write($dir.'/state.json',json_encode($state,JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES));
        $modx->cacheManager->refresh();$modx->log(xPDO::LOG_LEVEL_INFO,'Cookie Consent uninstalled. User settings, translations, elements, namespace and private audit records retained.');return true;
    }
}
}
