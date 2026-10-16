<?php
declare(strict_types=1);
require_once __DIR__.'/../../server/src/CookieConsentEventValidator.php';
require_once __DIR__.'/../../server/src/CookieConsentRateLimiter.php';
require_once __DIR__.'/../../server/src/CookieConsentAuditLogger.php';
require_once __DIR__.'/../../server/src/CookieConsentAuditReader.php';
$n=0;function eq($a,$b,$message){global$n;$n++;if($a!==$b)throw new RuntimeException($message);}
$dir=sys_get_temp_dir().'/cc-category-audit-'.bin2hex(random_bytes(6));mkdir($dir,0700);$dir=realpath($dir);
try{
 $event=['event_id'=>'00000000-0000-4000-8000-000000000001','consent_id'=>'00000000-0000-4000-8000-000000000002','event'=>'reject','stage'=>'committed','analytics'=>false,'marketing'=>false,'policy_version'=>'1','page'=>'/fixture','timestamp'=>'2026-10-15T11:25:30.000Z'];
 $logger=new CookieConsentAuditLogger($dir,str_repeat('x',32));$logger->append($event,'192.0.2.1','Fixture');$file=$dir.'/'.gmdate('Y-m').'-cookie-consent.log';$old=file_get_contents($file);
 $next=$event+['schema'=>3,'external_content'=>false];$next['event_id']='00000000-0000-4000-8000-000000000003';$logger->append($next,'192.0.2.1','Fixture');
 eq(substr(file_get_contents($file),0,strlen($old)),$old,'Legacy JSONL bytes untouched');$reader=new CookieConsentAuditReader($dir);$filters=CookieConsentAuditReader::filters(['year'=>'all']);$query=$reader->query($filters);eq($query['total'],2,'Mixed historical/current records readable');
 $records=iterator_to_array(CookieConsentAuditFormat::records($file));eq(array_column($records,'schema'),[1,3],'Historical schema retained');$record=$records[1];eq(isset($record['providers'])||array_key_exists('provider',$record),false,'New JSONL has no individual permissions');eq((bool)preg_match('/Z$/D',$record['server_time']),true,'JSONL stays UTC');eq($record['categories'],['necessary'=>true,'analytics'=>false,'marketing'=>false,'external_content'=>false],'Only category choices');
 $stream=fopen('php://temp','w+');$reader->csv($stream,$filters,$reader->snapshot($filters),[],0);rewind($stream);$csv=stream_get_contents($stream);eq(str_contains($csv,$record['server_time']),true,'CSV preserves original UTC timestamp');fclose($stream);
 echo json_encode(['suite'=>'Mixed audit schemas / append-only UTC / category-only current records / CSV','tests'=>1,'assertions'=>$n,'failed'=>0,'result'=>'PASS'])."\n";
}finally{foreach(new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir,FilesystemIterator::SKIP_DOTS),RecursiveIteratorIterator::CHILD_FIRST) as $entry){if($entry->isDir())rmdir($entry->getPathname());else unlink($entry->getPathname());}rmdir($dir);}
