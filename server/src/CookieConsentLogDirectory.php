<?php
declare(strict_types=1);
require_once __DIR__.'/CookieConsentPrivatePath.php';
require_once __DIR__.'/CookieConsentAuditConfiguration.php';
final class CookieConsentLogDirectory
{
    /** Lexical normalization does not touch the filesystem. */
    public static function input(string $dir,string $root,string $mode='absolute'): string {
        if(!in_array($mode,['site','absolute'],true))throw new InvalidArgumentException('log_mode');
        if($dir===''||str_contains($dir,"\0")||strpbrk($dir,"\\?#")!==false)throw new RuntimeException('log_path');
        if(preg_match('~(?:^|/)\.\.?(/|$)~',$dir))throw new RuntimeException('log_traversal');
        if($mode==='site')$dir=rtrim($root,'/').'/'.ltrim($dir,'/');
        if($dir[0]!=='/')throw new RuntimeException('log_path');
        return rtrim($dir,'/');
    }
    public static function resolve(string $dir,string $root,string $mode='absolute'): string {
        return self::canonical(self::input($dir,$root,$mode),$root);
    }
    public static function canonical(string $dir,string $root): string {
        if($dir===''||$dir[0]!=='/'||str_contains($dir,"\0"))throw new RuntimeException('log_path');
        if(preg_match('~(?:^|/)\.\.?(/|$)~',$dir))throw new RuntimeException('log_traversal');
        for($p=rtrim($dir,'/');$p!==''&&$p!=='/';$p=dirname($p))if(is_link($p))throw new RuntimeException('log_symlink');
        if(!file_exists($dir))throw new RuntimeException('log_missing');if(!is_dir($dir))throw new RuntimeException('log_not_directory');
        $real=realpath($dir);if(!$real||$real!==rtrim($dir,'/'))throw new RuntimeException('log_path');
        if($real===realpath($root))throw new RuntimeException('log_root');if(!is_writable($real))throw new RuntimeException('log_permissions');return $real;
    }
    public static function inside(string $dir,string $root): bool {return str_starts_with($dir,rtrim((string)realpath($root),'/').'/');}
    public static function validate(string $dir,string $root): string {
        return self::resolve($dir,$root);
    }
}
