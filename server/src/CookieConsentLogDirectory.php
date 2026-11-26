<?php
declare(strict_types=1);
require_once __DIR__.'/CookieConsentPath.php';
require_once __DIR__.'/CookieConsentPrivatePath.php';
require_once __DIR__.'/CookieConsentAuditConfiguration.php';
final class CookieConsentLogDirectory
{
    /** Input spelling only; canonical() must still validate the real filesystem. */
    public static function input(string $dir,string $root,string $mode='absolute'): string {
        if(!in_array($mode,['site','absolute'],true))throw new InvalidArgumentException('log_mode');
        if($dir===''||str_contains($dir,"\0")||strpbrk($dir,"?#")!==false || (DIRECTORY_SEPARATOR!=='\\' && str_contains($dir,'\\')))throw new RuntimeException('log_path');
        if(DIRECTORY_SEPARATOR==='\\')$dir=str_replace('\\','/',$dir);
        if(preg_match('~(?:^|/)\.\.?(/|$)~',$dir))throw new RuntimeException('log_traversal');
        if($mode==='site'){
            if(DIRECTORY_SEPARATOR==='\\' && (str_contains($dir,':')||str_starts_with($dir,'//')))throw new RuntimeException('log_path');
            $dir=rtrim(CookieConsentPath::spelling($root),'/').'/'.ltrim($dir,'/');
        }
        return CookieConsentPath::spelling($dir);
    }
    public static function resolve(string $dir,string $root,string $mode='absolute'): string {
        return self::canonical(self::input($dir,$root,$mode),$root);
    }
    public static function canonical(string $dir,string $root): string {
        CookieConsentPath::spelling($dir);
        if(!file_exists($dir))throw new RuntimeException('log_missing');if(!is_dir($dir))throw new RuntimeException('log_not_directory');
        if(!CookieConsentPath::canonical($dir)||!CookieConsentPath::canonical($root))throw new RuntimeException('log_path');
        if(CookieConsentPath::same($dir,$root))throw new RuntimeException('log_root');if(!is_writable($dir))throw new RuntimeException('log_permissions');return (string)realpath($dir);
    }
    public static function inside(string $dir,string $root): bool {return CookieConsentPath::inside($dir,$root);}
    public static function validate(string $dir,string $root): string {return self::resolve($dir,$root);}
}
