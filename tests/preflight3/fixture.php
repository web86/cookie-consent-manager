<?php
// Reuse the existing marker, exact database and CMS version guards.
$preflightAction=$argv[1]??'';$argv[1]='boot';
require __DIR__.'/../public-install/fixture.php';
$namespace=$modx->getObject('MODX\Revolution\modNamespace',['name'=>'cookie_consent']);
$marker='preflight-negative-fixture';
$roots=[MODX_CORE_PATH.'components/cookieconsentmanager3',MODX_ASSETS_PATH.'components/cookieconsentmanager3',MODX_ASSETS_PATH.'components/cookieconsentmanager3/js/cookie-consent'];
$rows=['MODX\Revolution\modNamespace'=>['name'=>'cookie_consent'],'MODX\Revolution\modChunk'=>['name'=>'CookiesPopup'],'MODX\Revolution\modSnippet'=>['name:IN'=>['CookieConsent','CookieConsentAssets','CookieConsentBanner','CookieConsentMap','CookieConsentVideo']],'MODX\Revolution\modPlugin'=>['name'=>'CookieConsentCacheBuild'],'MODX\Revolution\modSystemSetting'=>['namespace'=>'cookie_consent','OR:key:IN'=>['cookie_consent.options','cookie_consent.services','cookie_consent.texts','cookie_consent.log_dir','cookie_consent.audit_config_file','cookie_consent.audit']],'MODX\Revolution\modMenu'=>['namespace'=>'cookie_consent','OR:text:='=>'CookieConsentManager']];
if($preflightAction==='state'){
    $result=['objects'=>[],'files'=>[],'installed'=>false];
    foreach($rows as $class=>$criteria){$values=[];foreach($modx->getCollection($class,$criteria) as $row)$values[]=$row->toArray();usort($values,static fn($a,$b)=>strcmp(json_encode($a),json_encode($b)));$result['objects'][$class]=$values;}
    foreach($roots as $directory)if(is_dir($directory))foreach(new RecursiveIteratorIterator(new RecursiveDirectoryIterator($directory,FilesystemIterator::SKIP_DOTS),RecursiveIteratorIterator::SELF_FIRST) as $file){if($file->isDir()&&!$file->isLink())continue;$result['files'][$file->getPathname()]=$file->isLink()?'link:'.readlink($file->getPathname()):hash_file('sha256',$file->getPathname());}
    $css=MODX_ASSETS_PATH.'components/cookieconsentmanager3/css/cookie-consent.min.css';if(file_exists($css))$result['files'][$css]=hash_file('sha256',$css);ksort($result['files']);
    $p=$modx->getObject('MODX\Revolution\Transport\modTransportPackage',['signature'=>'cookieconsentmanager3-1.0.8-pl7']);$result['installed']=$p&&(bool)$p->get('installed');
    echo json_encode($result);exit;
}
if($preflightAction==='namespace'){
    if($namespace)throw new RuntimeException('Existing namespace');
    $row=$modx->newObject('MODX\Revolution\modNamespace');$row->fromArray(['name'=>'cookie_consent','path'=>'{core_path}components/cookieconsentmanager3/','assets_path'=>'{assets_path}components/cookieconsentmanager3/'],'',true,true);if(!$row->save())throw new RuntimeException('Namespace seed');echo '{}';exit;
}
if($preflightAction==='lock'){
    if(!is_dir($roots[2]))mkdir($roots[2],0755,true);
    $file=$roots[2].'/cookie-consent.build.lock';$lock=fopen($file,'c');if(!$lock||!flock($lock,LOCK_EX|LOCK_NB))throw new RuntimeException('Test lock');chown($file,'www-data');echo "READY\n";flush();fgets(STDIN);flock($lock,LOCK_UN);fclose($lock);exit;
}
if($preflightAction==='conflict'){
    $type=$argv[2]??'';$mode=$argv[3]??'';
    $definitions=[
        'snippet'=>['MODX\Revolution\modSnippet',['name'=>'CookieConsent','description'=>$marker,'snippet'=>'return "'.$marker.'";']],
        'chunk'=>['MODX\Revolution\modChunk',['name'=>'CookiesPopup','description'=>$marker,'snippet'=>$marker]],
        'plugin'=>['MODX\Revolution\modPlugin',['name'=>'CookieConsentCacheBuild','description'=>$marker,'plugincode'=>'// '.$marker]],
        'setting'=>['MODX\Revolution\modSystemSetting',['key'=>'cookie_consent.audit','namespace'=>'cookie_consent','value'=>$marker]],
        'foreign-setting'=>['MODX\Revolution\modSystemSetting',['key'=>'cookie_consent.options','namespace'=>'core','value'=>$marker]],
        'menu'=>['MODX\Revolution\modMenu',['text'=>'preflight-negative-fixture','namespace'=>'cookie_consent','action'=>'index','description'=>$marker]],
        'foreign-menu'=>['MODX\Revolution\modMenu',['text'=>'CookieConsentManager','namespace'=>'core','action'=>'index','description'=>$marker]],
    ];
    $files=['core-known'=>$roots[0].'/src/CookieConsentSettings.php','core-unknown'=>$roots[0].'/foreign.txt','assets-known'=>$roots[1].'/manager.js','assets-unknown'=>$roots[1].'/foreign.txt','public'=>$roots[2].'/consent-manager.js','public-unknown'=>$roots[2].'/foreign.txt','adapter'=>$roots[2].'/services/yandex.js','css'=>MODX_ASSETS_PATH.'components/cookieconsentmanager3/css/cookie-consent.min.css','css-symlink'=>MODX_ASSETS_PATH.'components/cookieconsentmanager3/css/cookie-consent.min.css','manifest'=>$roots[0].'/frontend-manifest.json','state'=>$roots[0].'/adapter-checksums.json','symlink'=>$roots[0].'/foreign-link','nonempty-lock'=>$roots[2].'/cookie-consent.build.lock'];
    if(isset($definitions[$type])){
        [$class,$fields]=$definitions[$type];$primary=$class==='MODX\Revolution\modSystemSetting'?'key':($class==='MODX\Revolution\modMenu'?'text':'name');$criteria=[$primary=>$fields[$primary]];
        if($mode==='seed'){if($modx->getCount($class,$criteria))throw new RuntimeException('Existing conflict');$row=$modx->newObject($class);$row->fromArray($fields,'',true,true);if(!$row->save())throw new RuntimeException('Conflict seed');}
        elseif($mode==='clear'){$row=$modx->getObject($class,$criteria);$field=$class==='MODX\Revolution\modSystemSetting'?'value':'description';if(!$row||$row->get($field)!==$marker||!$row->remove())throw new RuntimeException('Only test-owned row may be removed');}
        else throw new RuntimeException('Mode');
    }elseif(isset($files[$type])){
        $file=$files[$type];
        if($mode==='seed'){if(file_exists($file)||is_link($file))throw new RuntimeException('Existing conflict');if(!is_dir(dirname($file)))mkdir(dirname($file),0755,true);if(in_array($type,['symlink','css-symlink'],true))symlink('/opt/cc-private/disposable-marker',$file);else file_put_contents($file,$marker);}
        elseif($mode==='clear'){if(in_array($type,['symlink','css-symlink'],true)){if(!is_link($file)||readlink($file)!=='/opt/cc-private/disposable-marker')throw new RuntimeException('Foreign link');}elseif(file_get_contents($file)!==$marker)throw new RuntimeException('Foreign file');unlink($file);}
        else throw new RuntimeException('Mode');
    }elseif(in_array($type,['namespace-core','namespace-assets'],true)){
        if(!$namespace)throw new RuntimeException('Namespace missing');$key=$type==='namespace-core'?'path':'assets_path';$expected=$key==='path'?'{core_path}components/cookieconsentmanager3/':'{assets_path}components/cookieconsentmanager3/';
        if($mode==='seed'){if($namespace->get($key)!==$expected)throw new RuntimeException('Foreign namespace');$namespace->set($key,'{core_path}components/preflight-negative-fixture/');}
        elseif($mode==='clear'){if($namespace->get($key)!=='{core_path}components/preflight-negative-fixture/')throw new RuntimeException('Foreign namespace');$namespace->set($key,$expected);}else throw new RuntimeException('Mode');$namespace->save();
    }else throw new RuntimeException('Conflict type');
    $modx->cacheManager->refresh();echo '{}';exit;
}
throw new RuntimeException('Unknown preflight fixture action');
