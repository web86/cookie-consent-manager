<?php
declare(strict_types=1);
/** MODX-independent PHP 8.1+ JSONL audit logger. Client events are untrusted claims. */
final class CookieConsentAuditLogger
{
    private string $logDir;
    private string $rateLimitKey;
    private int $rateLimit;
    private ?array $registry;
    public function __construct(string $logDir, string $rateLimitKey, int $rateLimit = 60, ?array $registry = null)
    {
        if ($rateLimit < 1 || strlen($rateLimitKey) < 32) throw new RuntimeException('Invalid audit configuration');
        require_once __DIR__.'/CookieConsentPrivatePath.php';
        if (!is_dir($logDir)) throw new RuntimeException('Missing private directory');
        $real = realpath($logDir);
        if ($real === false || $real!==rtrim($logDir,'/') || is_link($logDir) || !is_writable($real)) throw new RuntimeException('Log directory is not canonical/writable');
        $this->logDir = $real;
        $this->rateLimitKey = $rateLimitKey;
        $this->rateLimit = $rateLimit;
        $this->registry = $registry;
    }
    public function append(array $input, string $remoteAddr, string $userAgent): array
    {
        if (filter_var($remoteAddr, FILTER_VALIDATE_IP) === false) throw new InvalidArgumentException('Invalid client address');
        $validated = CookieConsentEventValidator::validate($input,$this->registry);
        $userAgent = substr(preg_replace('/[\x00-\x1F\x7F]/', ' ', $userAgent), 0, 512);
        $record = [
            'schema' => $validated['schema'] ?? 1,
            'server_time' => gmdate('Y-m-d\TH:i:s\Z'),
            'event_id' => $validated['event_id'],
            'consent_id' => $validated['consent_id'],
            'ip' => $remoteAddr,
            'user_agent' => $userAgent,
            'event' => $validated['event'],
            'stage' => $validated['stage'],
            'categories' => ['necessary'=>true,'analytics'=>$validated['analytics'],'marketing'=>$validated['marketing']],
            'policy_version' => $validated['policy_version'],
            'page' => $validated['page'],
            'client_time' => $validated['timestamp']
        ];
        if (($validated['schema']??1)===2) {
            $record['categories']['external_content']=$validated['external_content'];
            $record['providers']=$validated['providers'] ?: new stdClass();
            $record['provider']=$validated['provider'];
        }
        $json = json_encode($record, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE | JSON_THROW_ON_ERROR);
        $file = $this->logDir . DIRECTORY_SEPARATOR . gmdate('Y-m') . '-cookie-consent.log';
        return (new CookieConsentRateLimiter($this->logDir,$this->rateLimitKey,$this->rateLimit))->check($remoteAddr,$validated['event_id'],function() use($file,$json,$record): array {
            CookieConsentPrivatePath::file($file);
            $previousUmask=umask(0077);
            try { $handle=@fopen($file,'c+b'); } finally { umask($previousUmask); }
            if (!$handle) throw new RuntimeException('Cannot open audit log');
            $position=null;
            try {
                if (!flock($handle,LOCK_EX) || fseek($handle,0,SEEK_END)!==0) throw new RuntimeException('Cannot lock/seek audit log');
                $position=ftell($handle);
                if ($position===false) throw new RuntimeException('Cannot locate end');
                CookieConsentRateLimiter::writeAll($handle,$json."\n");
                if (!fflush($handle)) throw new RuntimeException('Cannot flush audit');
            } catch (Throwable $e) {
                // Roll back a partial new record, never truncate historical records.
                if (is_int($position)) { ftruncate($handle,$position); fflush($handle); }
                throw $e;
            } finally { flock($handle,LOCK_UN); fclose($handle); }
            return ['event_id'=>$record['event_id'],'server_time'=>$record['server_time']];
        });
    }
}
