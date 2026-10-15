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
            $options=CookieConsentSettings::categoryOptions($options,$services);$visible=['necessary'=>true]+$options['categories'];
            foreach(CookieConsentSettings::CATEGORIES as $category){$root->setAttribute('data-cc-category-'.str_replace('_','-',$category),$visible[$category]?'1':'0');$root->setAttribute('data-cc-category-version-'.str_replace('_','-',$category),(string)$options['category_versions'][$category]);}
            foreach($xpath->query('//*[@data-cc-category]') as $input){
                $category=$input->getAttribute('data-cc-category');$row=$input;
                while($row && $row->nodeName!=='label')$row=$row->parentNode;
                if($row instanceof DOMElement){$row->setAttribute('data-cc-category-row',$category);if($visible[$category]??false)$row->removeAttribute('hidden');else $row->setAttribute('hidden','');}
            }
            $buttons=CookieConsentSettings::effectiveButtons($options);foreach($buttons as $key=>$yes)$root->setAttribute('data-cc-show-'.str_replace('_','-',$key),$yes?'1':'0');
            foreach($xpath->query('//*[@data-cc-action]') as $button){$key=str_replace('-','_',$button->getAttribute('data-cc-action'));if(array_key_exists($key,$buttons)){if($buttons[$key])$button->removeAttribute('hidden');else $button->setAttribute('hidden','');}}
            // Only messages and templates needed for dynamic UI; no full dictionary in JSON.
            $messages=$doc->createElement('div');$messages->setAttribute('hidden','');$messages->setAttribute('data-cc-runtime-messages','');
            foreach(['error_ack','error_audit','error_storage','error_preference','error_random','error_registry','error_provider','error_buttons','map_title','map_disabled','map_rejected'] as $key){$node=$doc->createElement('span');$node->setAttribute('data-cc-message',$key);$node->appendChild($doc->createTextNode((string)($strings[$key]??$key)));$messages->appendChild($node);}$root->appendChild($messages);
            foreach($services as $service){
                if(($service['enabled']??false)!==true||!in_array($service['loader']??'',['google_maps','yandex_maps'],true))continue;
                $key=$service['key'];$provider=(string)($strings['service.'.$key.'.name']??$service['name']);
                $template=$doc->createElement('template');$template->setAttribute('data-cc-map-template',$key);
                $section=$doc->createElement('section');$section->setAttribute('class','cc-map-placeholder');
                $heading=$doc->createElement('h3');$heading->appendChild($doc->createTextNode((string)$strings['map_title']));if((((array)$service['config'])['show_title']??true)===false)$heading->setAttribute('hidden','');$section->appendChild($heading);
                $notice=$doc->createElement('p');$notice->appendChild($doc->createTextNode(str_replace('{provider}',$provider,(string)($strings['service.'.$key.'.map_notice']??$strings['map_notice']))));$section->appendChild($notice);
                $button=$doc->createElement('button');$button->setAttribute('type','button');$button->setAttribute('data-cc-map-load',$key);if(!$visible[$service['category']]){$button->setAttribute('hidden','');$button->setAttribute('disabled','');}$button->appendChild($doc->createTextNode(str_replace('{provider}',$provider,(string)$strings['map_load'])));$section->appendChild($button);
                $template->insertBefore($section,$template->firstChild);$root->appendChild($template);
            }
            // MODX/Fenom later passes must see data, never executable template delimiters.
            return str_replace(['[',']','{','}'],['&#91;','&#93;','&#123;','&#125;'],$doc->saveHTML($root));
        }finally{libxml_clear_errors();libxml_use_internal_errors($previous);}
    }
    public static function language($modx): string {
        return CookieConsentTexts::language((string)$modx->context->getOption('cultureKey',$modx->getOption('cultureKey',null,'en')));
    }
}
