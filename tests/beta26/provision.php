<?php
if(PHP_SAPI!=='cli'||!getenv('CC_DB_PASSWORD'))exit(1);
define('MODX_API_MODE',true);ob_start();require '/var/www/html/index.php';while(ob_get_level())ob_end_clean();
if($modx->getOption('dbname')!=='cookie_consent_test')exit(1);
// Retain the existing scenario stand/maps/dialog, replacing only public integration.
$doc=new DOMDocument();libxml_use_internal_errors(true);$doc->loadHTML(file_get_contents('/opt/cc-source/demo.html'));$xpath=new DOMXPath($doc);
foreach($xpath->query('//*[@id="cookie-block"]|//script[@src]|//link[@rel="stylesheet"]') as $node)$node->parentNode->removeChild($node);
$doc->documentElement->setAttribute('lang','[[++cultureKey]]');
$html=$doc->saveHTML();$html=str_replace('</head>','[[!CookieConsentAssets]]</head>',$html);$html=str_replace('</body>','[[!CookieConsentBanner? &mode=`mock`]]</body>',$html);
$t=$modx->getObject('modTemplate',['templatename'=>'Consent acceptance']);$t->set('content',$html);if(!$t->save())exit(1);$modx->cacheManager->refresh();echo "Bundled SSR head/footer acceptance stand ready\n";
