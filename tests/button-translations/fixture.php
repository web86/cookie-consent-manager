<?php
/** Native setup for an isolated tests/modstore fixture only. */
declare(strict_types=1);
$translationTask=$argv[1]??'';
$argv[1]='boot';
require __DIR__.'/../modstore/fixture.php';
require_once $component.'src/CookieConsentSettings.php';

function setSetting(string $key, string $value): void
{
    global $modx;
    $row=$modx->getObject(ccClass('modSystemSetting'),['key'=>$key]);
    check($row,'Missing fixture setting '.$key);
    $row->set('value',$value);
    check($row->save(),'Fixture setting '.$key);
}
if ($translationTask==='seed') {
    $texts=CookieConsentTexts::defaults();
    $texts['locales']['ru']['reject']='Особый отказ';
    $texts['locales']['en']=['reject'=>'Custom refusal'];
    $texts['locales']['nl']=['banner_title'=>'Cookies op deze website'];
    setSetting('cookie_consent.texts',json_encode($texts,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR));
    setSetting('manager_language','ru');

    $options=CookieConsentSettings::defaults();
    $options['categories']['external_content']=true;
    setSetting('cookie_consent.options',json_encode($options,JSON_THROW_ON_ERROR));
    $services=CookieConsentServiceRegistry::defaults()['services'];
    foreach ($services as &$service) {
        if ($service['key']==='youtube') $service['enabled']=true;
    }
    unset($service);
    setSetting('cookie_consent.services',json_encode(['schema'=>1,'services'=>$services],JSON_THROW_ON_ERROR));

    $resource=$modx->getObject(ccClass('modResource'),1);
    check($resource,'Missing fixture homepage');
    $resource->fromArray(['template'=>0,'cacheable'=>0,'content'=><<<'HTML'
<!doctype html><html><head><meta charset="utf-8">[[!CookieConsentAssets]]</head><body>
<button type="button" id="reopen" data-cookie-settings-open data-cc-text="reopen">Fallback</button>
<button type="button" id="reopen-icon" data-cookie-settings-open><span aria-hidden="true">★</span><span data-cc-text="reopen">Fallback</span></button>
<button type="button" id="site-label" data-cookie-settings-open>Site-owned label</button>
<div data-cc-embed="youtube"><template><iframe src="https://player.example.test/video"></iframe></template></div>
[[!CookieConsentBanner]]</body></html>
HTML]);
    check($resource->save(),'Save fixture homepage');
} elseif ($translationTask==='language') {
    $language=CookieConsentTexts::language($argv[2]);
    $context=$modx->getObject(ccClass('modContextSetting'),['context_key'=>'web','key'=>'cultureKey'])
        ?: $modx->newObject(ccClass('modContextSetting'));
    $context->fromArray(['context_key'=>'web','key'=>'cultureKey','value'=>$language], '', true, true);
    check($context->save(),'Public culture setting');
} elseif ($translationTask==='legacy') {
    $options=CookieConsentSettings::read($modx)['options'];
    $options['buttons']['accept']=true;
    setSetting('cookie_consent.options',json_encode($options,JSON_THROW_ON_ERROR));
} elseif ($translationTask==='snapshot') {
    $keys=['cookie_consent.texts','cookie_consent.options','cookie_consent.services'];
    $values=[];
    foreach ($keys as $key) $values[$key]=$modx->getObject(ccClass('modSystemSetting'),['key'=>$key])->get('value');
    echo json_encode($values,JSON_THROW_ON_ERROR);
    exit;
} else {
    throw new RuntimeException('Unknown button translations fixture action');
}
$modx->cacheManager->refresh();
