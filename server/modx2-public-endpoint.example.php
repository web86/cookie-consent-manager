<?php
declare(strict_types=1);
/**
 * Install at /assets/components/cookieconsent/audit.php on a MODX 2 site.
 * Edit ONLY the private configuration and server code paths below.
 * Log location is read strictly from the MODX system setting:
 * cookie_consent.log_dir (absolute path OUTSIDE public webroot).
 *
 * This file lives in DOCUMENT_ROOT/assets/components/cookieconsent.
 */
if (!defined('MODX_API_MODE')) define('MODX_API_MODE', true);
require dirname(__DIR__, 3) . '/index.php';

if (!isset($modx) || !($modx instanceof modX)) {
    http_response_code(503);
    exit;
}
$GLOBALS['cookieConsentModxLogDir'] = (string)$modx->getOption('cookie_consent.log_dir', null, '');

putenv('COOKIE_CONSENT_AUDIT_CONFIG=/home/account/private/cookie-consent-config.php');
require '/home/account/private/cookie-consent-server/public/audit.php';
