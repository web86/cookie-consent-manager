<?php
declare(strict_types=1);
require_once __DIR__.'/CookieConsentLogDirectory.php';
/** Local PHP I/O proof. No HTTP, consent event, directory creation or monthly-log writes. */
class CookieConsentAuditDirectoryCheck
{
    protected static function write($handle,string $bytes) {return fwrite($handle,$bytes);}
    protected static function read($handle,int $length) {return fread($handle,$length);}
    public static function check(string $directory,string $webroot): void {
        $dir=CookieConsentLogDirectory::validate($directory,$webroot);
        $file=$dir.'/.cc-audit-check-'.bin2hex(random_bytes(16)).'.tmp';
        $bytes='Cookie Consent PHP write/read check '.bin2hex(random_bytes(48))."\n";
        $umask=umask(0077);try{$h=@fopen($file,'x+b');}finally{umask($umask);}
        if(!$h)throw new RuntimeException('log_write_failed');
        $failure=null;$owned=fstat($h);
        try {
            self::identity($file,$owned);
            if(!flock($h,LOCK_EX))throw new RuntimeException('log_lock_failed');
            $offset=0;
            while($offset<strlen($bytes)){
                $written=static::write($h,substr($bytes,$offset));
                if(!is_int($written)||$written<1||$written>strlen($bytes)-$offset)throw new RuntimeException('log_write_failed');
                $offset+=$written;
            }
            if(!fflush($h)||fseek($h,0)!==0)throw new RuntimeException('log_read_failed');
            $actual='';
            while(strlen($actual)<strlen($bytes)){
                $part=static::read($h,strlen($bytes)-strlen($actual));
                if(!is_string($part)||$part==='')throw new RuntimeException('log_read_failed');
                $actual.=$part;
            }
            if(!hash_equals($bytes,$actual)||fstat($h)['size']!==strlen($bytes))throw new RuntimeException('log_read_failed');
            CookieConsentLogDirectory::validate($dir,$webroot);self::identity($file,$owned);
        }catch(Throwable $e){$failure=$e;}
        // Never unlink a file substituted by another writer or a symlink.
        try {self::identity($file,$owned);if(!@unlink($file))throw new RuntimeException('log_cleanup_failed');}
        catch(Throwable $e){$failure=$failure??$e;}
        finally{flock($h,LOCK_UN);fclose($h);}
        if($failure)throw $failure;
    }
    private static function identity(string $file,array $owned): void {
        clearstatcache(true,$file);$now=@lstat($file);
        if(!$now||($now['mode']&0170000)!==0100000||$now['nlink']!==1||$now['ino']!==$owned['ino']||$now['dev']!==$owned['dev'])throw new RuntimeException('log_unsafe_file');
    }
}
