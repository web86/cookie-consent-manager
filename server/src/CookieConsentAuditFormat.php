<?php
declare(strict_types=1);
/** Header-aware, bounded line reader. Only the exact first-line marker is ignored. */
final class CookieConsentAuditFormat
{
    public const HEADER='# Cookie Consent Manager audit log';
    public const MAX_LINE=65536;
    /** Utility consumers fail explicitly on invalid lines instead of silently dropping them. */
    public static function records(string $file): Generator {
        $h=@fopen($file,'rb');if(!$h)throw new RuntimeException('logs_unreadable');
        try{if(!flock($h,LOCK_SH))throw new RuntimeException('logs_unreadable');foreach(self::lines($h,fstat($h)['size']) as $line){if(isset($line['error']))throw new RuntimeException('audit_log_corrupt');yield $line['data'];}}
        finally{flock($h,LOCK_UN);fclose($h);}
    }
    public static function lines($handle,int $size): Generator {
        $number=0;
        while(($offset=ftell($handle))!==false&&$offset<$size) {
            $number++;$remaining=$size-$offset;$line=fgets($handle,min(self::MAX_LINE+2,$remaining+1));
            if($line===false)throw new RuntimeException('logs_changed');
            $oversized=strlen($line)>self::MAX_LINE;
            if(!str_ends_with($line,"\n")&&ftell($handle)<$size) {
                $oversized=true;
                do {$tail=fgets($handle,min(self::MAX_LINE+2,$size-ftell($handle)+1));if($tail===false)throw new RuntimeException('logs_changed');}while(!str_ends_with($tail,"\n")&&ftell($handle)<$size);
            }
            $text=rtrim($line,"\r\n");
            if($offset===0&&$number===1&&!$oversized&&$text===self::HEADER)continue;
            $item=['line'=>$number,'offset'=>$offset];
            if($oversized){yield $item+['error'=>'oversized'];continue;}
            try{$data=json_decode($text,true,16,JSON_THROW_ON_ERROR);if(!is_array($data)||array_is_list($data))throw new JsonException();}
            catch(JsonException $e){yield $item+['error'=>'invalid_json'];continue;}
            yield $item+['data'=>$data,'digest'=>hash('sha256',$text)];
        }
    }
}
