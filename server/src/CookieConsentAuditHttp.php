<?php
declare(strict_types=1);
require_once __DIR__.'/CookieConsentAuditConfiguration.php';
/** Only the explicit Manager check posts to the trusted, configured audit endpoint. */
final class CookieConsentAuditHttp
{
    public static function post(string $origin,string $path,string $content): array {
        CookieConsentAuditConfiguration::validate(['site_origin'=>$origin,'rate_limit_key'=>str_repeat('x',32)]);
        if(!str_starts_with($path,'/')||str_starts_with($path,'//')||strpbrk($path,"\r\n?#")!==false)throw new RuntimeException('local_assets_required');
        $headers=['Content-Type: application/json','Origin: '.$origin,'User-Agent: CookieConsent-Manager-AuditCheck'];
        $url=$origin.$path;$host=parse_url($origin,PHP_URL_HOST);$port=parse_url($origin,PHP_URL_PORT);
        // Trusted local Docker fixture routing, never supplied by a Manager request.
        if(getenv('COOKIE_CONSENT_LOCAL_HTTP')==='1'&&getenv('CC_DB_PASSWORD')&&in_array($host,['127.0.0.1','localhost'],true)&&isset($_SERVER['SERVER_ADDR'])) {
            $target=getenv('COOKIE_CONSENT_LOCAL_HTTP_TARGET')?:('http://'.$_SERVER['SERVER_ADDR'].':80');
            $url=rtrim($target,'/').$path;$headers[]='Host: '.$host.($port?':'.$port:'');
        }
        $context=stream_context_create(['http'=>['method'=>'POST','content'=>$content,'header'=>implode("\r\n",$headers),'timeout'=>10,'follow_location'=>0,'ignore_errors'=>true],'ssl'=>['verify_peer'=>true,'verify_peer_name'=>true]]);
        $h=@fopen($url,'rb',false,$context);$responseHeaders=$http_response_header??[];$status=0;
        if(isset($responseHeaders[0])&&preg_match('~^HTTP/\S+ (\d+)~',$responseHeaders[0],$m))$status=(int)$m[1];
        $body=$h?stream_get_contents($h,8192):'';if($h)fclose($h);return ['status'=>$status,'body'=>$body];
    }
}
