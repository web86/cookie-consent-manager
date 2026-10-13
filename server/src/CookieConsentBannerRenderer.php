<?php
declare(strict_types=1);
require_once __DIR__.'/CookieConsentSettings.php';
/** Fill structural markup once on the server, using the same resolver as preview/runtime. */
final class CookieConsentBannerRenderer
{
    public static function render(string $markup,array $strings,array $options,string $assets,string $mode='live',array $services=[]): string {
        $previous=libxml_use_internal_errors(true);
        try {
            $doc=new DOMDocument('1.0','UTF-8');$doc->loadHTML('<?xml encoding="UTF-8"><html><body>'.$markup.'</body></html>',LIBXML_NONET);
            $xpath=new DOMXPath($doc);$root=$xpath->query('//*[@id="cookie-block"]')->item(0);if(!$root)throw new RuntimeException('Banner root missing');
            foreach($xpath->query('//*[@data-cc-text]') as $node){$key=$node->getAttribute('data-cc-text');while($node->firstChild)$node->removeChild($node->firstChild);$node->appendChild($doc->createTextNode((string)($strings[$key]??'')));}
            foreach($xpath->query('//*[@data-cc-aria]') as $node)$node->setAttribute('aria-label',(string)($strings[$node->getAttribute('data-cc-aria')]??''));
            $notice=$xpath->query('//*[@data-cc-html="notice_html"]')->item(0);
            if($notice){while($notice->firstChild)$notice->removeChild($notice->firstChild);$fragment=new DOMDocument();$fragment->loadHTML('<?xml encoding="UTF-8"><html><body>'.CookieConsentHtmlSanitizer::clean((string)($strings['notice_html']??'')).'</body></html>',LIBXML_NONET);$body=$fragment->getElementsByTagName('body')->item(0);if($body)foreach($body->childNodes as $child)$notice->appendChild($doc->importNode($child,true));}
            $root->setAttribute('data-cc-mode',$mode==='mock'?'mock':'live');$root->setAttribute('data-cc-policy-version',$options['policy_version']);$root->setAttribute('data-cc-ttl-days',(string)$options['ttl_days']);$root->setAttribute('data-cc-audit-url',$assets.'components/cookieconsent/audit.php');
            $visible=CookieConsentServiceRegistry::visibleCategories($services);
            foreach($xpath->query('//*[@data-cc-category]') as $input){
                $category=$input->getAttribute('data-cc-category');$row=$input;
                while($row && $row->nodeName!=='label')$row=$row->parentNode;
                if($row instanceof DOMElement){$row->setAttribute('data-cc-category-row',$category);if($visible[$category]??false)$row->removeAttribute('hidden');else $row->setAttribute('hidden','');}
            }
            $buttons=CookieConsentSettings::effectiveButtons($options);foreach($buttons as $key=>$yes)$root->setAttribute('data-cc-show-'.str_replace('_','-',$key),$yes?'1':'0');
            foreach($xpath->query('//*[@data-cc-action]') as $button){$key=str_replace('-','_',$button->getAttribute('data-cc-action'));if(array_key_exists($key,$buttons)){if($buttons[$key])$button->removeAttribute('hidden');else $button->setAttribute('hidden','');}}
            // MODX/Fenom later passes must see data, never executable template delimiters.
            return str_replace(['[',']','{','}'],['&#91;','&#93;','&#123;','&#125;'],$doc->saveHTML($root));
        }finally{libxml_clear_errors();libxml_use_internal_errors($previous);}
    }
    public static function language($modx): string {
        return CookieConsentTexts::language((string)$modx->context->getOption('cultureKey',$modx->getOption('cultureKey',null,'en')));
    }
}
