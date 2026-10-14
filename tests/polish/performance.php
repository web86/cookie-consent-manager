<?php
// CLI-only benchmark on the named disposable DB; no production state changes.
if(PHP_SAPI!=='cli'||!getenv('CC_DB_PASSWORD'))exit(1);
define('MODX_API_MODE',true);ob_start();require '/var/www/html/index.php';while(ob_get_level())ob_end_clean();if($modx->getOption('dbname')!=='cookie_consent_test')exit(1);
require_once MODX_CORE_PATH.'components/cookieconsent/src/CookieConsentSettings.php';
function measure($modx,$callback,$count=100){$times=[];$queries=[];for($i=0;$i<$count+5;$i++){$q=$modx->executedQueries;$start=hrtime(true);$callback();$ms=(hrtime(true)-$start)/1e6;if($i>=5){$times[]=$ms;$queries[]=$modx->executedQueries-$q;}}sort($times);return ['samples'=>$count,'median_ms'=>$times[intdiv($count,2)],'p95_ms'=>$times[(int)floor($count*.95)-1],'queries_min'=>min($queries),'queries_max'=>max($queries)];}
$out=['php'=>PHP_VERSION,'modx'=>$modx->getVersionData()['full_version'],'conditions'=>'Single local PHP process after 5 warmup iterations, identical persisted settings, no state mutation. Snippet SQL counts include native snippet/chunk retrieval.'];
$out['settings_read_twice']=measure($modx,fn()=>[CookieConsentSettings::read($modx),CookieConsentSettings::read($modx)]);
foreach(['ru','en']as$lang){$modx->context->config['cultureKey']=$lang;foreach(['live','mock']as$mode)$out['split_'.$lang.'_'.$mode]=measure($modx,fn()=>[$modx->runSnippet('CookieConsentAssets'),$modx->runSnippet('CookieConsentBanner',['mode'=>$mode])]);}
$out['hash_two_bundles']=measure($modx,fn()=>[hash_file('sha256',MODX_ASSETS_PATH.'css/cookie-consent.min.css'),hash_file('sha256',MODX_ASSETS_PATH.'js/cookie-consent/cookie-consent.min.js')],500);
echo json_encode($out,JSON_PRETTY_PRINT)."\n";
