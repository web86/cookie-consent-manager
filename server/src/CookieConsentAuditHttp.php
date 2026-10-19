<?php
declare(strict_types=1);
require_once __DIR__.'/CookieConsentAuditConfiguration.php';
require_once __DIR__.'/CookieConsentAuditCheckException.php';
/** Only the explicit Manager check posts to the trusted, configured audit endpoint. */
final class CookieConsentAuditHttp
{
    public static function post(string $origin,string $path,string $content): array {
        CookieConsentAuditConfiguration::validate(['site_origin'=>$origin,'rate_limit_key'=>str_repeat('x',32)]);
        if(!str_starts_with($path,'/')||str_starts_with($path,'//')||strpbrk($path,"\r\n?#")!==false)throw new RuntimeException('local_assets_required');
        $headers=['Content-Type: application/json','Origin: '.$origin,'User-Agent: CookieConsent-Manager-AuditCheck'];
        $url=$origin.$path;
        $context=stream_context_create(['http'=>['method'=>'POST','content'=>$content,'header'=>implode("\r\n",$headers),'timeout'=>10,'follow_location'=>0,'ignore_errors'=>true],'ssl'=>['verify_peer'=>true,'verify_peer_name'=>true]]);
        // Capture warnings only to classify failure. Raw warnings can contain private IPs/URLs.
        $failure='network';
        set_error_handler(static function($severity,$message) use (&$failure){if(preg_match('/\bSSL operation failed\b|\bFailed to enable crypto\b|\bcertificate verify failed\b|\bPeer certificate\b/i',$message))$failure='tls';return true;});
        try {
            $h=fopen($url,'rb',false,$context);$responseHeaders=$http_response_header??[];
            $body=$h?stream_get_contents($h,8193):'';$meta=$h?stream_get_meta_data($h):[];if($h)fclose($h);
        } finally {restore_error_handler();}
        $status=0;
        if(isset($responseHeaders[0])&&preg_match('~^HTTP/\S+ (\d+)~',$responseHeaders[0],$m))$status=(int)$m[1];
        $type='';foreach($responseHeaders as $header)if(preg_match('~^Content-Type:\s*([^;\s]+)~i',$header,$m))$type=strtolower($m[1]);
        return ['status'=>$status,'body'=>is_string($body)?$body:'','content_type'=>$type,'failure'=>$failure,'incomplete'=>($meta['timed_out']??false)||$body===false||strlen((string)$body)>8192];
    }
    public static function acknowledgement(array $response,string $eventId): array {
        $status=$response['status'];$code='';
        // An allowlisted receiver code helps distinguish Origin rejection from a proxy 403.
        try{$body=json_decode($response['body'],true,8,JSON_THROW_ON_ERROR);if(is_array($body)&&is_string($body['error']??null))$code=$body['error'];}catch(JsonException $e){$body=null;}
        if($status!==200){
            $reason=match($status){0=>($response['failure']==='tls'?'audit_tls_failed':'audit_network_failed'),301,302,303,307,308=>'audit_http_redirect',400=>'audit_http_bad_request',403=>'audit_http_forbidden',404=>'audit_http_not_found',409=>'audit_http_duplicate',429=>'audit_http_rate_limited',503=>'audit_http_unavailable',default=>'audit_http_unexpected'};
            throw new CookieConsentAuditCheckException($reason,$status,$code);
        }
        if($response['incomplete']||$response['content_type']!=='application/json'||!is_array($body)||array_is_list($body)||count($body)!==3||($body['ok']??null)!==true||!is_string($body['event_id']??null)||!is_string($body['server_time']??null))throw new CookieConsentAuditCheckException('audit_response_malformed',200);
        if(!hash_equals($eventId,$body['event_id']))throw new CookieConsentAuditCheckException('audit_event_mismatch',200);
        $time=DateTimeImmutable::createFromFormat('!Y-m-d\TH:i:s\Z',$body['server_time'],new DateTimeZone('UTC'));
        if(!$time||$time->format('Y-m-d\TH:i:s\Z')!==$body['server_time'])throw new CookieConsentAuditCheckException('audit_response_malformed',200);
        return $body;
    }

}
