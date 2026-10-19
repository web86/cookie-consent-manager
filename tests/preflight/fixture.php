<?php
// Reuse the existing marker, exact database and CMS version guards.
$preflightAction=$argv[1]??'';$argv[1]='boot';
require __DIR__.'/../package-rename/fixture.php';
$marker='preflight-negative-fixture';
$roots=[MODX_CORE_PATH.'components/cookieconsentmanager',MODX_ASSETS_PATH.'components/cookieconsentmanager',MODX_ASSETS_PATH.'js/cookie-consent'];
$rows=['modNamespace'=>['name'=>'cookie_consent'],'modChunk'=>['name'=>'CookiesPopup'],'modSnippet'=>['name:IN'=>['CookieConsent','CookieConsentAssets','CookieConsentBanner','CookieConsentMap','CookieConsentVideo']],'modPlugin'=>['name'=>'CookieConsentCacheBuild'],'modSystemSetting'=>['namespace'=>'cookie_consent','OR:key:IN'=>['cookie_consent.options','cookie_consent.services','cookie_consent.texts','cookie_consent.log_dir','cookie_consent.audit_config_file','cookie_consent.audit']],'modMenu'=>['namespace'=>'cookie_consent','OR:text:='=>'CookieConsentManager']];
if($preflightAction==='state'){
    $result=['objects'=>[],'files'=>[],'installed'=>false];
    foreach($rows as $class=>$criteria){$values=[];foreach($modx->getCollection($class,$criteria) as $row)$values[]=$row->toArray();usort($values,static fn($a,$b)=>strcmp(json_encode($a),json_encode($b)));$result['objects'][$class]=$values;}
    foreach($roots as $directory)if(is_dir($directory))foreach(new RecursiveIteratorIterator(new RecursiveDirectoryIterator($directory,FilesystemIterator::SKIP_DOTS),RecursiveIteratorIterator::SELF_FIRST) as $file){if($file->isDir()&&!$file->isLink())continue;$result['files'][$file->getPathname()]=$file->isLink()?'link:'.readlink($file->getPathname()):hash_file('sha256',$file->getPathname());}
    $css=MODX_ASSETS_PATH.'css/cookie-consent.min.css';if(file_exists($css))$result['files'][$css]=hash_file('sha256',$css);ksort($result['files']);
    $p=$modx->getObject('transport.modTransportPackage',['signature'=>'cookieconsentmanager-1.0.8-pl4']);$result['installed']=$p&&(bool)$p->get('installed');
    echo json_encode($result);exit;
}
if($preflightAction==='namespace'){
    if($namespace)throw new RuntimeException('Existing namespace');
    $row=$modx->newObject('modNamespace');$row->fromArray(['name'=>'cookie_consent','path'=>'{core_path}components/cookieconsentmanager/','assets_path'=>'{assets_path}components/cookieconsentmanager/'],'',true,true);if(!$row->save())throw new RuntimeException('Namespace seed');echo '{}';exit;
}
if($preflightAction==='upgrade-action'){
    $p=$modx->getObject('transport.modTransportPackage',['signature'=>'cookieconsentmanager-1.0.8-pl4']);
    if(!$p||!$p->get('installed'))throw new RuntimeException('Installed fixture package required');
    // Execute the real native vehicles with ACTION_UPGRADE; no synthetic release.
    $transport=$p->getTransport();echo json_encode(['success'=>$transport->install([xPDOTransport::PACKAGE_ACTION=>xPDOTransport::ACTION_UPGRADE])]);exit;
}
if($preflightAction==='lock'){
    if(!is_dir($roots[2]))mkdir($roots[2],0755,true);
    $file=$roots[2].'/cookie-consent.build.lock';$lock=fopen($file,'c');if(!$lock||!flock($lock,LOCK_EX|LOCK_NB))throw new RuntimeException('Test lock');chown($file,'www-data');echo "READY\n";flush();fgets(STDIN);flock($lock,LOCK_UN);fclose($lock);exit;
}
if($preflightAction==='conflict'){
    $type=$argv[2]??'';$mode=$argv[3]??'';
    $definitions=[
        'snippet'=>['modSnippet',['name'=>'CookieConsent','description'=>$marker,'snippet'=>'return "'.$marker.'";']],
        'chunk'=>['modChunk',['name'=>'CookiesPopup','description'=>$marker,'snippet'=>$marker]],
        'plugin'=>['modPlugin',['name'=>'CookieConsentCacheBuild','description'=>$marker,'plugincode'=>'// '.$marker]],
        'setting'=>['modSystemSetting',['key'=>'cookie_consent.audit','namespace'=>'cookie_consent','value'=>$marker]],
        'foreign-setting'=>['modSystemSetting',['key'=>'cookie_consent.options','namespace'=>'core','value'=>$marker]],
        'menu'=>['modMenu',['text'=>'preflight-negative-fixture','namespace'=>'cookie_consent','action'=>'index','description'=>$marker]],
        'foreign-menu'=>['modMenu',['text'=>'CookieConsentManager','namespace'=>'core','action'=>'index','description'=>$marker]],
    ];
    $files=['core-known'=>$roots[0].'/src/CookieConsentSettings.php','core-unknown'=>$roots[0].'/foreign.txt','assets-known'=>$roots[1].'/manager.js','assets-unknown'=>$roots[1].'/foreign.txt','public'=>$roots[2].'/consent-manager.js','adapter'=>$roots[2].'/services/yandex.js','css'=>MODX_ASSETS_PATH.'css/cookie-consent.min.css','manifest'=>$roots[0].'/frontend-manifest.json','state'=>$roots[0].'/adapter-checksums.json','symlink'=>$roots[0].'/foreign-link'];
    if(isset($definitions[$type])){
        [$class,$fields]=$definitions[$type];$primary=$class==='modSystemSetting'?'key':($class==='modMenu'?'text':'name');$criteria=[$primary=>$fields[$primary]];
        if($mode==='seed'){if($modx->getCount($class,$criteria))throw new RuntimeException('Existing conflict');$row=$modx->newObject($class);$row->fromArray($fields,'',true,true);if(!$row->save())throw new RuntimeException('Conflict seed');}
        elseif($mode==='clear'){$row=$modx->getObject($class,$criteria);$field=$class==='modSystemSetting'?'value':'description';if(!$row||$row->get($field)!==$marker||!$row->remove())throw new RuntimeException('Only test-owned row may be removed');}
        else throw new RuntimeException('Mode');
    }elseif(isset($files[$type])){
        $file=$files[$type];
        if($mode==='seed'){if(file_exists($file)||is_link($file))throw new RuntimeException('Existing conflict');if(!is_dir(dirname($file)))mkdir(dirname($file),0755,true);if($type==='symlink')symlink('/opt/cc-private/disposable-marker',$file);else file_put_contents($file,$marker);}
        elseif($mode==='clear'){if($type==='symlink'){if(!is_link($file)||readlink($file)!=='/opt/cc-private/disposable-marker')throw new RuntimeException('Foreign link');}elseif(file_get_contents($file)!==$marker)throw new RuntimeException('Foreign file');unlink($file);}
        else throw new RuntimeException('Mode');
    }elseif(in_array($type,['namespace-core','namespace-assets'],true)){
        if(!$namespace)throw new RuntimeException('Namespace missing');$key=$type==='namespace-core'?'path':'assets_path';$expected=$key==='path'?'{core_path}components/cookieconsentmanager/':'{assets_path}components/cookieconsentmanager/';
        if($mode==='seed'){if($namespace->get($key)!==$expected)throw new RuntimeException('Foreign namespace');$namespace->set($key,'{core_path}components/preflight-negative-fixture/');}
        elseif($mode==='clear'){if($namespace->get($key)!=='{core_path}components/preflight-negative-fixture/')throw new RuntimeException('Foreign namespace');$namespace->set($key,$expected);}else throw new RuntimeException('Mode');$namespace->save();
    }else throw new RuntimeException('Conflict type');
    $modx->cacheManager->refresh();echo '{}';exit;
}
throw new RuntimeException('Unknown preflight fixture action');
