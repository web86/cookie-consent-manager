<?php
declare(strict_types=1);
// CLI only. Without --apply this command is a dry run.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$configPath=getenv('COOKIE_CONSENT_AUDIT_CONFIG');
if (!$configPath || !is_file($configPath)) { fwrite(STDERR,"Config missing\n"); exit(1); }
$config=require $configPath;
$dir=realpath($config['log_dir'] ?? '');
if (!$dir || !is_dir($dir)) { fwrite(STDERR,"Log directory missing\n"); exit(1); }
$days=(int)($config['retention_days'] ?? 180);
if ($days < 30) { fwrite(STDERR,"Retention must be >= 30 days\n"); exit(1); }
$apply=in_array('--apply',$argv,true);
$count=0;
foreach (['/*-cookie-consent.log'=>$days,'/.rate/*'=>2] as $pattern=>$age) {
    foreach (glob($dir.$pattern) ?: [] as $file) {
        $name=basename($file);
        if ($age === 2 && !preg_match('/^[a-f0-9]{64}$/D',$name)) continue;
        if ($age !== 2 && !preg_match('/^\d{4}-(0[1-9]|1[0-2])-cookie-consent\.log$/D',$name)) continue;
        if (is_link($file) || !is_file($file) || filemtime($file) >= time()-$age*86400) continue;
        echo ($apply ? 'DELETE ' : 'DRY RUN ').$file.PHP_EOL;
        if ($apply && !unlink($file)) { fwrite(STDERR,"Deletion failed\n"); exit(1); }
        $count++;
    }
}
echo ($apply ? 'Deleted: ' : 'Candidates: ').$count.PHP_EOL;
