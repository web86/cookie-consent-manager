<?php
// Pinned, package-local PSR-4 loader; Composer is not needed on the host.
spl_autoload_register(static function (string $class): void {
    if (!str_starts_with($class, 'Peast\\')) return;
    $relative = substr($class, 6);
    if (!preg_match('/^[A-Za-z0-9_\\\\]+$/D', $relative)) return;
    $file = __DIR__ . '/lib/Peast/' . str_replace('\\', '/', $relative) . '.php';
    if (is_file($file)) require_once $file;
});
