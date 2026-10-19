<?php
declare(strict_types=1);
// This CLI is usable only inside a case-specific disposable compose project.
$case=getenv('CC_MATRIX_CASE');
if(PHP_SAPI!=='cli'||!preg_match('/^rename-(?:84|88)-p8[12](?:-fresh)?(?:-final)?$/D',(string)$case)||trim((string)file_get_contents('/opt/cc-private/disposable-marker'))!==$case)throw new RuntimeException('Disposable matrix fixture required');
$root='/var/www/html/';$database='cc2_rename_'.str_replace('-','_',$case);$action=$argv[1]??'';
if($action==='verify-prepared'){
    if(is_file($root.'core/config/config.inc.php')&&filesize($root.'core/config/config.inc.php')>100)throw new RuntimeException('Already installed');
    $pdo=new PDO('mysql:host=db','root',getenv('CC_MATRIX_PASSWORD'));
    $q=$pdo->prepare('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=?');$q->execute([$database]);
    if((int)$q->fetchColumn()!==0)throw new RuntimeException('Partially installed database; preserve it');exit;
}
if($action==='prepare'){
    if(is_file($root.'core/config/config.inc.php')&&filesize($root.'core/config/config.inc.php')>100)throw new RuntimeException('Existing installation refused');
    $pdo=new PDO('mysql:host=db','root',getenv('CC_MATRIX_PASSWORD'));
    $pdo->exec('CREATE DATABASE `'.$database.'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    $xml=new SimpleXMLElement(file_get_contents($root.'setup/config.dist.new.xml'));
    foreach(['database_server'=>'db','database'=>$database,'database_user'=>'root','database_password'=>getenv('CC_MATRIX_PASSWORD'),'database_connection_charset'=>'utf8mb4','database_charset'=>'utf8mb4','database_collation'=>'utf8mb4_unicode_ci','http_host'=>'127.0.0.1:'.getenv('CC_MATRIX_PORT'),'inplace'=>'1','unpacked'=>'0','cmsadmin'=>'acceptance','cmspassword'=>bin2hex(random_bytes(24)),'cmsadminemail'=>'acceptance@example.invalid','core_path'=>$root.'core/','context_mgr_path'=>$root.'manager/','context_mgr_url'=>'/manager/','context_connectors_path'=>$root.'connectors/','context_connectors_url'=>'/connectors/','context_web_path'=>$root,'context_web_url'=>'/','remove_setup_directory'=>'0'] as $key=>$value)$xml->$key=$value;
    $xml->asXML('/opt/cc-private/setup.xml');chmod('/opt/cc-private/setup.xml',0600);
    file_put_contents('/opt/cc-private/manager.json',json_encode(['username'=>'acceptance','password'=>(string)$xml->cmspassword]));chmod('/opt/cc-private/manager.json',0600);exit;
}
$destination=(static function()use($root){require $root.'core/config/config.inc.php';return [$database_server??null,$dbase??null];})();
if($destination!==['db',$database])throw new RuntimeException('Foreign connection refused');
if($action==='upgrade-config'){
    $xml=new SimpleXMLElement(file_get_contents($root.'setup/config.dist.upgrade.xml'));
    foreach(['inplace'=>'1','unpacked'=>'0','core_path'=>$root.'core/','language'=>'en','remove_setup_directory'=>'0'] as $k=>$v)$xml->$k=$v;
    $xml->asXML('/opt/cc-private/upgrade.xml');chmod('/opt/cc-private/upgrade.xml',0600);exit;
}
if($action==='finish'||$action==='upgrade-finish'){
    file_put_contents($root.'core/.htaccess',"Require all denied\n");
    $backup='/opt/cc-private/completed-setup'.($action==='upgrade-finish'?'-288':'');
    if(is_dir($root.'setup')){if(is_dir($backup))throw new RuntimeException('Existing setup backup');rename($root.'setup',$backup);}
    foreach(new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root,FilesystemIterator::SKIP_DOTS),RecursiveIteratorIterator::SELF_FIRST) as $e)if(!$e->isLink())chown($e->getPathname(),'www-data');
    chown($root,'www-data');
    foreach(['logs','logs-new','configs'] as $dir){$path='/opt/cc-private/'.$dir;if(!is_dir($path))mkdir($path,0700);chown($path,'www-data');chmod($path,0700);}
}
define('MODX_API_MODE',true);ob_start();require $root.'index.php';while(ob_get_level())ob_end_clean();
if($modx->getVersionData()['full_version']!==getenv('CC_MATRIX_MODX')||$modx->query('SELECT DATABASE()')->fetchColumn()!==$database)throw new RuntimeException('Wrong CMS/database');
$namespace=$modx->getObject('modNamespace',['name'=>'cookie_consent']);
$component=$namespace?$namespace->getCorePath():MODX_CORE_PATH.'components/cookieconsentmanager/';
if($action==='boot')return;
if($action==='canonical-state'){
    $result=[];foreach(['CookiesPopup'=>'modChunk','CookieConsent'=>'modSnippet','CookieConsentAssets'=>'modSnippet','CookieConsentBanner'=>'modSnippet','CookieConsentMap'=>'modSnippet','CookieConsentVideo'=>'modSnippet'] as $name=>$class){$row=$modx->getObject($class,['name'=>$name]);$result[$name]=$row?['id'=>$row->get('id'),'static'=>(bool)$row->get('static'),'sha256'=>hash('sha256',$row->get('snippet'))]:null;}
    echo json_encode($result);exit;
}
if($action==='previous-package'){
    $signature=$argv[2]??'';if(!preg_match('/^cookieconsent(?:manager)?-[a-zA-Z0-9.-]+$/D',$signature))throw new RuntimeException('Signature');
    $p=$modx->getObject('transport.modTransportPackage',['signature'=>$signature]);echo json_encode(['previous'=>$p?$p->previousVersionInstalled():null]);exit;
}
if($action==='name-conflict'){
    $row=$modx->newObject('modSnippet');$row->fromArray(['name'=>'CookieConsent','description'=>'rename-owned-negative-fixture','snippet'=>'return "foreign-name-fixture";']);if(!$row->save())throw new RuntimeException('Conflict seed');$modx->cacheManager->refresh();echo '{}';exit;
}
if($action==='clear-name-conflict'){
    $row=$modx->getObject('modSnippet',['name'=>'CookieConsent','description'=>'rename-owned-negative-fixture']);if(!$row||!$row->remove())throw new RuntimeException('Only fixture-owned conflict may be removed');$modx->cacheManager->refresh();echo '{}';exit;
}
if($action==='foreign-seed'){
    $from='/opt/cc-source/.local/package-rename-foreign/';
    foreach(['core'=>MODX_CORE_PATH,'assets'=>MODX_ASSETS_PATH] as $kind=>$to){$src=$from.$kind.'/components/cookieconsent';$dst=$to.'components/cookieconsent';if(!is_dir($dst))mkdir($dst,0755,true);foreach(new RecursiveIteratorIterator(new RecursiveDirectoryIterator($src,FilesystemIterator::SKIP_DOTS),RecursiveIteratorIterator::SELF_FIRST) as $f){$target=$dst.substr($f->getPathname(),strlen($src));if($f->isLink())throw new RuntimeException('Foreign symlink');if($f->isDir()){if(!is_dir($target))mkdir($target,0755);}elseif(is_file($target)){if(hash_file('sha256',$target)!==hash_file('sha256',$f->getPathname()))throw new RuntimeException('Foreign fixture mismatch');}else copy($f->getPathname(),$target);}}
    require_once MODX_CORE_PATH.'xpdo/transport/xpdotransport.class.php';$object=(object)['xpdo'=>$modx];$options=[xPDOTransport::PACKAGE_ACTION=>xPDOTransport::ACTION_INSTALL];
    include $from.'_build/resolvers/resolver.settings.php';
    $category=$modx->newObject('modCategory');$category->set('category','cookieconsent');if(!$category->save())throw new RuntimeException('Foreign category');
    $sources=['source_core'=>$from.'core/components/cookieconsent'];foreach(include $from.'_build/data/transport.chunks.php' as $chunk){$chunk->set('category',$category->get('id'));if(!$chunk->save())throw new RuntimeException('Foreign chunk');}foreach(include $from.'_build/data/transport.plugins.php' as $plugin){$plugin->set('category',$category->get('id'));if(!$plugin->save())throw new RuntimeException('Foreign plugin');}
    $modx->cacheManager->refresh();echo '{}';exit;
}
if($action==='rename-state'){
    $trees=[];
    foreach(['core'=>MODX_CORE_PATH,'assets'=>MODX_ASSETS_PATH] as $kind=>$root){
        $dir=$root.'components/cookieconsent/';$files=[];
        if(is_dir($dir))foreach(new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir,FilesystemIterator::SKIP_DOTS)) as $f)if($f->isFile())$files[substr($f->getPathname(),strlen($dir))]=hash_file('sha256',$f->getPathname());
        ksort($files);$trees[$kind]=$files;
    }
    $packages=[];foreach($modx->getCollection('transport.modTransportPackage') as $p)$packages[$p->get('signature')]=['name'=>$p->get('package_name'),'installed'=>(bool)$p->get('installed')];
    $elementCategories=[];foreach(['modChunk'=>['CookiesPopup'],'modSnippet'=>['CookieConsent','CookieConsentAssets','CookieConsentBanner','CookieConsentMap','CookieConsentVideo']] as $class=>$names)foreach($names as $name){$el=$modx->getObject($class,['name'=>$name]);if($el){$cat=$modx->getObject('modCategory',$el->get('category'));$elementCategories[$name]=$cat?$cat->get('category'):null;}}
    $counts=['menu'=>$modx->getCount('modMenu',['namespace'=>'cookie_consent','action'=>'index']),'plugin'=>$modx->getCount('modPlugin',['name'=>'CookieConsentCacheBuild']),'event'=>0];
    $plugin=$modx->getObject('modPlugin',['name'=>'CookieConsentCacheBuild']);if($plugin)$counts['event']=$modx->getCount('modPluginEvent',['pluginid'=>$plugin->get('id'),'event'=>'OnSiteRefresh']);
    foreach(['modChunk'=>['CookiesPopup'],'modSnippet'=>['CookieConsent','CookieConsentAssets','CookieConsentBanner','CookieConsentMap','CookieConsentVideo']] as $class=>$names)foreach($names as $name)$counts[$name]=$modx->getCount($class,['name'=>$name]);
    $state=is_file($component.'adapter-checksums.json')?json_decode(file_get_contents($component.'adapter-checksums.json'),true):null;
    echo json_encode(['trees'=>$trees,'packages'=>$packages,'counts'=>$counts,'element_categories'=>$elementCategories,'history'=>$state['versions']??[],'namespace'=>$namespace?$namespace->get('path'):null,'foreign'=>$modx->getObject('modNamespace',['name'=>'cookieconsent'])?['namespace'=>$modx->getObject('modNamespace',['name'=>'cookieconsent'])->toArray(),'category'=>$modx->getObject('modCategory',['category'=>'cookieconsent'])->toArray(),'settings'=>array_map(static fn($s)=>$s->toArray(),$modx->getCollection('modSystemSetting',['namespace'=>'cookieconsent'])),'plugin'=>$modx->getObject('modPlugin',['name'=>'InjectCookieMarkup'])->toArray(),'chunk'=>$modx->getObject('modChunk',['name'=>'cookieconsentMarkup'])->toArray()]:null]);exit;
}

if($action==='audit-queue'){
    $queue=$modx->getObject('registry.db.modDbRegisterQueue',['name'=>'cookieconsent-audit-private']);
    echo json_encode(['sha256'=>$queue?hash('sha256',json_encode($queue->toArray())):null]);exit;
}
if($action==='audit-ids'){
    require_once $component.'src/CookieConsentAuditFormat.php';
    $ids=[];foreach(glob('/opt/cc-private/logs/*-cookie-consent.log')?:[] as $file)foreach(CookieConsentAuditFormat::records($file) as $row)$ids[]=$row['event_id'];echo json_encode($ids);exit;
}
if($action==='component-versions'){
    $manifest=json_decode(file_get_contents($component.'frontend-manifest.json'),true,16,JSON_THROW_ON_ERROR);
    $state=json_decode(file_get_contents($component.'adapter-checksums.json'),true,32,JSON_THROW_ON_ERROR);
    echo json_encode(['manifest'=>$manifest['package_version'],'adapters'=>$state['current']]);exit;
}
if($action==='info'||$action==='finish'||$action==='upgrade-finish'){
    echo json_encode(['modx'=>$modx->getVersionData()['full_version'],'php'=>PHP_VERSION,'xpdo'=>(preg_match('/xPDO ([0-9.]+-pl)/',file_get_contents(MODX_CORE_PATH.'xpdo/changelog.txt'),$xpdoMatch)?$xpdoMatch[1]:null),'db'=>$database,'mariadb'=>$modx->query('SELECT VERSION()')->fetchColumn()]);exit;
}
if($action==='cache'){$modx->cacheManager->refresh();echo '{}';exit;}
if($action==='language'){
    $language=$argv[2]??'';if(!in_array($language,['ru','en'],true))throw new RuntimeException('Language');
    $setting=$modx->getObject('modSystemSetting',['key'=>'manager_language']);$setting->set('value',$language);if(!$setting->save())throw new RuntimeException('Language save');$modx->cacheManager->refresh();echo '{}';exit;
}
if($action==='mode'){
    $mode=$argv[2]??'';if(!in_array($mode,['strict','legacy'],true))throw new RuntimeException('Mode');
    $row=$modx->getObject('modSystemSetting',['key'=>'cookie_consent.options']);$options=json_decode($row->get('value'),true,16,JSON_THROW_ON_ERROR);$options['buttons']['accept']=$mode==='legacy';$row->set('value',json_encode($options,JSON_THROW_ON_ERROR));if(!$row->save())throw new RuntimeException('Mode save');
    $template=$modx->getObject('modTemplate',['templatename'=>'Matrix']);$html=$template->get('content');
    $html=str_replace(['[[!CookieConsentAssets]]','[[!CookieConsentBanner]]','[[!CookieConsent]]'],['','',''], $html);
    if($mode==='strict')$html=str_replace('</head>','[[!CookieConsentAssets]]</head>',$html);
    $html=str_replace('</body>',($mode==='legacy'?'[[!CookieConsent]]':'[[!CookieConsentBanner]]').'</body>',$html);$template->set('content',$html);if(!$template->save())throw new RuntimeException('Template mode');$modx->cacheManager->refresh();echo json_encode(['mode'=>$mode]);exit;
}
if($action==='resource'){
    $t=$modx->getObject('modTemplate',['templatename'=>'Matrix'])?:$modx->newObject('modTemplate');
    $t->fromArray(['templatename'=>'Matrix','content'=>stream_get_contents(STDIN)]);if(!$t->save())throw new RuntimeException('Template save');
    $r=$modx->getObject('modResource',1);$r->fromArray(['pagetitle'=>'Matrix','template'=>$t->get('id'),'published'=>1,'cacheable'=>1]);if(!$r->save())throw new RuntimeException('Resource save');
    $modx->cacheManager->refresh();echo '{}';exit;
}
if($action==='customize'){
    $f=MODX_ASSETS_PATH.'components/cookieconsentmanager/js/cookie-consent/services/yandex.js';file_put_contents($f,"\n// synthetic owner customization\n",FILE_APPEND);echo json_encode(['sha256'=>hash_file('sha256',$f)]);exit;
}
if($action==='cache-edit'){
    file_put_contents(MODX_ASSETS_PATH.'components/cookieconsentmanager/js/cookie-consent/services/yandex.js',"\nwindow.__matrixCacheProbe=(window.__matrixCacheProbe||0)+1;\n",FILE_APPEND);echo '{}';exit;
}
if($action==='bundle-state'){
    $file=MODX_ASSETS_PATH.'components/cookieconsentmanager/js/cookie-consent/cached-cookie-consent.min.js';echo json_encode(['sha256'=>is_file($file)?hash_file('sha256',$file):null,'version'=>(int)$modx->getOption('cookie_consent.bundle_version')]);exit;
}
if($action==='custom-script'){
    file_put_contents(MODX_ASSETS_PATH.'js/matrix-custom.js','window.__matrixCustom=(window.__matrixCustom||0)+1;');echo '{}';exit;
}
if($action==='snapshot'){
    $settings=[];foreach($modx->getCollection('modSystemSetting',['namespace'=>'cookie_consent']) as $s)if($s->get('key')!=='cookie_consent.bundle_version')$settings[$s->get('key')]=$s->get('value');ksort($settings);
    $logs=[];foreach(glob('/opt/cc-private/logs/*') as $f)if(is_file($f))$logs[basename($f)]=hash_file('sha256',$f);
    $elements=[];foreach(['CookiesPopup'=>'modChunk','CookieConsent'=>'modSnippet','CookieConsentAssets'=>'modSnippet','CookieConsentBanner'=>'modSnippet','CookieConsentMap'=>'modSnippet','CookieConsentVideo'=>'modSnippet'] as $name=>$class){$r=$modx->getObject($class,['name'=>$name]);if($r)$elements[$name]=$r->get('id');}
    echo json_encode(['settings'=>$settings,'logs'=>$logs,'elements'=>$elements,'adapter'=>is_file(MODX_ASSETS_PATH.'components/cookieconsentmanager/js/cookie-consent/services/yandex.js')?hash_file('sha256',MODX_ASSETS_PATH.'components/cookieconsentmanager/js/cookie-consent/services/yandex.js'):null]);exit;
}
throw new RuntimeException('Unknown action');
