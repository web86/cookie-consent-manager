<?php
declare(strict_types=1);
require_once __DIR__.'/CookieConsentPrivatePath.php';
require_once __DIR__.'/CookieConsentAuditFormat.php';
/** No writes, indexes or PII copies. O(lines) scans and a bounded 50-record heap. */
final class CookieConsentAuditReader
{
    public const ACTIONS=['accept_all','accept','reject','save_settings','analytics_allow','analytics_deny','marketing_allow','marketing_deny','external_content_allow','external_content_deny','provider_allow','provider_deny','map_allow','map_deny'];
    private const FIELDS=['schema','server_time','event_id','consent_id','ip','user_agent','event','stage','categories','policy_version','page','client_time','providers','provider'];
    private string $directory;
    public function __construct(string $directory) {
        if($directory===''||$directory[0]!=='/'||str_contains($directory,"\0")||preg_match('~(?:^|/)\.\.?(/|$)~',$directory))throw new RuntimeException('logs_directory');
        clearstatcache();
        for($p=rtrim($directory,'/');$p!=='/'&&$p!=='';$p=dirname($p))if(is_link($p))throw new RuntimeException('logs_unsafe');
        $real=realpath($directory);
        if(!$real||$real!==rtrim($directory,'/')||!is_dir($real)||!is_readable($real))throw new RuntimeException('logs_directory');
        $this->directory=$real;
    }
    public static function filename(string $name): bool {return preg_match('/^[1-9][0-9]{3}-(?:0[1-9]|1[0-2])-cookie-consent\.log$/D',$name)===1;}
    public static function filters(array $input): array {
        $year=$input['year']??gmdate('Y');$month=$input['month']??'all';$action=$input['event']??'all';$search=$input['search']??'';
        foreach([$year,$month,$action,$search] as $v)if(!is_string($v))throw new InvalidArgumentException('logs_filters');
        if(($year!=='all'&&!preg_match('/^[1-9][0-9]{3}$/D',$year))||($month!=='all'&&!preg_match('/^(?:0[1-9]|1[0-2])$/D',$month))||($action!=='all'&&!preg_match('/^[a-z][a-z0-9_]{0,63}$/D',$action))||strlen($search)>512||!mb_check_encoding($search,'UTF-8')||str_contains($search,"\0"))throw new InvalidArgumentException('logs_filters');
        return ['year'=>$year,'month'=>$month,'event'=>$action,'search'=>$search];
    }
    private function checkDirectory(): void {
        clearstatcache(true);
        for($p=$this->directory;$p!==''&&$p!=='/';$p=dirname($p))if(is_link($p))throw new RuntimeException('logs_unsafe');
        if(realpath($this->directory)!==$this->directory)throw new RuntimeException('logs_unsafe');
    }
    private function open(string $name) {
        if(!self::filename($name))throw new InvalidArgumentException('logs_locator');
        $this->checkDirectory();$path=$this->directory.'/'.$name;
        try{CookieConsentPrivatePath::file($path);}catch(Throwable $e){throw new RuntimeException('logs_unsafe');}
        $before=@stat($path);$h=@fopen($path,'rb');
        if(!$before||!$h)throw new RuntimeException('logs_unreadable');
        $after=fstat($h);
        if(!$after||($after['mode']&0170000)!==0100000||$after['nlink']!==1||$before['dev']!==$after['dev']||$before['ino']!==$after['ino']){fclose($h);throw new RuntimeException('logs_unsafe');}
        try{$this->checkDirectory();}catch(Throwable $e){fclose($h);throw $e;}return $h;
    }
    public function snapshot(array $filters): array {
        $files=[];$years=[];
        foreach(new DirectoryIterator($this->directory) as $entry) {
            $name=$entry->getFilename();if(!self::filename($name))continue;
            $years[substr($name,0,4)]=true;
            if(($filters['year']!=='all'&&substr($name,0,4)!==$filters['year'])||($filters['month']!=='all'&&substr($name,5,2)!==$filters['month']))continue;
            $h=$this->open($name);
            try{if(!flock($h,LOCK_SH))throw new RuntimeException('logs_unreadable');$s=fstat($h);$files[$name]=['size'=>$s['size'],'ino'=>$s['ino'],'dev'=>$s['dev']];}
            finally{flock($h,LOCK_UN);fclose($h);}
        }
        krsort($files);$years=array_keys($years);rsort($years);return ['files'=>$files,'years'=>array_map('strval',$years)];
    }
    public static function record(array $data): array {
        if(!in_array($data['schema']??null,[1,2],true))throw new InvalidArgumentException('invalid_schema');
        foreach(['server_time','event_id','consent_id','ip','user_agent','event','stage','policy_version','page'] as $key)if(!is_string($data[$key]??null)||strlen($data[$key])>8192)throw new InvalidArgumentException('invalid_record');
        if(!preg_match('/^[a-z][a-z0-9_]{0,63}$/D',$data['event'])||!preg_match('/^[a-z][a-z0-9_]{0,63}$/D',$data['stage'])||!filter_var($data['ip'],FILTER_VALIDATE_IP))throw new InvalidArgumentException('invalid_record');
        foreach(['event_id','consent_id'] as $key)if(!preg_match('/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/iD',$data[$key]))throw new InvalidArgumentException('invalid_record');
        $time=$data['server_time'];
        if(!preg_match('/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]{1,6})?Z$/D',$time))throw new InvalidArgumentException('invalid_time');
        $date=DateTimeImmutable::createFromFormat(str_contains($time,'.')?'!Y-m-d\TH:i:s.u\Z':'!Y-m-d\TH:i:s\Z',$time,new DateTimeZone('UTC'));
        $errors=DateTimeImmutable::getLastErrors();if(!$date||($errors&&($errors['warning_count']||$errors['error_count'])))throw new InvalidArgumentException('invalid_time');
        if(!is_array($data['categories']??null)||!$data['categories'])throw new InvalidArgumentException('invalid_record');
        foreach($data['categories'] as $key=>$value)if(!in_array($key,['necessary','analytics','marketing','external_content'],true)||!is_bool($value))throw new InvalidArgumentException('invalid_record');
        foreach(['necessary','analytics','marketing'] as $key)if(!array_key_exists($key,$data['categories']))throw new InvalidArgumentException('invalid_record');
        if($data['schema']===2) {
            if(!array_key_exists('external_content',$data['categories'])||!is_array($data['providers']??null)||count($data['providers'])>256)throw new InvalidArgumentException('invalid_record');
            foreach($data['providers'] as $key=>$value)if(!preg_match('/^[a-z][a-z0-9_]{0,31}$/D',(string)$key)||!is_bool($value))throw new InvalidArgumentException('invalid_record');
        }
        if(isset($data['client_time'])&&!is_string($data['client_time']))throw new InvalidArgumentException('invalid_record');
        if(isset($data['provider'])&&(!is_string($data['provider'])||strlen($data['provider'])>32))throw new InvalidArgumentException('invalid_record');
        $known=array_intersect_key($data,array_flip(self::FIELDS));
        if($data['schema']===1){unset($known['providers'],$known['provider']);}
        return ['record'=>$known,'time'=>$date->format('Y-m-d\TH:i:s.u\Z'),'unknown'=>count(array_diff(array_keys($data),self::FIELDS))];
    }
    /** Snapshot sizes ignore later appends and never hold the writer lock during scans. */
    public function scan(array $snapshot): Generator {
        foreach($snapshot['files'] as $name=>$expected) {
            $h=$this->open($name);
            try {
                $s=fstat($h);if($s['size']<$expected['size']||$s['ino']!==$expected['ino']||$s['dev']!==$expected['dev'])throw new RuntimeException('logs_changed');
                foreach(CookieConsentAuditFormat::lines($h,$expected['size']) as $item) {
                    if(!isset($item['error'])){try{$item+=self::record($item['data']);unset($item['data']);}catch(InvalidArgumentException $e){$item=['line'=>$item['line'],'offset'=>$item['offset'],'error'=>$e->getMessage()];}}
                    yield ['file'=>$name]+$item;
                }
            }finally{fclose($h);}
        }
    }
    public static function matches(array $record,array $filters): bool {
        if($filters['event']!=='all'&&$record['event']!==$filters['event'])return false;
        if($filters['search']==='')return true;
        foreach(['ip','consent_id','event_id','page'] as $key)if(mb_stripos($record[$key],$filters['search'],0,'UTF-8')!==false)return true;
        return false;
    }
    private static function encode(array $data): string {return rtrim(strtr(base64_encode(json_encode($data,JSON_THROW_ON_ERROR)),'+/','-_'),'=');}
    private static function decode(string $value): array {
        if(strlen($value)>2048||!preg_match('/^[A-Za-z0-9_-]+$/D',$value))throw new InvalidArgumentException('logs_locator');
        try{$raw=base64_decode(strtr($value,'-_','+/'),true);$data=json_decode($raw?:'',true,8,JSON_THROW_ON_ERROR);}catch(Throwable $e){throw new InvalidArgumentException('logs_locator');}
        if(!is_array($data))throw new InvalidArgumentException('logs_locator');return $data;
    }
    public function query(array $filters,string $cursor='',?array $snapshot=null): array {
        $snapshot=$snapshot??$this->snapshot($filters);$after=null;$fingerprint=hash('sha256',$this->directory.json_encode($filters));
        if($cursor!==''){$c=self::decode($cursor);if(($c['query']??null)!==$fingerprint||!is_array($c['key']??null)||count($c['key'])!==3||!is_string($c['key'][0]??null)||!is_string($c['key'][1]??null)||!self::filename($c['key'][1])||!is_int($c['key'][2]??null)||$c['key'][2]<0)throw new InvalidArgumentException('logs_cursor');$after=$c['key'];}
        $heap=new class extends SplPriorityQueue {public function compare($a,$b): int{return -($a<=>$b);}};$heap->setExtractFlags(SplPriorityQueue::EXTR_BOTH);
        $total=0;$eligible=0;$invalid=0;$unknown=0;$diagnostics=[];$actions=array_fill_keys(self::ACTIONS,true);
        foreach($this->scan($snapshot) as $item) {
            if(isset($item['error'])){$invalid++;if(count($diagnostics)<100)$diagnostics[]=['file'=>$item['file'],'line'=>$item['line'],'code'=>$item['error']];continue;}
            if($item['unknown']){$unknown++;if(count($diagnostics)<100)$diagnostics[]=['file'=>$item['file'],'line'=>$item['line'],'code'=>'unknown_fields'];}
            $r=$item['record'];if(count($actions)<256)$actions[$r['event']]=true;
            if(!self::matches($r,$filters))continue;$total++;$key=[$item['time'],$item['file'],$item['offset']];
            if($after!==null&&$key>=$after)continue;$eligible++;
            if($heap->count()===50&&$key<=$heap->top()['priority'])continue;
            $summary=['server_time'=>$r['server_time'],'event'=>$r['event'],'locator'=>self::encode(['file'=>$item['file'],'offset'=>$item['offset'],'digest'=>$item['digest']])];
            $heap->insert($summary,$key);if($heap->count()>50)$heap->extract();
        }
        $rows=[];$last=null;while(!$heap->isEmpty()){$v=$heap->extract();$rows[]=$v['data'];if($last===null)$last=$v['priority'];}$rows=array_reverse($rows);
        return ['items'=>$rows,'total'=>$total,'next'=>$eligible>50?self::encode(['query'=>$fingerprint,'key'=>$last]):null,'years'=>$snapshot['years'],'actions'=>array_keys($actions),'filters'=>$filters,'invalid'=>$invalid,'unknown_fields'=>$unknown,'diagnostics'=>$diagnostics];
    }
    public function detail(string $locator): array {
        $l=self::decode($locator);if(!is_string($l['file']??null)||!self::filename($l['file'])||!is_int($l['offset']??null)||$l['offset']<0||!is_string($l['digest']??null)||!preg_match('/^[a-f0-9]{64}$/D',$l['digest']))throw new InvalidArgumentException('logs_locator');
        $h=$this->open($l['file']);try {
            if(!flock($h,LOCK_SH))throw new RuntimeException('logs_unreadable');$size=fstat($h)['size'];if($l['offset']>=$size)throw new RuntimeException('logs_changed');
            if($l['offset']>0){fseek($h,$l['offset']-1);if(fread($h,1)!=="\n")throw new InvalidArgumentException('logs_locator');}else rewind($h);
            foreach(CookieConsentAuditFormat::lines($h,$size) as $item){if(isset($item['error'])||!hash_equals($l['digest'],$item['digest']))throw new RuntimeException('logs_changed');return self::record($item['data'])['record'];}
            throw new RuntimeException('logs_changed');
        }finally{flock($h,LOCK_UN);fclose($h);}
    }
    public static function csvCell(string $value): string {return preg_match('/^[\x00-\x20]*[=+\-@]|^[\t\r\n]/',$value)?"'".$value:$value;}
    /** Two scans, one stable EOF snapshot, no temporary files. CSV uses physical file/line order. */
    public function csv($output,array $filters,array $snapshot,array $labels,int $warnings): int {
        fwrite($output,"\xEF\xBB\xBF");$columns=['server_time','event','ip','user_agent','consent_id','event_id','allowed','denied','providers','page','policy_version','stage','client_time','provider','schema','source','diagnostics'];
        fputcsv($output,array_map(fn($c)=>$labels['m.log_field_'.$c]??$c,$columns),';','"','');$count=0;
        foreach($this->scan($snapshot) as $item){if(isset($item['error'])||!self::matches($item['record'],$filters))continue;$r=$item['record'];$allowed=[];$denied=[];
            foreach($r['categories'] as $key=>$yes){$label=$labels[$key.'_name']??$key;if($yes)$allowed[]=$label;else $denied[]=$label;}
            $row=$r+['client_time'=>'','provider'=>''];$row['allowed']=implode(', ',$allowed);$row['denied']=implode(', ',$denied);$row['providers']=isset($r['providers'])?json_encode($r['providers']?:new stdClass(),JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR):'';$row['source']=$item['file'];$row['diagnostics']=$warnings?(string)$warnings:'';
            fputcsv($output,array_map(fn($c)=>self::csvCell((string)($row[$c]??'')),$columns),';','"','');$count++;
            if($count%1000===0){fflush($output);if(connection_aborted())break;}
        }return $count;
    }
}
