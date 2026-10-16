<?php
// Native Save for test mutations, never a public endpoint or arbitrary database.
if(PHP_SAPI!=='cli'||!getenv('CC_DB_PASSWORD'))exit(1);
define('MODX_API_MODE',true);ob_start();require '/var/www/html/index.php';while(ob_get_level())ob_end_clean();
if($modx->getOption('dbname')!=='cookie_consent_test')exit(1);
require_once MODX_CORE_PATH.'components/cookieconsent/src/CookieConsentSettings.php';
$data=CookieConsentSettings::read($modx);$draft=array_intersect_key($data,array_flip(['options','registry','texts','log_dir','audit_config_file']));
$draft['registry']=json_decode(stream_get_contents(STDIN),true,16,JSON_THROW_ON_ERROR);
CookieConsentSettings::save($modx,$draft,$data['revision']);
