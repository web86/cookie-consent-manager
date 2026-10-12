<?php
declare(strict_types=1);
require_once __DIR__.'/CookieConsentPrivatePath.php';
require_once __DIR__.'/CookieConsentAuditConfiguration.php';
final class CookieConsentLogDirectory
{
    public const DENY="Require all denied\n";
    public static function resolve(string $dir,string $root,string $mode='absolute'): string {
        if(!in_array($mode,['site','absolute'],true))throw new InvalidArgumentException('log_mode');
        if($mode==='site') {
            if($dir===''||str_contains($dir,"\0")||strpbrk($dir,"\\?#")!==false||preg_match('~(?:^|/)\.\.?(/|$)~',$dir))throw new RuntimeException('log_traversal');
            $dir=rtrim($root,'/').'/'.ltrim($dir,'/');
        }
        return self::canonical($dir,$root);
    }
    public static function canonical(string $dir,string $root): string {
        if($dir===''||$dir[0]!=='/'||str_contains($dir,"\0"))throw new RuntimeException('log_path');
        if(preg_match('~(?:^|/)\.\.?(/|$)~',$dir))throw new RuntimeException('log_traversal');
        for($p=rtrim($dir,'/');$p!==''&&$p!=='/';$p=dirname($p))if(is_link($p))throw new RuntimeException('log_symlink');
        if(!file_exists($dir))throw new RuntimeException('log_missing');if(!is_dir($dir))throw new RuntimeException('log_not_directory');
        $real=realpath($dir);if(!$real||$real!==rtrim($dir,'/'))throw new RuntimeException('log_path');
        if($real===realpath($root))throw new RuntimeException('log_root');if(!is_writable($real))throw new RuntimeException('log_permissions');return $real;
    }
    public static function inside(string $dir,string $root): bool {return str_starts_with($dir,rtrim((string)realpath($root),'/').'/');}
    private static function apache(): void {
        if(!str_contains($_SERVER['SERVER_SOFTWARE']??'','Apache'))throw new RuntimeException('apache_required');
        foreach(['HTTP_CF_RAY','HTTP_X_AMZ_CF_ID','HTTP_VIA','HTTP_X_FORWARDED_FOR','HTTP_X_FORWARDED_HOST','HTTP_X_FORWARDED_PROTO'] as $key)
            if(!empty($_SERVER[$key]))throw new RuntimeException('direct_apache_required');
    }
    public static function prepare(string $dir,string $root): void {
        $dir=self::canonical($dir,$root);if(!self::inside($dir,$root))return;
        self::apache();
        $file=$dir.'/.htaccess';CookieConsentPrivatePath::file($file);
        if(!file_exists($file)){$h=fopen($file,'xb');if(!$h)throw new RuntimeException('guard_create');try{if(fwrite($h,self::DENY)!==strlen(self::DENY))throw new RuntimeException('guard_write');}finally{fclose($h);}chmod($file,0644);}
        // Existing administrator rules are preserved; only HTTP proof establishes protection.
    }
    public static function request(string $origin,string $path,array $headers=[],string $method='GET',string $content=''): array {
        CookieConsentAuditConfiguration::validate(['site_origin'=>$origin,'rate_limit_key'=>str_repeat('x',32)]);
        $url=$origin.$path;$host=parse_url($origin,PHP_URL_HOST);$port=parse_url($origin,PHP_URL_PORT);
        // Loopback fixtures publish a different host port; keep the real vhost Host header.
        if(getenv('COOKIE_CONSENT_LOCAL_PROBE')==='1'&&getenv('CC_DB_PASSWORD')&&in_array($host,['127.0.0.1','localhost'],true)&&isset($_SERVER['SERVER_ADDR'],$_SERVER['SERVER_PORT'])){$url='http://'.$_SERVER['SERVER_ADDR'].':80'.$path;$headers[]='Host: '.$host.($port?':'.$port:'');}
        $context=stream_context_create(['http'=>['method'=>$method,'content'=>$content,'header'=>implode("\r\n",array_merge(['Cache-Control: no-cache'], $headers)),'timeout'=>4,'follow_location'=>0,'ignore_errors'=>true],'ssl'=>['verify_peer'=>true,'verify_peer_name'=>true]]);
        $h=@fopen($url,'rb',false,$context);$responseHeaders=$http_response_header??[];$status=0;if(isset($responseHeaders[0])&&preg_match('~^HTTP/\S+ (\d+)~',$responseHeaders[0],$m))$status=(int)$m[1];$body=$h?stream_get_contents($h,8192):'';foreach($responseHeaders as $header)if(preg_match('/^(?:Via|CF-Ray|X-Amz-Cf-Id|X-Cache):/i',$header))$status=0;if($h)fclose($h);return ['status'=>$status,'body'=>$body];
    }
    public static function validate(string $dir,string $root,string $origin): string {
        $dir=self::canonical($dir,$root);if(!self::inside($dir,$root))return CookieConsentPrivatePath::directory($dir,$root);
        self::apache();
        CookieConsentPrivatePath::file($dir.'/.htaccess');
        $rate=$dir.'/.rate';if(is_link($rate))throw new RuntimeException('log_symlink');if(!is_dir($rate)&&!mkdir($rate,0700))throw new RuntimeException('rate_directory');if(realpath($rate)!==$rate)throw new RuntimeException('log_symlink');
        $nonce=bin2hex(random_bytes(16));$files=[$dir.'/cc-probe-'.$nonce.'.jsonl',$dir.'/cc-probe-'.$nonce.'.log',$rate.'/cc-probe-'.$nonce.'.json'];
        try {
            foreach($files as $file){$h=fopen($file,'xb');if(!$h)throw new RuntimeException('probe_create');try{fwrite($h,'{"safe_probe":"'.$nonce.'"}');}finally{fclose($h);}chmod($file,0600);}
            $targets=array_unique(array_merge($files,glob($dir.'/*.jsonl')?:[],glob($dir.'/*-cookie-consent.log')?:[],[$rate.'/state.json',$dir.'/'.gmdate('Y-m').'-cookie-consent.log']));
            foreach($targets as $file){CookieConsentPrivatePath::file($file);$path='/'.implode('/',array_map('rawurlencode',explode('/',substr($file,strlen(rtrim((string)realpath($root),'/'))+1))));
                foreach([$path,$path.'?cc_check='.$nonce] as $url){$r=self::request($origin,$url);if($r['status']!==403)throw new RuntimeException('http_protection_failed');}
            }
            return $dir;
        } finally {foreach($files as $file)if(is_file($file))unlink($file);}
    }
}
