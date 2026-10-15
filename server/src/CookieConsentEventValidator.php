<?php
declare(strict_types=1);
/** Validate user-controlled consent event payloads (PHP >= 8.1). */
final class CookieConsentEventValidator
{
    private const EVENTS = [
        'analytics_allow'=>'draft','analytics_deny'=>'draft',
        'marketing_allow'=>'draft','marketing_deny'=>'draft',
        'reject'=>'committed','accept_all'=>'committed',
        'accept'=>'committed','save_settings'=>'committed',
        'external_content_allow'=>'draft','external_content_deny'=>'draft',
        'provider_allow'=>'draft','provider_deny'=>'draft','map_allow'=>'committed','map_deny'=>'committed'
    ];
    public static function validate(array $input, ?array $registry = null, ?array $categoryVisibility = null): array
    {
        $required = ['event_id','consent_id','event','stage','analytics','marketing','policy_version','page','timestamp'];
        $v2=array_key_exists('schema',$input);
        if ($v2) {
            if ($input['schema']!==2) throw new InvalidArgumentException('Unsupported schema');
            $required=array_merge($required,['schema','external_content','providers','provider']);
        }
        if (count($input) !== count($required) || array_diff($required,array_keys($input)) || array_diff(array_keys($input),$required)) {
            throw new InvalidArgumentException('Invalid field set');
        }
        $uuid = '/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/D';
        if (!is_string($input['event_id']) || !preg_match($uuid, $input['event_id']) ||
            !is_string($input['consent_id']) || !preg_match($uuid, $input['consent_id'])) {
            throw new InvalidArgumentException('Invalid event or consent ID');
        }
        if (!is_string($input['event']) || !isset(self::EVENTS[$input['event']]) ||
            !is_string($input['stage']) || self::EVENTS[$input['event']] !== $input['stage']) {
            throw new InvalidArgumentException('Invalid event/stage combination');
        }
        if (!is_bool($input['analytics']) || !is_bool($input['marketing'])) throw new InvalidArgumentException('Invalid categories');
        if (!$v2 && in_array($input['event'], ['accept','accept_all'], true) && (!$input['analytics'] || !$input['marketing'])) {
            throw new InvalidArgumentException('Invalid accept action');
        }
        if ($input['event'] === 'reject' && ($input['analytics'] || $input['marketing'])) throw new InvalidArgumentException('Invalid reject action');
        $expected = ['analytics_allow'=>['analytics',true], 'analytics_deny'=>['analytics',false],
                     'marketing_allow'=>['marketing',true], 'marketing_deny'=>['marketing',false]];
        if (isset($expected[$input['event']])) {
            [$field,$value] = $expected[$input['event']];
            if ($input[$field] !== $value) throw new InvalidArgumentException('Invalid toggle action');
        }
        if (!$v2 && in_array($input['event'],['external_content_allow','external_content_deny','provider_allow','provider_deny','map_allow','map_deny'],true)) throw new InvalidArgumentException('Schema 2 required');
        if ($v2) {
            if (!is_bool($input['external_content']) || !is_array($input['providers']) || count($input['providers'])>32) throw new InvalidArgumentException('Invalid provider permissions');
            // Only the caller's trusted server configuration can relax the historical all-visible contract.
            $visible=$categoryVisibility ?? ['analytics'=>true,'marketing'=>true,'external_content'=>true];
            if (count($visible)!==3 || array_diff(array_keys($visible),['analytics','marketing','external_content'])) throw new RuntimeException('Invalid category visibility');
            foreach ($visible as $category=>$shown) {
                if (!is_bool($shown)) throw new RuntimeException('Invalid category visibility');
                if (!$shown && $input[$category]) throw new InvalidArgumentException('Hidden category granted');
                if (in_array($input['event'],['accept','accept_all'],true) && $input[$category]!==$shown) throw new InvalidArgumentException('Incomplete accept all');
            }
            $services=[];
            foreach ($registry['services']??[] as $s) if ($s['enabled']) $services[$s['key']]=$s;
            foreach ($input['providers'] as $key=>$permission) {
                if (!is_string($key) || !preg_match('/^[a-z][a-z0-9_]{0,31}$/D',$key) || !is_bool($permission) || !isset($services[$key]) ||
                    ($permission && !$input[$services[$key]['category']])) throw new InvalidArgumentException('Invalid provider permission');
            }
            $providerEvent=in_array($input['event'],['provider_allow','provider_deny','map_allow','map_deny'],true);
            $target=$input['provider'];
            if ($providerEvent) {
                if (!is_string($target) || !isset($services[$target]) || !array_key_exists($target,$input['providers']) ||
                    $input['providers'][$target]!==str_ends_with($input['event'],'_allow')) throw new InvalidArgumentException('Invalid provider action');
                if (str_starts_with($input['event'],'map_') && !in_array($services[$target]['loader'],['google_maps','yandex_maps'],true)) throw new InvalidArgumentException('Invalid map provider');
            } elseif ($target!==null) throw new InvalidArgumentException('Unexpected provider target');
            if ($input['event']==='reject' && ($input['external_content'] || in_array(true,$input['providers'],true))) throw new InvalidArgumentException('Invalid reject');
            if (in_array($input['event'],['accept','accept_all'],true)) {
                foreach ($services as $key=>$s) if ($visible[$s['category']] && ($input['providers'][$key]??false)!==true) throw new InvalidArgumentException('Incomplete accept all');
            }
            if (in_array($input['event'],['external_content_allow','external_content_deny'],true) && $input['external_content']!==($input['event']==='external_content_allow')) throw new InvalidArgumentException('Invalid external toggle');
        }
        if (!is_string($input['policy_version']) || !preg_match('/^[A-Za-z0-9._-]{1,32}$/D',$input['policy_version'])) {
            throw new InvalidArgumentException('Invalid policy version');
        }
        if (!is_string($input['page']) || strlen($input['page']) > 256 ||
            strpos($input['page'],'/') !== 0 || str_starts_with($input['page'],'//') || preg_match('/[\x00-\x1F\x7F?#]/',$input['page'])) {
            throw new InvalidArgumentException('Invalid page');
        }
        if (!is_string($input['timestamp']) || !preg_match('/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/D',$input['timestamp'])) {
            throw new InvalidArgumentException('Invalid client timestamp');
        }
        $date=DateTimeImmutable::createFromFormat('!Y-m-d\TH:i:s.v\Z',$input['timestamp'],new DateTimeZone('UTC'));
        if (!$date || $date->format('Y-m-d\TH:i:s.v\Z')!==$input['timestamp']) throw new InvalidArgumentException('Invalid timestamp date');
        return $input;
    }
}
