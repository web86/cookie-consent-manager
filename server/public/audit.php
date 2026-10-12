<?php
declare(strict_types=1);
// HTTP POST JSON adapter; configuration and logs must live outside DOCUMENT_ROOT.
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function respond(int $status, array $body): void {
    http_response_code($status);
    echo json_encode($body,JSON_UNESCAPED_SLASHES);
    exit;
}
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    respond(405,['ok'=>false,'error'=>'method_not_allowed']);
}
if (!preg_match('~^application/json(?:\s*;\s*charset=utf-8)?$~i',trim($_SERVER['CONTENT_TYPE'] ?? ''))) {
    respond(415,['ok'=>false,'error'=>'unsupported_media_type']);
}
$site = strtolower($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '');
if ($site !== '' && $site !== 'same-origin') respond(403,['ok'=>false,'error'=>'origin_forbidden']);
$length = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
if ($length > 8192 || $length < 0) respond(413,['ok'=>false,'error'=>'payload_too_large']);

try {
    require_once dirname(__DIR__).'/src/CookieConsentAuditConfiguration.php';
    $env=getenv('COOKIE_CONSENT_AUDIT_CONFIG');
    $configFile=is_string($env)&&$env!==''?$env:($GLOBALS['cookieConsentAuditConfigFile']??'');
    if (!is_string($configFile)) throw new RuntimeException('Audit config missing');
    $webroot=realpath($_SERVER['DOCUMENT_ROOT']??'');
    if (!$webroot) throw new RuntimeException('Document root required');
    $config=$GLOBALS['cookieConsentAuditOptions']??CookieConsentAuditConfiguration::load($configFile,$webroot,!$env);

    $origin = $config['site_origin'] ?? null;
    if (!is_string($origin) || !preg_match('~^https?://[a-z0-9.-]+(?::[0-9]{2,5})?$~iD',$origin) ||
        !isset($_SERVER['HTTP_ORIGIN']) ||
        !hash_equals(strtolower($origin),strtolower($_SERVER['HTTP_ORIGIN']))) {
        respond(403,['ok'=>false,'error'=>'origin_forbidden']);
    }
    // This value comes only from the initialized MODX 2 system setting.
    // Do not accept the log path from the HTTP request or public config.
    $dir=$GLOBALS['cookieConsentModxLogDir'] ?? null;
    require_once dirname(__DIR__).'/src/CookieConsentPrivatePath.php';
    if (!is_string($dir)) throw new RuntimeException('Missing MODX setting');
    require_once dirname(__DIR__).'/src/CookieConsentLogDirectory.php';
    $logDir=CookieConsentLogDirectory::validate($dir,$webroot,$origin);
    $key=$config['rate_limit_key'] ?? null;
    if (!is_string($key)) throw new RuntimeException('Missing rate key');
    $raw=file_get_contents('php://input',false,null,0,8193);
    if ($raw === false || strlen($raw) > 8192) respond(413,['ok'=>false,'error'=>'payload_too_large']);
    $input=json_decode($raw,true,16,JSON_THROW_ON_ERROR);
    if (!is_array($input) || array_is_list($input)) respond(400,['ok'=>false,'error'=>'invalid_payload']);

    require_once dirname(__DIR__).'/src/CookieConsentEventValidator.php';
    require_once dirname(__DIR__).'/src/CookieConsentRateLimiter.php';
    require_once dirname(__DIR__).'/src/CookieConsentAuditLogger.php';
    $logger=new CookieConsentAuditLogger($logDir,$key,(int)($config['rate_limit_per_minute'] ?? 60),$GLOBALS['cookieConsentServiceRegistry'] ?? null);
    $accepted=$logger->append($input,(string)($_SERVER['REMOTE_ADDR'] ?? ''),(string)($_SERVER['HTTP_USER_AGENT'] ?? ''));
    respond(200,['ok'=>true,'event_id'=>$accepted['event_id'],'server_time'=>$accepted['server_time']]);
} catch (DomainException $e) {
    respond(409,['ok'=>false,'error'=>'duplicate_event']);
} catch (OverflowException $e) {
    header('Retry-After: 60');
    respond(429,['ok'=>false,'error'=>'rate_limited']);
} catch (InvalidArgumentException | JsonException $e) {
    respond(400,['ok'=>false,'error'=>'invalid_payload']);
} catch (Throwable $e) {
    error_log('[CookieConsentAudit] Server error: '.get_class($e));
    respond(503,['ok'=>false,'error'=>'audit_unavailable']);
}
