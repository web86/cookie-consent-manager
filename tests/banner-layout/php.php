<?php
/** Read-only compatibility, localization and output-safety contracts. */
declare(strict_types=1);
require_once __DIR__.'/../../server/src/CookieConsentBannerRenderer.php';
$n=0;
function eq($a,$b,$message){global $n;$n++;if($a!==$b)throw new RuntimeException($message);}
function reject($fn){global $n;try{$fn();}catch(InvalidArgumentException $e){$n++;return;}throw new RuntimeException('Expected invalid setting rejection');}
$defaults=CookieConsentSettings::defaults();$old=$defaults;unset($old['banner_position']);
foreach([$old,array_diff_key($old,['categories'=>1,'category_versions'=>1])] as $legacy){
 $options=CookieConsentSettings::categoryOptions($legacy,[]);eq($options['banner_position'],'bottom','Legacy payload receives bottom layout');
 eq($options['policy_version'],$old['policy_version'],'Visual default preserves policy');eq($options['category_versions'],$old['category_versions'],'Visual default preserves category versions');
}
foreach(['bottom','bottom-right','bottom-left'] as $position){$options=$old;$options['banner_position']=$position;eq(CookieConsentSettings::options($options)['banner_position'],$position,'Valid position');}
foreach(['top','',null,[],false,42] as $position){$options=$old;$options['banner_position']=$position;reject(fn()=>CookieConsentSettings::options($options));}
foreach(['categories','category_versions'] as $key){$options=$defaults;unset($options[$key]);reject(fn()=>CookieConsentSettings::options($options));}
$texts=CookieConsentTexts::defaults();
foreach(['ru','en','tr'] as $language)eq(CookieConsentTexts::resolve($texts,$language)['banner_title'],'','Old installations have no title');
$texts['locales']['ru']['banner_title']='Мы используем cookie';$texts['locales']['en']=['banner_title'=>'We use cookies'];$texts['locales']['tr']=['banner_title'=>''];
$texts=CookieConsentTexts::validate($texts);
eq(CookieConsentTexts::resolve($texts,'ru')['banner_title'],'Мы используем cookie','RU translation');
eq(CookieConsentTexts::resolve($texts,'en')['banner_title'],'We use cookies','EN translation');
eq(CookieConsentTexts::resolve($texts,'de')['banner_title'],'Мы используем cookie','Missing title inherits base');
eq(CookieConsentTexts::resolve($texts,'tr')['banner_title'],'','Explicit empty title does not fall back');
eq(CookieConsentTexts::validate(json_decode(json_encode($texts),true)),$texts,'Translation save roundtrip');
$invalid=$texts;$invalid['locales']['en']['banner_title']='<script>alert(1)</script>';reject(fn()=>CookieConsentTexts::validate($invalid));
$preview=CookieConsentTexts::validate($invalid,true);eq($preview['locales']['en']['banner_title'],'<script>alert(1)</script>','Preview accepts literal markup in unsaved title only');
reject(fn()=>CookieConsentTexts::validate($preview));
$other=$texts;$other['locales']['en']['reject']='<b>Reject</b>';reject(fn()=>CookieConsentTexts::validate($other,true));
$control=$texts;$control['locales']['en']['banner_title']="bad\nline";reject(fn()=>CookieConsentTexts::validate($control,true));
$markup=file_get_contents(__DIR__.'/../../CookiesPopup.html');
foreach(['bottom','bottom-right','bottom-left'] as $position)foreach([false,true] as $legacy)foreach(['','  ','Title & <img src=x onerror=alert(1)> [[!Never]] {$never}'] as $title){
 $options=$defaults;$options['banner_position']=$position;$options['buttons']['accept']=$legacy;
 $strings=CookieConsentTexts::resolve($texts,'en');$strings['banner_title']=$title;
 $html=CookieConsentBannerRenderer::render($markup,$strings,$options,'/assets/');$doc=new DOMDocument();@$doc->loadHTML($html);$xp=new DOMXPath($doc);
 $nodes=$xp->query('//*[contains(concat(" ",normalize-space(@class)," ")," cookie-warning-title ")]');
 eq($nodes->length,trim($title)===''?0:1,'Only nonempty title gets a heading');
 if(trim($title)!==''){eq($nodes->item(0)->tagName,'h2','Semantic heading');eq($nodes->item(0)->textContent,$title,'Title rendered as literal text');eq($xp->query('//img|//script')->length,0,'Unsafe title never becomes HTML');eq(str_contains($html,'[[!Never]]'),false,'MODX delimiters encoded');}
 $root=$xp->query('//*[@id="cookie-block"]')->item(0);eq(str_contains($root->getAttribute('class'),'cookie-warning--'),$position!=='bottom','Default layout has no modifier');
 eq($root->getAttribute('data-cc-policy-version'),'1','Presentation does not change consent version');
}
foreach(['ru','en'] as $language)foreach(['banner_title','banner_title_help','banner_appearance','banner_position','banner_position_bottom','banner_position_bottom-right','banner_position_bottom-left'] as $key)eq(CookieConsentTexts::lexicon($language)['m.'.$key]!=='',true,'Manager translation '.$language.' '.$key);
echo json_encode(['result'=>'PASS','assertions'=>$n,'failed'=>0])."\n";
