<?php
// Embedded in native script vehicles: never depends on removable runtime files.
if(!class_exists('CookieConsentTransportOwnership',false)){
final class CookieConsentTransportOwnership
{
    private const KEY='cookie_consent.transport_ownership';
    private static function cls(string $name):string{return $name;}
    private static function warn($m,string $message):void{$m->log(xPDO::LOG_LEVEL_WARN,'CookieConsentManager uninstall: '.$message);}
    private static function path($m,string $target):string{[$kind,$relative]=explode('/',$target,2);return rtrim($m->getOption($kind.'_path'),'/').'/'.$relative;}
    private static function regular(string $file):bool{return !is_link($file)&&is_file($file)&&realpath($file)===$file&&(stat($file)['nlink']??0)===1;}
    private static function identity($row):array{return $row?['class'=>$row->_class,'pk'=>$row->getPrimaryKey(),'fields'=>array_intersect_key($row->toArray(),array_flip(['name','key','text','namespace','action','path','assets_path','category','template','description']))]:[];}
    private static function same($row,array $id):bool{
        if(!$row||$row->getPrimaryKey()!=$id['pk'])return false;
        foreach($id['fields'] as $key=>$value){if(in_array($key,['description','category'],true))continue;if($row->get($key)!=$value)return false;}return true;
    }
    public static function prepare($t,array $spec):void{
        $m=$t->xpdo;$previous=$t->loadPreserved()[self::KEY]??null;
        if(!is_array($previous)||!empty($previous['done'])){
            $previous=null;$legacy=null;
            foreach($m->getCollection(self::cls('transport.modTransportPackage'),['package_name'=>explode('-',$spec['signature'])[0]]) as $p){
                if(!$p->get('installed')||$p->get('signature')===$spec['signature'])continue;
                $old=$p->getTransport();$saved=$old?$old->loadPreserved():[];$candidate=$saved[self::KEY]??null;
                if($old)$legacy=$saved;
                if(is_array($candidate)&&empty($candidate['done']))$previous=$candidate;
            }
        }
        $baseline=['objects'=>[],'permissions'=>[],'category_preexisting'=>false];
        foreach($spec['objects'] as $key=>$def){$row=$m->getObject($def['class'],$def['criteria']);if($row)$baseline['objects'][$key]=self::identity($row);}
        $baseline['category_preexisting']=isset($baseline['objects']['category']);
        // The previous candidate of this same product used native backups but
        // lacked this receipt. Adopt only its audited hook fingerprints; never
        // inspect packages named cookieconsent/cookieconsent3.
        if($previous===null&&isset($legacy)){
            $previous=['permissions'=>[],'category_owned'=>!isset($legacy[md5(explode('-',$spec['signature'])[0].'/category')])];
            foreach($m->getCollection(self::cls('modAccessPermission'),['name:IN'=>['cookie_consent_manage','cookie_consent_view_logs']]) as $row){$name=$row->get('name');$description=$name==='cookie_consent_manage'?'Manage Cookie Consent Manager':'View/export consent audit logs';if($row->get('description')===$description&&(bool)$row->get('value')===($name==='cookie_consent_manage'))$previous['permissions'][(string)$row->get('id')]=self::identity($row);}
        }
        foreach($m->getCollection(self::cls('modAccessPermission'),['name:IN'=>['cookie_consent_manage','cookie_consent_view_logs']]) as $row)$baseline['permissions'][(string)$row->get('id')]=self::identity($row);
        $m->setOption(self::KEY.'.before',$baseline);$m->setOption(self::KEY.'.previous',$previous);
    }
    public static function record($t,array $spec):void{
        $m=$t->xpdo;$before=$m->getOption(self::KEY.'.before',null,[]);$old=$m->getOption(self::KEY.'.previous',null,[]);
        $record=['schema'=>1,'product'=>explode('-',$spec['signature'])[0],'objects'=>[],'permissions'=>[],'category_owned'=>($old['category_owned']??!($before['category_preexisting']??true)),'done'=>false];
        foreach($spec['objects'] as $key=>$def){$row=$m->getObject($def['class'],$def['criteria']);if(!$row&&$key==='menu'&&$m->getCount($def['class'],['namespace'=>'cookie_consent','action'=>'index'])===1)$row=$m->getObject($def['class'],['namespace'=>'cookie_consent','action'=>'index']);if($row)$record['objects'][$key]=self::identity($row);}
        foreach(['plugin'=>['modPlugin',['name'=>'CookieConsentCacheBuild']],'bundle'=>['modSystemSetting',['key'=>'cookie_consent.bundle_version']]] as $key=>[$class,$criteria]){if($row=$m->getObject(self::cls($class),$criteria))$record['objects'][$key]=self::identity($row);}
        foreach($m->getCollection(self::cls('modAccessPermission'),['name:IN'=>['cookie_consent_manage','cookie_consent_view_logs']]) as $row){$id=(string)$row->get('id');if(isset($old['permissions'][$id])||!isset($before['permissions'][$id]))$record['permissions'][$id]=self::identity($row);}
        $t->_preserved[self::KEY]=$record;if(!$t->writePreserved())throw new RuntimeException('Cannot save native uninstall ownership');
    }
    public static function start($t,array $spec):bool{
        $m=$t->xpdo;$m->setOption(self::KEY.'.plan',['ready'=>false,'files'=>[],'objects'=>[]]);
        try{
            $r=$t->_preserved[self::KEY]??null;
            if(!is_array($r)||($r['schema']??null)!==1||($r['product']??null)!==explode('-',$spec['signature'])[0])throw new RuntimeException('Native ownership record unavailable; nothing will be removed');
            $plan=['ready'=>false,'files'=>[],'objects'=>[],'record'=>$r];
            foreach($spec['files'] as $entry){
                $file=self::path($m,$entry['target']);$plan['files'][$entry['target']]=false;
                if(!file_exists($file)&&!is_link($file))continue;
                if(!self::regular($file)||hash_file('sha256',$file)!==$entry['sha256']){self::warn($m,'preserved changed/unknown shipped file: '.$entry['target']);continue;}
                if(!is_writable(dirname($file)))throw new RuntimeException('Shipped file directory is not writable: '.$entry['target']);
                $plan['files'][$entry['target']]=true;
            }
            foreach($spec['objects'] as $key=>$def){$row=$m->getObject($def['class'],$def['criteria']);$plan['objects'][$key]=isset($r['objects'][$key])&&self::same($row,$r['objects'][$key]);if($row&&!$plan['objects'][$key])self::warn($m,'preserved unowned object: '.$key);}
            $dir=rtrim($m->getOption('assets_path'),'/').'/components/cookieconsentmanager/js/cookie-consent';
            if(is_dir($dir)){
                if(realpath($dir)!==$dir||!is_writable($dir))throw new RuntimeException('Unsafe/unwritable bundle directory');
                $lock=$dir.'/cookie-consent.build.lock';if((file_exists($lock)||is_link($lock))&&!self::regular($lock))throw new RuntimeException('Unsafe bundle lock');
                $handle=@fopen($lock,'c');if(!$handle||!flock($handle,LOCK_EX|LOCK_NB))throw new RuntimeException('bundle_busy');$m->setOption(self::KEY.'.lock',$handle);
            }
            $plugin=$m->getObject(self::cls('modPlugin'),['name'=>'CookieConsentCacheBuild']);
            if(isset($r['objects']['plugin'])&&self::same($plugin,$r['objects']['plugin'])){$plugin->set('disabled',true);if(!$plugin->save())throw new RuntimeException('Cannot disable build plugin');}
            $plan['ready']=true;$m->setOption(self::KEY.'.plan',$plan);return true;
        }catch(Throwable $e){$m->log(xPDO::LOG_LEVEL_ERROR,'CookieConsentManager uninstall incomplete: '.$e->getMessage());return false;}
    }
    public static function fileEnabled($m,string $target):bool{$plan=$m->getOption(self::KEY.'.plan',null,[]);return !empty($plan['ready'])&&!empty($plan['files'][$target]);}
    public static function objectEnabled($m,string $key):bool{$plan=$m->getOption(self::KEY.'.plan',null,[]);return !empty($plan['ready'])&&!empty($plan['objects'][$key]);}
    public static function finish($t,array $spec):bool{
        $m=$t->xpdo;$plan=$m->getOption(self::KEY.'.plan',null,[]);if(empty($plan['ready']))return false;
        try{
            $r=$plan['record'];
            foreach($spec['files'] as $entry)if(!empty($plan['files'][$entry['target']])&&(file_exists(self::path($m,$entry['target']))||is_link(self::path($m,$entry['target']))))throw new RuntimeException('Native file removal incomplete: '.$entry['target']);
            // No external/custom log or config path is traversed, including core/cache/logs/.rate.
            $core=rtrim($m->getOption('core_path'),'/').'/components/cookieconsentmanager/';$js=rtrim($m->getOption('assets_path'),'/').'/components/cookieconsentmanager/js/cookie-consent/';
            $state=$core.'adapter-checksums.json';$data=self::regular($state)&&filesize($state)<=16777216?json_decode((string)file_get_contents($state),true):null;
            $known=[];if(is_array($data)&&($data['schema']??null)===1&&is_array($data['versions']??null))foreach($data['versions'] as $hashes)if(is_array($hashes))foreach($hashes as $path=>$hash)if(preg_match('~^assets/(?:components/cookieconsentmanager/)?js/cookie-consent/services/[a-z0-9-]+\.js$~D',$path)&&is_string($hash)&&preg_match('/^[a-f0-9]{64}$/D',$hash))$known[basename($path)][]=$hash;
            foreach($known as $name=>$hashes){$file=$js.'services/'.$name;if(!file_exists($file)&&!is_link($file))continue;if(self::regular($file)&&in_array(hash_file('sha256',$file),$hashes,true))self::removeFile($file);else self::warn($m,'preserved modified adapter: assets/components/cookieconsentmanager/js/cookie-consent/services/'.$name);}
            if($known)self::removeFile($state);
            $bundle=$js.'cached-cookie-consent.min.js';if(self::regular($bundle)&&str_starts_with((string)file_get_contents($bundle,false,null,0,24),'// CookieConsentBundle '))self::removeFile($bundle);
            $error=$js.'cookie-consent.last-error.json';$json=self::regular($error)?json_decode((string)file_get_contents($error),true):null;if(is_array($json)&&array_keys($json)===['failed_at']&&is_string($json['failed_at']))self::removeFile($error);
            $plugin=$m->getObject(self::cls('modPlugin'),['name'=>'CookieConsentCacheBuild']);if(isset($r['objects']['plugin'])&&self::same($plugin,$r['objects']['plugin'])){foreach($m->getCollection(self::cls('modPluginEvent'),['pluginid'=>$plugin->get('id')]) as $event)if(!$event->remove())throw new RuntimeException('Cannot remove plugin event');if(!$plugin->remove())throw new RuntimeException('Cannot remove build plugin');}
            // The audit hook's private queue has a bounded, unique options shape.
            $queue=$m->getObject(self::cls('registry.db.modDbRegisterQueue'),['name'=>'cookieconsent-audit-private']);
            if($queue&&isset($r['objects']['cookie_consent.audit'])){$opts=$queue->get('options');if(is_array($opts)&&array_keys($opts)===['rate_limit_key']&&is_string($opts['rate_limit_key'])&&preg_match('/^[a-f0-9]{64}$/D',$opts['rate_limit_key'])&&!$m->getCount(self::cls('registry.db.modDbRegisterTopic'),['queue'=>$queue->get('id')])){if(!$queue->remove())throw new RuntimeException('Cannot remove private audit queue');}else self::warn($m,'preserved unrecognized/shared audit queue');}
            foreach($r['permissions'] as $id){$row=$m->getObject(self::cls('modAccessPermission'),$id['pk']);if(self::same($row,$id)&&$row->get('description')===($id['fields']['description']??null)&&!$row->remove())throw new RuntimeException('Cannot remove permission definition');}
            $objects=$r['objects'];unset($objects['plugin']);$category=$objects['category']??null;$namespace=$objects['namespace']??null;unset($objects['category'],$objects['namespace']);
            foreach($objects as $key=>$id){
                // Canonical elements are deleted by native object vehicles.
                if(in_array($key,['chunk','CookieConsent','CookieConsentAssets','CookieConsentBanner','CookieConsentMap','CookieConsentVideo'],true)){if(self::objectEnabled($m,$key)&&$m->getObject($id['class'],$id['pk']))throw new RuntimeException('Native element removal incomplete');continue;}
                $row=$m->getObject($id['class'],$id['pk']);if(self::same($row,$id)&&!$row->remove())throw new RuntimeException('Cannot remove managed object: '.$key);
            }
            if($category&&!empty($r['category_owned'])){
                $row=$m->getObject($category['class'],$category['pk']);$children=0;foreach(['modSnippet','modChunk','modPlugin','modTemplate','modTemplateVar'] as $class)$children+=$m->getCount(self::cls($class),['category'=>$category['pk']]);$children+=$m->getCount(self::cls('modCategory'),['parent'=>$category['pk']]);
                if(self::same($row,$category)){if($children)self::warn($m,'preserved category containing third-party elements');elseif(!$row->remove())throw new RuntimeException('Cannot remove empty category');}
            }
            if($category&&empty($r['category_owned'])&&$m->getObject($category['class'],$category['pk']))self::warn($m,'preserved pre-existing category');
            if($namespace){$row=$m->getObject($namespace['class'],$namespace['pk']);if(self::same($row,$namespace)&&!$row->remove())throw new RuntimeException('Cannot remove namespace');}
            $bootstrap=rtrim($m->getOption('assets_path'),'/').'/components/cookieconsentmanager/bootstrap.php';
            $expected="<?php\n// CookieConsent generated bootstrap\nrequire_once ".var_export(rtrim($m->getOption('base_path'),'/').'/config.core.php',true).";\n";
            if(self::regular($bootstrap)&&file_get_contents($bootstrap)===$expected)self::removeFile($bootstrap);
            $lock=$js.'cookie-consent.build.lock';if(self::regular($lock)&&filesize($lock)===0)self::removeFile($lock);
            // Only directories derived from the exact package inventory may be pruned.
            $dirs=[$core=>true,$js=>true,$js.'services/'=>true];
            foreach($spec['files'] as $entry){$dir=dirname(self::path($m,$entry['target'])).'/';foreach([$core,rtrim($m->getOption('assets_path'),'/').'/components/cookieconsentmanager/',$js] as $root)while(str_starts_with($dir,$root)){$dirs[$dir]=true;if($dir===$root)break;$dir=dirname(rtrim($dir,'/')).'/';}}
            $paths=array_keys($dirs);usort($paths,static fn($a,$b)=>strlen($b)<=>strlen($a));
            foreach($paths as $dir){$dir=rtrim($dir,'/');if(is_dir($dir)&&!is_link($dir)&&realpath($dir)===$dir){if(count(scandir($dir))===2){if(!rmdir($dir))throw new RuntimeException('Cannot remove empty package directory');}else self::warn($m,'preserved directory with user/unknown files: '.$dir);}}
            $t->_preserved[self::KEY]['done']=true;if(!$t->writePreserved())throw new RuntimeException('Cannot finalize native uninstall ownership');
            $m->log(xPDO::LOG_LEVEL_INFO,'CookieConsentManager uninstall complete; consent logs and custom files/paths retained.');return true;
        }catch(Throwable $e){$m->log(xPDO::LOG_LEVEL_ERROR,'CookieConsentManager uninstall incomplete: '.$e->getMessage());return false;}
        finally{$lock=$m->getOption(self::KEY.'.lock');if(is_resource($lock)){flock($lock,LOCK_UN);fclose($lock);}$m->setOption(self::KEY.'.lock',null);}
    }
    private static function removeFile(string $file):void{if(!self::regular($file)||!is_writable(dirname($file))||!unlink($file))throw new RuntimeException('Cannot remove generated file');}
}
}
