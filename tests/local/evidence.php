<?php
if (PHP_SAPI!=='cli' || !is_dir('/opt/cc-source/tests/local')) exit(1);
$file='/opt/cc-private/logs/'.gmdate('Y-m').'-cookie-consent.log';
$counts=[];$ids=[];$example=null;
foreach (file($file,FILE_IGNORE_NEW_LINES) as $line) {
    $record=json_decode($line,true,16,JSON_THROW_ON_ERROR);
    $counts[(string)$record['schema']]=($counts[(string)$record['schema']]??0)+1;
    if (isset($ids[$record['event_id']])) throw new RuntimeException('Duplicate stored event ID');
    $ids[$record['event_id']]=true;
    if ($record['schema']===2 && $record['event']==='map_allow') {
        $record['ip']='<local REMOTE_ADDR>';$record['user_agent']='<test browser UA>';
        $record['consent_id']='<stable consent UUID>';$record['event_id']='<unique event UUID>';
        $example=$record;
    }
}
echo json_encode(['file'=>basename($file),'rows'=>array_sum($counts),'schemas'=>$counts,'unique_event_ids'=>count($ids),'sanitized_schema2'=>$example],JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR)."\n";
