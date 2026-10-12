<?php
declare(strict_types=1);
/** Existing canonical directories only; validate before causing filesystem writes. */
final class CookieConsentPrivatePath
{
    public static function directory(string $dir, string $documentRoot): string
    {
        if ($dir==='' || $dir[0]!=='/' || str_contains($dir,"\0") || preg_match('~(?:^|/)\.\.?(/|$)~',$dir)) throw new RuntimeException('Absolute canonical private directory required');
        $root=realpath($documentRoot);
        $real=realpath($dir);
        if ($root===false || $root==='/' || $real===false || !is_dir($real) || !is_writable($real) ||
            $real!==rtrim($dir,'/') || $real===$root || str_starts_with($real,$root.'/')) throw new RuntimeException('Unsafe or unwritable log directory');
        // Protect both descendants and parent aliases; a private dir must be admin-owned.
        for ($path=$dir; $path!=='/'; $path=dirname($path)) {
            if (is_link($path)) throw new RuntimeException('Symlink path rejected');
        }
        return $real;
    }
    public static function file(string $file): void
    {
        clearstatcache(true,$file);
        if (is_link($file) || (file_exists($file) && (!is_file($file) || (stat($file)['nlink']??0)!==1))) throw new RuntimeException('Unsafe audit/state file');
    }
}
