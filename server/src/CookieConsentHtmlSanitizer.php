<?php
declare(strict_types=1);
final class CookieConsentHtmlSanitizer
{
    public static function clean(string $html): string
    {
        if (strlen($html)>16384 || !mb_check_encoding($html,'UTF-8')) throw new InvalidArgumentException('HTML length/encoding');
        $previous=libxml_use_internal_errors(true);
        try {
            $doc=new DOMDocument();
            $doc->loadHTML('<?xml encoding="UTF-8"><html><body>'.$html.'</body></html>',LIBXML_NONET);
            $body=$doc->getElementsByTagName('body')->item(0);
            return $body ? self::children($body) : '';
        } finally { libxml_clear_errors();libxml_use_internal_errors($previous); }
    }
    private static function children(DOMNode $node): string
    {
        $out='';foreach ($node->childNodes as $child) $out.=self::node($child);return $out;
    }
    private static function node(DOMNode $node): string
    {
        if ($node instanceof DOMText) return htmlspecialchars($node->nodeValue,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');
        if (!($node instanceof DOMElement)) return '';
        $tag=strtolower($node->tagName);
        if (in_array($tag,['script','style','iframe','object','embed','svg','math','template','form','input','textarea','button','link','meta','base','video','audio','img','noscript','head'],true)) return '';
        if (!in_array($tag,['a','p','br','strong','em','span'],true)) return self::children($node);
        $attributes='';
        if ($tag==='a') {
            $href=trim($node->getAttribute('href'));
            $parts=parse_url($href);
            $safe=$href!=='' && !preg_match('/[\x00-\x20\x7f\\\\]/',$href) && !str_starts_with($href,'//') && $parts!==false;
            if ($safe && isset($parts['scheme'])) $safe=in_array(strtolower($parts['scheme']),['https','http'],true) && !empty($parts['host']) && !isset($parts['user']) && !isset($parts['pass']);
            elseif ($safe) $safe=!str_contains($href,':');
            if ($safe) $attributes=' href="'.htmlspecialchars($href,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8').'"';
            if ($node->getAttribute('target')==='_blank') $attributes.=' target="_blank" rel="noopener noreferrer"';
        }
        return '<'.$tag.$attributes.'>'.($tag==='br' ? '' : self::children($node).'</'.$tag.'>');
    }
}
