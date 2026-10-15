<?php
// Test instrumentation only. Restricted to the disposable native-upgrade fixture.
if (PHP_SAPI !== 'cli' || !getenv('CC_DB_PASSWORD')) exit(1);
define('MODX_API_MODE', true);
ob_start(); require '/var/www/html/index.php'; while (ob_get_level()) ob_end_clean();
if ($modx->query('SELECT DATABASE()')->fetchColumn() !== 'cookie_consent_transport_publiccore'
    || $modx->getVersionData()['full_version'] !== '2.8.8-pl') exit(1);
$path = '/opt/cc-publiccore/logs/beta103-package-events.jsonl';
switch ($argv[1] ?? '') {
case 'versions':
    $modx->addPackage('modx.transport', MODX_CORE_PATH.'model/');
    $old = $modx->getObject('transport.modTransportPackage', 'cookieconsent-1.0.2');
    $new = $modx->getObject('transport.modTransportPackage', 'cookieconsent-1.0.3-beta1');
    if (!$old || !$new) throw new RuntimeException('Both native package rows required');
    $fields = ['signature','version_major','version_minor','version_patch','release','release_index','installed'];
    echo json_encode([
        'stable' => array_intersect_key($old->toArray(), array_flip($fields)),
        'candidate' => array_intersect_key($new->toArray(), array_flip($fields)),
        'comparable' => $new->getComparableVersion(),
        'newerThanStable' => $new->compareVersion($old->getComparableVersion(), '<'),
        'previousVersionInstalled' => $new->previousVersionInstalled(),
    ]);
    break;
case 'watch':
    $plugin = $modx->newObject('modPlugin');
    $plugin->fromArray(['name'=>'Beta103 native upgrade observer','plugincode'=>
        'if ($modx->event->name === "OnPackageInstall") file_put_contents('.var_export($path,true).', json_encode(["signature"=>$package->get("signature"),"action"=>$action])."\n", FILE_APPEND);'
    ], '', true, true);
    if (!$plugin->save()) throw new RuntimeException('Observer save');
    $event = $modx->newObject('modPluginEvent');
    $event->fromArray(['pluginid'=>$plugin->get('id'),'event'=>'OnPackageInstall'], '', true, true);
    if (!$event->save()) throw new RuntimeException('Observer event save');
    $modx->cacheManager->refresh();
    echo json_encode(['watching'=>true]);
    break;
case 'events':
    echo json_encode(is_file($path) ? array_map(function($line){return json_decode($line,true);}, file($path, FILE_IGNORE_NEW_LINES|FILE_SKIP_EMPTY_LINES)) : []);
    break;
default: throw new RuntimeException('Unknown version-test action');
}
