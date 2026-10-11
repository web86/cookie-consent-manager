<?php
declare(strict_types=1);
/** Validate user-controlled consent event payloads (PHP >= 8.1). */
final class CookieConsentEventValidator
{
    private const EVENTS = [
        'analytics_allow'=>'draft','analytics_deny'=>'draft',
        'marketing_allow'=>'draft','marketing_deny'=>'draft',
        'reject'=>'committed','accept_all'=>'committed',
        'accept'=>'committed','save_settings'=>'committed'
    ];
    public static function validate(array $input): array
    {
        $required = ['event_id','consent_id','event','stage','analytics','marketing','policy_version','page','timestamp'];
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
        if (in_array($input['event'], ['accept','accept_all'], true) && (!$input['analytics'] || !$input['marketing'])) {
            throw new InvalidArgumentException('Invalid accept action');
        }
        if ($input['event'] === 'reject' && ($input['analytics'] || $input['marketing'])) throw new InvalidArgumentException('Invalid reject action');
        $expected = ['analytics_allow'=>['analytics',true], 'analytics_deny'=>['analytics',false],
                     'marketing_allow'=>['marketing',true], 'marketing_deny'=>['marketing',false]];
        if (isset($expected[$input['event']])) {
            [$field,$value] = $expected[$input['event']];
            if ($input[$field] !== $value) throw new InvalidArgumentException('Invalid toggle action');
        }
        if (!is_string($input['policy_version']) || !preg_match('/^[A-Za-z0-9._-]{1,32}$/D',$input['policy_version'])) {
            throw new InvalidArgumentException('Invalid policy version');
        }
        if (!is_string($input['page']) || strlen($input['page']) > 256 ||
            strpos($input['page'],'/') !== 0 || preg_match('/[\x00-\x1F\x7F?#]/',$input['page'])) {
            throw new InvalidArgumentException('Invalid page');
        }
        if (!is_string($input['timestamp']) || !preg_match('/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/D',$input['timestamp'])) {
            throw new InvalidArgumentException('Invalid client timestamp');
        }
        return $input;
    }
}
