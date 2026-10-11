<?php
declare(strict_types=1);
/** Per-IP file-based rate limiter and bounded 5-minute replay window. PHP >= 8.1. */
final class CookieConsentRateLimiter
{
    private string $logDir;
    private string $key;
    private int $limit;
    public function __construct(string $logDir, string $secret, int $limit)
    {
        $this->logDir = $logDir;
        $this->key = $secret;
        $this->limit = $limit;
    }
    public function check(string $ip, string $eventId): void
    {
        $rateDir = $this->logDir . '/.rate';
        if (!is_dir($rateDir) && !mkdir($rateDir, 0700) && !is_dir($rateDir)) throw new RuntimeException('Cannot create rate state directory');
        $file = $rateDir . '/' . hash_hmac('sha256',$ip,$this->key);
        $umask = umask(0077);
        try { $handle = @fopen($file,'c+'); } finally { umask($umask); }
        if ($handle === false) throw new RuntimeException('Cannot open rate limiter');
        try {
            if (!flock($handle, LOCK_EX)) throw new RuntimeException('Cannot lock rate limiter');
            $state = json_decode(stream_get_contents($handle) ?: '',true);
            $bucket = (int)floor(time()/60);
            $count = is_array($state) && ($state['bucket'] ?? null) === $bucket ? (int)($state['count'] ?? 0) : 0;
            $seen = is_array($state) && isset($state['seen']) && is_array($state['seen']) ? $state['seen'] : [];
            if (isset($seen[$eventId]) && is_int($seen[$eventId]) && $seen[$eventId] > time()-300) throw new DomainException('Duplicate event');
            if ($count >= $this->limit) throw new OverflowException('Rate limit exceeded');
            $now=time();
            $seen=array_filter($seen,static function($t)use($now){return is_int($t)&&$t>$now-300;});
            $seen=array_slice($seen,-300,null,true);
            $seen[$eventId]=$now;
            $serialized=json_encode(['bucket'=>$bucket,'count'=>$count+1,'seen'=>$seen]);
            rewind($handle);
            if (!ftruncate($handle,0) || fwrite($handle,$serialized) === false || !fflush($handle)) {
                throw new RuntimeException('Cannot update rate limiter');
            }
        } finally {
            flock($handle,LOCK_UN);
            fclose($handle);
        }
    }
}
