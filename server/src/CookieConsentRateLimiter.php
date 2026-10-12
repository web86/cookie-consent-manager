<?php
declare(strict_types=1);
/** One bounded replay state and lock shared by IPs. Monthly audit files are never pruned. */
final class CookieConsentRateLimiter
{
    public function __construct(private string $logDir, private string $key, private int $limit) {}
    public function check(string $ip, string $eventId, callable $write): array
    {
        $rateDir=$this->logDir.'/.rate';
        if (is_link($rateDir)) throw new RuntimeException('Symlink state rejected');
        if (!is_dir($rateDir) && !@mkdir($rateDir,0700) && !is_dir($rateDir)) throw new RuntimeException('Cannot create state directory');
        $file=$rateDir.'/state.json';
        CookieConsentPrivatePath::file($file);
        $mask=umask(0077);
        try { $handle=@fopen($file,'c+'); } finally { umask($mask); }
        if (!$handle) throw new RuntimeException('Cannot open limiter');
        try {
            if (!flock($handle,LOCK_EX)) throw new RuntimeException('Cannot lock limiter');
            $raw=stream_get_contents($handle,2097153);
            if ($raw===false || strlen($raw)>2097152) throw new RuntimeException('Limiter state oversized');
            try { $state=$raw==='' ? [] : json_decode($raw,true,16,JSON_THROW_ON_ERROR); }
            catch (JsonException $e) { throw new RuntimeException('Corrupt internal state',0,$e); }
            if (!is_array($state)) throw new RuntimeException('Invalid limiter state');
            $now=time(); $bucket=(int)floor($now/60);
            $counts=($state['bucket']??null)===$bucket ? ($state['counts']??[]) : [];
            $seen=array_filter($state['seen']??[],static fn($t)=>is_int($t)&&$t>$now-300);
            if (isset($seen[$eventId])) throw new DomainException('Duplicate event');
            $ipKey=hash_hmac('sha256',$ip,$this->key);
            if (($counts[$ipKey]??0)>=$this->limit || count($seen)>=10000 || count($counts)>=10000) throw new OverflowException('Rate limit');
            $counts[$ipKey]=($counts[$ipKey]??0)+1; $seen[$eventId]=$now;
            $json=json_encode(['bucket'=>$bucket,'counts'=>$counts,'seen'=>$seen],JSON_THROW_ON_ERROR);
            // Reserve before append. A failed append stays a failed, non-replayable event;
            // client must use a new event ID. Never acknowledge before both writes succeed.
            rewind($handle);
            if (!ftruncate($handle,0)) throw new RuntimeException('Cannot truncate state');
            self::writeAll($handle,$json);
            if (!fflush($handle)) throw new RuntimeException('Cannot flush state');
            return $write();
        } finally { flock($handle,LOCK_UN); fclose($handle); }
    }
    public static function writeAll($handle, string $bytes): void
    {
        $written=0;
        while ($written<strlen($bytes)) {
            $n=fwrite($handle,substr($bytes,$written));
            if ($n===false || $n===0) throw new RuntimeException('Incomplete file write');
            $written+=$n;
        }
    }
}
