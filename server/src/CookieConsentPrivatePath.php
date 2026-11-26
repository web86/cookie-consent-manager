<?php
declare(strict_types=1);
require_once __DIR__.'/CookieConsentPath.php';
/** Existing canonical directories only; validate before causing filesystem writes. */
final class CookieConsentPrivatePath
{
    public static function directory(string $dir, string $documentRoot): string
    {
        if (!CookieConsentPath::canonical($documentRoot) || CookieConsentPath::isRoot(CookieConsentPath::spelling($documentRoot)) ||
            !CookieConsentPath::canonical($dir) || !is_dir($dir) || !is_writable($dir) ||
            !CookieConsentPath::outside($dir,$documentRoot)) throw new RuntimeException('Unsafe or unwritable log directory');
        return (string)realpath($dir);
    }
    public static function file(string $file): void
    {
        CookieConsentPath::parentDirectory($file);
        clearstatcache(true,$file);
        if (is_link($file) || (file_exists($file) && !CookieConsentPath::regular($file))) throw new RuntimeException('Unsafe audit/state file');
    }
}
