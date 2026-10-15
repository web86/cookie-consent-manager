<?php
// Native snippet contracts on the marked disposable clone, with no DB mutations.
if(PHP_SAPI!=='cli'||!getenv('CC_DB_PASSWORD'))exit(1);
$marker=json_decode(file_get_contents('/opt/cc-private/disposable-fenom.json'),true);
if(($marker['fixture']??'')!=='cookie-consent-fenom')exit(1);
define('MODX_API_MODE',true);ob_start();require '/var/www/html/index.php';while(ob_get_level())ob_end_clean();
if($modx->query('SELECT DATABASE()')->fetchColumn()!=='cookie_consent_fenom')exit(1);
require_once MODX_CORE_PATH.'components/cookieconsent/src/CookieConsentSettings.php';
$n=0;function eq($a,$b,$message){global $n;$n++;if($a!==$b)throw new RuntimeException($message);}
$before=CookieConsentSettings::read($modx);
$expected=CookieConsentTexts::safeJson(CookieConsentServiceRegistry::publicRegistry($before['registry']));
$assets=$modx->runSnippet('CookieConsentAssets');
eq(str_contains($assets,'cc-service-registry'),false,'No structural JSON returned for parser passes');
eq(str_contains($assets,'{'),false,'No Fenom delimiters returned');
eq(substr_count($assets,'<link '),1,'One CSS tag returned');
eq(substr_count($assets,'<script '),1,'One JS tag returned');
eq(str_contains($assets,' defer>'),true,'Defer retained');
$startup=$modx->getRegisteredClientStartupScripts();
eq($startup,'<script type="application/json" id="cc-service-registry">'.$expected.'</script>','Exact registered JSON and escaping');
$modx->runSnippet('CookieConsentAssets');
eq($modx->getRegisteredClientStartupScripts(),$startup,'Native registration deduplicates identical registry');
// Reset only per-request registration state, then exercise the unmodified legacy wrapper.
$modx->sjscripts=[];$modx->jscripts=[];$modx->loadedjscripts=[];
eq($modx->runSnippet('CookieConsent'),'', 'Legacy has no inline output');
$head=$modx->getRegisteredClientStartupScripts();$body=$modx->getRegisteredClientScripts();
eq(substr_count($head,'id="cc-service-registry"'),1,'Legacy registers one JSON block');
eq(substr_count($head,'cookie-consent.min.css?v='),1,'Legacy registers one CSS');
eq(substr_count($head,'cookie-consent.min.js?v='),1,'Legacy registers one JS');
eq(substr_count($body,'id="cookie-block"'),1,'Legacy registers one banner');
eq(strpos($head,'cc-service-registry')<strpos($head,'cookie-consent.min.js'),true,'Legacy registry precedes bundle');
$modx->runSnippet('CookieConsent');
eq($modx->getRegisteredClientStartupScripts(),$head,'Legacy repeated invocation leaves head unchanged');
eq($modx->getRegisteredClientScripts(),$body,'Legacy repeated invocation leaves banner unchanged');
eq(serialize(CookieConsentSettings::read($modx)),serialize($before),'No persisted settings, consent version or category version changes');
$literal='</script><script>alert(1)</script> [[!NeverExecute]] {$neverExecute} & "quotes"';
$safe=CookieConsentTexts::safeJson(['literal'=>$literal]);
eq(json_decode($safe,true)['literal'],$literal,'Safe JSON string round trip');
foreach(['</script>','[[','{$neverExecute}'] as $tag)eq(str_contains($safe,$tag),false,'Security escaping retained');
echo json_encode(['suite'=>'Genuine MODX 2 snippet registration contracts','assertions'=>$n,'result'=>'PASS'])."\n";
