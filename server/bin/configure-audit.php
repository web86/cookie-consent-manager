<?php
declare(strict_types=1);
// Only explicitly run by the site operator. Never invoke from transport installation.
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
if(count($argv)!==4)throw new RuntimeException('Usage: configure-audit.php /absolute/modx-root /absolute/private/audit.json ORIGIN');
[$script,$root,$file,$origin]=$argv;
require_once dirname(__DIR__).'/src/CookieConsentAuditConfiguration.php';
CookieConsentPrivatePath::directory(dirname($file),$root);
if(strtolower(pathinfo($file,PATHINFO_EXTENSION))!=='json'||file_exists($file)||is_link($file))throw new RuntimeException('New private JSON file required; existing config never overwritten');
$config=CookieConsentAuditConfiguration::validate(['site_origin'=>$origin,'rate_limit_key'=>bin2hex(random_bytes(32)),'rate_limit_per_minute'=>60]);
define('MODX_API_MODE',true);ob_start();require $root.'/index.php';while(ob_get_level())ob_end_clean();
$setting=$modx->getObject('modSystemSetting',['key'=>'cookie_consent.audit_config_file']);
if($setting&&(string)$setting->get('value')!==''&&(string)$setting->get('value')!==$file)throw new RuntimeException('Existing configured path preserved');
$mask=umask(0077);try{$handle=fopen($file,'xb');}finally{umask($mask);}
if(!$handle)throw new RuntimeException('Cannot create private config');
$json=json_encode($config,JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR)."\n";
try{if(fwrite($handle,$json)!==strlen($json)||!fflush($handle))throw new RuntimeException('Private config write failed');}finally{fclose($handle);}
if(!$setting){$setting=$modx->newObject('modSystemSetting');$setting->fromArray(['key'=>'cookie_consent.audit_config_file','namespace'=>'cookie_consent','xtype'=>'textfield','area'=>'consent'],'',true,true);}
$setting->set('value',$file);if(!$setting->save())throw new RuntimeException('Cannot save configured path');
$modx->cacheManager->refresh(['system_settings'=>[]]);echo "Private audit config created. No secrets printed. Configure the private log directory and verify same-origin POST.\n";
