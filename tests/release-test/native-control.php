<?php
/** The native MODX 3 menu expects the session array available in HTTP Manager. */
declare(strict_types=1);
if(PHP_SAPI!=='cli')exit(1);
$_SESSION=[];
require '/opt/cc-source/tests/adapter-updates/control.php';
