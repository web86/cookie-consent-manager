<?php
declare(strict_types=1);
/** Public metadata, never executable administrator-supplied code or HTML. */
final class CookieConsentServiceRegistry
{
    public const CATALOG = [
        'yandex' => ['category'=>'analytics', 'hosts'=>['mc.yandex.ru','mc.yandex.com']],
        'mailru' => ['category'=>'analytics', 'hosts'=>['top-fwz1.mail.ru','top.mail.ru']],
        'google_ga4' => ['category'=>'analytics', 'hosts'=>['www.googletagmanager.com','www.google-analytics.com','region1.google-analytics.com']],
        // A container is NOT a category. It has a conservative all-provider gate.
        'google_gtm' => ['category'=>'marketing', 'hosts'=>['www.googletagmanager.com']],
        'google_ads' => ['category'=>'marketing', 'hosts'=>['www.googletagmanager.com','www.googleadservices.com','googleads.g.doubleclick.net','www.google.com']],
        'mock_marketing' => ['category'=>'marketing', 'hosts'=>[]],
        'google_maps' => ['category'=>'external_content', 'hosts'=>['www.google.com','maps.googleapis.com','maps.gstatic.com']],
        'yandex_maps' => ['category'=>'external_content', 'hosts'=>['yandex.ru','api-maps.yandex.ru','maps.yandex.net']],
    ];
    public static function defaults(): array
    {
        $services=[];
        foreach ([
            ['yandex','Яндекс.Метрика','Статистика посещений',true,['id'=>'23643118','clientId'=>true]],
            ['mailru','Top.Mail.Ru','Статистика посещений',true,['id'=>'3265404']],
            ['google_ga4','Google Analytics 4','Статистика посещений',false,[]],
            ['google_gtm','Google Tag Manager','Контейнер: требует разрешения всех включённых сервисов',false,[]],
            ['google_ads','Google Ads','Рекламные измерения',false,[]],
            ['google_maps','Google Maps','Внешние интерактивные карты',true,[]],
            ['yandex_maps','Яндекс.Карты','Внешние интерактивные карты',true,[]],
        ] as [$loader,$name,$purpose,$enabled,$config]) {
            $services[]=['key'=>$loader,'name'=>$name,'purpose'=>$purpose,'category'=>self::CATALOG[$loader]['category'],
                'enabled'=>$enabled,'loader'=>$loader,'config'=>$config ?: new stdClass()];
        }
        return ['schema'=>1,'services'=>$services];
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
            if (!is_array($s) || count($s)!==count($fields) || array_diff($fields,array_keys($s)) || array_diff(array_keys($s),$fields)) throw new InvalidArgumentException('Invalid service fields');
            if (!is_string($s['key']) || !preg_match('/^[a-z][a-z0-9_]{0,31}$/D',$s['key']) || isset($keys[$s['key']])) throw new InvalidArgumentException('Invalid service key');
            $keys[$s['key']]=true;
            foreach (['name'=>100,'purpose'=>500] as $field=>$max) {
                if (!is_string($s[$field]) || $s[$field]==='' || strlen($s[$field])>$max || preg_match('/[\x00-\x1f\x7f<>]/',$s[$field])) throw new InvalidArgumentException('Invalid service text');
            }
            if (!is_string($s['loader']) || !isset(self::CATALOG[$s['loader']]) || $s['category']!==self::CATALOG[$s['loader']]['category'] || !is_bool($s['enabled']) || !is_array($s['config'])) throw new InvalidArgumentException('Invalid loader/category');
            $allowed=$s['loader']==='yandex' ? ['id','clientId'] : (in_array($s['loader'],['mailru','google_ga4','google_gtm','google_ads'],true) ? ['id'] : []);
            if (array_diff(array_keys($s['config']),$allowed)) throw new InvalidArgumentException('Unknown config');
            $pattern=match($s['loader']) {
                'google_ga4'=>'/^G-[A-Z0-9]{4,20}$/D', 'google_gtm'=>'/^GTM-[A-Z0-9]{4,20}$/D',
                'google_ads'=>'/^AW-[0-9]{4,20}$/D', default=>'/^[0-9]{1,20}$/D'
            };
            if (isset($s['config']['id']) && (!is_string($s['config']['id']) || !preg_match($pattern,$s['config']['id']))) throw new InvalidArgumentException('Invalid provider ID');
            if (in_array('id',$allowed,true) && $s['enabled'] && !isset($s['config']['id'])) throw new InvalidArgumentException('Enabled provider needs ID');
            if (isset($s['config']['clientId']) && !is_bool($s['config']['clientId'])) throw new InvalidArgumentException('Invalid ClientID flag');
            $s['config']=$s['config'] ?: new stdClass();
        }
        unset($s);
        return $data;
    }
    public static function publicJson(string $json): string
    {
        return json_encode(self::validateJson($json),JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT|JSON_THROW_ON_ERROR);
    }
}
