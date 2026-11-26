<?php
declare(strict_types=1);

// Also embedded in native vehicles: uninstall must not load removable runtime files.
if (!class_exists('CookieConsentPath', false)) {
final class CookieConsentPath
{
    /** Separator spelling only, on the host OS. Never resolves dot segments or aliases. */
    public static function spelling(string $path): string
    {
        if ($path === '' || str_contains($path, "\0")) throw new RuntimeException('path_absolute');
        if (DIRECTORY_SEPARATOR === '\\') {
            $path = str_replace('\\', '/', $path);
            if (preg_match('~^[a-zA-Z]:/~', $path)) {
                $path = strtoupper($path[0]) . substr($path, 1);
                $prefix = substr($path, 0, 3);
            } elseif (preg_match('~^//[^/]+/[^/]+(?:/|$)~', $path, $m)) {
                $prefix = rtrim($m[0], '/') . '/';
            } else throw new RuntimeException('path_absolute');
            // Refuse device namespaces, ADS, Win32 trimming and reserved device aliases.
            foreach (explode('/', substr($path, str_starts_with($path, '//') ? 2 : 3)) as $part) {
                if ($part !== '' && (preg_match('/[<>:"|?*\x00-\x1f]/', $part) || preg_match('/[. ]$/', $part) || preg_match('/^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/iD', $part))) throw new RuntimeException('path_alias');
            }
        } else {
            if ($path[0] !== '/') throw new RuntimeException('path_absolute');
            $prefix = '/'; // Backslash remains an ordinary Unix filename character.
        }
        if (preg_match('~(?:^|/)\.\.?(/|$)~', $path)) throw new RuntimeException('path_traversal');
        $path = rtrim($path, '/');
        if (strlen($path) < strlen(rtrim($prefix, '/'))) throw new RuntimeException('path_absolute');
        return $path === rtrim($prefix, '/') ? $prefix : $path;
    }

    public static function parent(string $path): string
    {
        $path = self::spelling($path);
        if (self::isRoot($path)) return $path;
        return self::spelling(dirname($path));
    }

    public static function isRoot(string $path): bool
    {
        return $path === '/' || (DIRECTORY_SEPARATOR === '\\' && (preg_match('~^[A-Z]:/$~D', $path) || preg_match('~^//[^/]+/[^/]+/$~D', $path)));
    }

    /** Every existing ancestor must resolve to itself; catches parent junctions too. */
    public static function canonical(string $path): bool
    {
        try {
            $path = self::spelling($path);
            for ($p = $path;; $p = self::parent($p)) {
                clearstatcache(true, $p);
                $real = realpath($p);
                if ($real === false || is_link($p) || self::spelling($real) !== $p) return false;
                // readlink recognizes Windows mount-point reparse tags as well as symlinks.
                if (DIRECTORY_SEPARATOR === '\\' && @readlink($p) !== false) return false;
                if (self::isRoot($p)) return true;
            }
        } catch (RuntimeException $e) { return false; }
    }

    /** Validate missing targets through their nearest existing canonical directory. */
    public static function parentDirectory(string $path): string
    {
        $p = self::parent($path);
        while (!file_exists($p) && !is_link($p)) {
            $next = self::parent($p);
            if ($next === $p) throw new RuntimeException('path_parent');
            $p = $next;
        }
        if (!is_dir($p) || !self::canonical($p)) throw new RuntimeException('path_parent');
        return $p;
    }

    public static function regular(string $path): bool
    {
        return self::canonical($path) && is_file($path) && (stat($path)['nlink'] ?? 0) === 1;
    }

    public static function same(string $a, string $b): bool
    {
        return self::canonical($a) && self::canonical($b) && self::spelling($a) === self::spelling($b);
    }

    public static function inside(string $path, string $root): bool
    {
        return self::canonical($path) && self::canonical($root)
            && str_starts_with(self::spelling($path), rtrim(self::spelling($root), '/') . '/');
    }

    public static function writableTarget(string $file): void
    {
        $parent = self::parentDirectory($file);
        if (!is_writable($parent) || ((file_exists($file) || is_link($file)) && (!self::regular($file) || !is_writable($file)))) throw new RuntimeException('path_write');
    }
}
}
