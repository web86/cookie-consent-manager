<?php
declare(strict_types=1);
/** Full server registry; publicRegistry projects only reviewed runtime data. */
final class CookieConsentServiceRegistry
{
    public const CATALOG = [
        'yandex' => ['recommended_category'=>'analytics', 'hosts'=>['mc.yandex.ru','mc.yandex.com']],
        'mailru' => ['recommended_category'=>'analytics', 'hosts'=>['top-fwz1.mail.ru','top.mail.ru']],
        'vk_ads' => ['recommended_category'=>'marketing', 'hosts'=>['top-fwz1.mail.ru','top.mail.ru']],
        'meta_pixel' => ['recommended_category'=>'marketing', 'hosts'=>['connect.facebook.net','www.facebook.com']],
        'google_ga4' => ['recommended_category'=>'analytics', 'hosts'=>['www.googletagmanager.com','www.google-analytics.com','region1.google-analytics.com']],
        // Category recommends a default only; the administrator must configure tag-level consent checks.
        'google_gtm' => ['recommended_category'=>'marketing', 'hosts'=>['www.googletagmanager.com']],
        'google_ads' => ['recommended_category'=>'marketing', 'hosts'=>['www.googletagmanager.com','www.googleadservices.com','googleads.g.doubleclick.net','www.google.com']],
        'custom_js' => ['recommended_category'=>'marketing', 'hosts'=>[]],
        'mock_marketing' => ['recommended_category'=>'marketing', 'hosts'=>[]],
        'google_maps' => ['recommended_category'=>'external_content', 'hosts'=>['www.google.com','maps.googleapis.com','maps.gstatic.com']],
        'yandex_maps' => ['recommended_category'=>'external_content', 'hosts'=>['yandex.ru','api-maps.yandex.ru','maps.yandex.net']],
    ];
    public const BOOL_OPTIONS = [
        'yandex'=>['webvisor'=>true,'clickmap'=>true,'trackLinks'=>true,'accurateTrackBounce'=>true],
        'google_ga4'=>['send_page_view'=>true,'allow_google_signals'=>false,'allow_ad_personalization_signals'=>false],
        'google_ads'=>['allow_ad_personalization_signals'=>true,'restricted_data_processing'=>false],
        'google_maps'=>['show_title'=>true], 'yandex_maps'=>['show_title'=>true],
    ];
    /** Legacy visibility rule used only for the one-time category migration. */
    public static function visibleCategories(array $services): array
    {
        $visible=['necessary'=>true,'analytics'=>false,'marketing'=>false,'external_content'=>false];
        foreach($services as $service) if(($service['enabled']??false)===true && array_key_exists($service['category']??'',$visible)) $visible[$service['category']]=true;
        return $visible;
    }
    public static function defaults(): array
    {
        $services=[];
        foreach ([
            ['yandex','Яндекс.Метрика','Статистика посещений',false,['id'=>'23643118','webvisor'=>true,'clickmap'=>true,'trackLinks'=>true,'accurateTrackBounce'=>true]],
            ['mailru','Top.Mail.Ru','Статистика посещений',false,['id'=>'3265404']],
            ['google_ga4','Google Analytics 4','Статистика посещений',false,[]],
            ['google_gtm','Google Tag Manager','Контейнер тегов с отдельными consent checks для тегов',false,[]],
            ['google_ads','Google Ads','Рекламные измерения',false,[]],
            ['vk_ads','VK Реклама — пиксель','Рекламные измерения VK',false,[]],
            ['meta_pixel','Meta Pixel (Facebook / Instagram)','Рекламные измерения Meta',false,[]],
            ['google_maps','Google Maps','Внешние интерактивные карты',false,[]],
            ['yandex_maps','Яндекс.Карты','Внешние интерактивные карты',false,[]],
        ] as [$loader,$name,$purpose,$enabled,$config]) {
            $services[]=['key'=>$loader,'name'=>$name,'purpose'=>$purpose,'category'=>self::CATALOG[$loader]['recommended_category'],
                'enabled'=>$enabled,'loader'=>$loader,'config'=>$config ?: new stdClass()];
        }
        return ['schema'=>1,'services'=>$services];
    }
    /** Canonical root-relative local file. No decoding/normalization can change its identity. */
    public static function validScriptPath(mixed $path): bool
    {
        return is_string($path) && strlen($path)<=1024 &&
            preg_match('~^/(?:[A-Za-z0-9_-][A-Za-z0-9_.-]*/)*[A-Za-z0-9_-][A-Za-z0-9_.-]*\.js$~D',$path)===1;
    }
    public static function validateJson(string $json): array
    {
        if (strlen($json)>32768) throw new InvalidArgumentException('Registry too large');
        $data=json_decode($json,true,16,JSON_THROW_ON_ERROR);
        if (!is_array($data) || array_diff(array_keys($data),['schema','services']) ||
            ($data['schema']??null)!==1 || !isset($data['services']) || !is_array($data['services']) ||
            !array_is_list($data['services']) || count($data['services'])>32) throw new InvalidArgumentException('Invalid registry');
        $keys=[];
        foreach ($data['services'] as &$s) {
            $fields=['key','name','purpose','category','enabled','loader','config'];
            if (!is_array($s) || array_diff($fields,array_keys($s)) || array_diff(array_keys($s),array_merge($fields,['purpose_id']))) throw new InvalidArgumentException('Invalid service fields');
            if (!is_string($s['key']) || !preg_match('/^[a-z][a-z0-9_]{0,31}$/D',$s['key']) || isset($keys[$s['key']])) throw new InvalidArgumentException('Invalid service key');
            $keys[$s['key']]=true;
            if (array_key_exists('purpose_id',$s) && (!is_string($s['purpose_id']) || !preg_match('/^[a-z][a-z0-9_.-]{0,63}$/D',$s['purpose_id']))) throw new InvalidArgumentException('Invalid stable purpose');
            foreach (['name'=>100,'purpose'=>500] as $field=>$max) {
                if (!is_string($s[$field]) || $s[$field]==='' || strlen($s[$field])>$max || preg_match('/[\x00-\x1f\x7f<>]/',$s[$field])) throw new InvalidArgumentException('Invalid service text');
            }
            if (!is_string($s['loader']) || !isset(self::CATALOG[$s['loader']]) || !in_array($s['category'],['analytics','marketing','external_content'],true) || !is_bool($s['enabled']) || !is_array($s['config'])) throw new InvalidArgumentException('Invalid loader/category');
            // Retired integration option: accept only its historic boolean shape, then remove.
            // No fingerprint alias: browsers must explicitly approve the changed Yandex config.
            if ($s['loader']==='yandex' && array_key_exists('clientId',$s['config'])) {
                if (!is_bool($s['config']['clientId'])) throw new InvalidArgumentException('Invalid legacy boolean option');
                unset($s['config']['clientId']);
            }
            $allowed=array_merge($s['loader']==='custom_js' ? ['path'] : [],in_array($s['loader'],['yandex','mailru','google_ga4','google_gtm','google_ads','vk_ads','meta_pixel'],true) ? ['id'] : [],array_keys(self::BOOL_OPTIONS[$s['loader']]??[]));
            if (array_diff(array_keys($s['config']),$allowed)) throw new InvalidArgumentException('Unknown config');
            $pattern=match($s['loader']) {
                'google_ga4'=>'/^G-[A-Z0-9]{4,20}$/D', 'google_gtm'=>'/^GTM-[A-Z0-9]{4,20}$/D',
                'google_ads'=>'/^AW-[0-9]{4,20}$/D', default=>'/^[0-9]{1,20}$/D'
            };
            if (array_key_exists('id',$s['config']) && (!is_string($s['config']['id']) || !preg_match($pattern,$s['config']['id']))) throw new InvalidArgumentException('Invalid provider ID');
            if (in_array('id',$allowed,true) && $s['enabled'] && !array_key_exists('id',$s['config'])) throw new InvalidArgumentException('Enabled provider needs ID');
            foreach (self::BOOL_OPTIONS[$s['loader']]??[] as $key=>$default) if (array_key_exists($key,$s['config']) && !is_bool($s['config'][$key])) throw new InvalidArgumentException('Invalid boolean option');
            if ($s['loader']==='custom_js' && (!self::validScriptPath($s['config']['path']??null))) throw new InvalidArgumentException('Invalid script path');
            $s['config']=$s['config'] ?: new stdClass();
        }
        unset($s);
        $paths=[];$ids=[];
        foreach($data['services'] as $service){
            $service['config']=(array)$service['config'];
            if($service['loader']==='custom_js'){
                $path=$service['config']['path'];
                if(isset($paths[$path]))throw new InvalidArgumentException('Duplicate script path');
                $paths[$path]=true;
            }
            if($service['enabled'] && isset($service['config']['id'])){
                $id=$service['loader'].':'.preg_replace('/^0+(?=\d)/','',$service['config']['id']);
                if(isset($ids[$id]))throw new InvalidArgumentException('Duplicate provider ID');
                $ids[$id]=true;
            }
        }
        $analyticsIds=[];foreach($data['services'] as $service)if($service['enabled']&&$service['loader']==='mailru')$analyticsIds[ltrim($service['config']['id'],'0')?:'0']=true;
        foreach($data['services'] as $service)if($service['enabled']&&$service['loader']==='vk_ads'&&isset($analyticsIds[ltrim($service['config']['id'],'0')?:'0']))throw new InvalidArgumentException('pixel_id_conflict');
        return $data;
    }
    /** Project validated server data without changing stored settings or consent identity. */
    public static function publicRegistry(array $registry): array
    {
        $services=[];
        foreach ($registry['services'] as $service) {
            $public=[];
            foreach (['key','category','enabled','loader','config','purpose_id'] as $field) {
                if (array_key_exists($field,$service)) $public[$field]=$service[$field];
            }
            // A custom integration's declared purpose is part of its permission identity.
            if($service['loader']==='custom_js')$public['purpose']=$service['purpose'];
            $services[]=$public;
        }
        return ['schema'=>$registry['schema'],'services'=>$services];
    }
    public static function publicJson(string $json): string
    {
        return json_encode(self::publicRegistry(self::validateJson($json)),JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT|JSON_THROW_ON_ERROR);
    }
}
