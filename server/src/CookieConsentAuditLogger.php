<?php
declare(strict_types=1);
/** MODX-independent PHP 8.1+ JSONL audit logger. Client events are untrusted claims. */
final class CookieConsentAuditLogger
{
    private string $logDir;
    private string $rateLimitKey;
    private int $rateLimit;
    public function __construct(string $logDir, string $rateLimitKey, int $rateLimit = 60)
    {
        if ($rateLimit < 1 || strlen($rateLimitKey) < 32) throw new RuntimeException('Invalid audit configuration');
        if (!is_dir($logDir) && !mkdir($logDir, 0700, true) && !is_dir($logDir)) throw new RuntimeException('Cannot create log directory');
        $real = realpath($logDir);
        if ($real === false || !is_writable($real)) throw new RuntimeException('Log directory is not writable');
        $this->logDir = $real;
        $this->rateLimitKey = $rateLimitKey;
        $this->rateLimit = $rateLimit;
    }
    public function append(array $input, string $remoteAddr, string $userAgent): array
    {
        if (filter_var($remoteAddr, FILTER_VALIDATE_IP) === false) throw new InvalidArgumentException('Invalid client address');
        $validated = CookieConsentEventValidator::validate($input);
        (new CookieConsentRateLimiter($this->logDir, $this->rateLimitKey, $this->rateLimit))->check($remoteAddr, $validated['event_id']);
        $userAgent = substr(preg_replace('/[\x00-\x1F\x7F]/', ' ', $userAgent), 0, 512);
        $record = [
            'schema' => 1,
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
        $json = json_encode($record, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        $file = $this->logDir . DIRECTORY_SEPARATOR . gmdate('Y-m') . '-cookie-consent.log';
        $previousUmask = umask(0077);
        try { $handle = @fopen($file, 'ab'); } finally { umask($previousUmask); }
        if ($handle === false) throw new RuntimeException('Cannot open audit log');
        try {
            if (!flock($handle, LOCK_EX)) throw new RuntimeException('Cannot lock audit log');
            $line = $json . "\n";
            $written = 0;
            while ($written < strlen($line)) {
                $count = fwrite($handle, substr($line, $written));
                if ($count === false || $count === 0) throw new RuntimeException('Cannot append audit record');
                $written += $count;
            }
            if (!fflush($handle)) throw new RuntimeException('Cannot flush audit log');
        } finally {
            flock($handle, LOCK_UN);
            fclose($handle);
        }
        return ['event_id'=>$record['event_id'],'server_time'=>$record['server_time']];
    }
}
