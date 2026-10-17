<?php
/** CLI session context expected by the native MODX 3 menu; isolated fixture guard lives in control.php. */
declare(strict_types=1);
if(PHP_SAPI!=='cli')exit(1);
$_SESSION=[];
require __DIR__.'/../adapter-updates/control.php';
