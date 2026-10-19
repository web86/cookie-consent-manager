import {runInNewContext} from 'node:vm';import {readFileSync} from 'node:fs';import {execFileSync} from 'node:child_process';import assert from 'node:assert/strict';
const files=['youtube','rutube','vk-video'].map(n=>readFileSync(`assets/components/cookieconsentmanager/js/cookie-consent/embeds/${n}.js`,'utf8'));
const adapters=runInNewContext(files.join('\n')+';({youtube:web86YouTubeEmbed,rutube:web86RutubeEmbed,vk_video:web86VkVideoEmbed})');
let n=0;for(const [provider,url] of [['youtube','https://youtu.be/M7lc1UVf-VE?t=1m30s'],['rutube','https://rutube.ru/video/private/7716bd3e665725c3c008ae7ab4ff02e2/?p=secret'],['vk_video','https://vkvideo.ru/video_ext.php?oid=-1&id=2&hash=0123456789abcdef']]){
 const code=`require 'server/src/CookieConsentVideoUrl.php';echo CookieConsentVideoUrl::normalize($argv[1],$argv[2],['start'=>'30']);`;
 const normalized=execFileSync('php',['-r',code,provider,url],{encoding:'utf8'});assert.equal(adapters[provider].valid(new URL(normalized)),true);n++;
 for(const key of ['redirect','callback','origin']){const bad=new URL(normalized);bad.searchParams.set(key,'https://evil.test');assert.equal(adapters[provider].valid(bad),false);n++;}
 assert.equal(adapters[provider].valid(new URL(normalized.replace(new URL(normalized).hostname,'evil.test'))),false);n++;
}
console.log(JSON.stringify({result:'PASS',assertions:n}));
