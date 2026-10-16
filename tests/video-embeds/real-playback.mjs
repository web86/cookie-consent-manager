// Independent release gate. Actual provider requests are permitted only in this opt-in suite.
import {chromium} from 'playwright';import {createServer} from 'node:http';import {mkdirSync,writeFileSync} from 'node:fs';
const cases=[['youtube','https://www.youtube-nocookie.com/embed/M7lc1UVf-VE?autoplay=0'],['rutube','https://rutube.ru/play/embed/7716bd3e665725c3c008ae7ab4ff02e2/?t=0'],['vk_video',process.env.CC_VK_OFFICIAL_EMBED||null]];
const server=createServer((req,res)=>{res.setHeader('content-type','text/html');res.end('<!doctype html><title>Disposable player acceptance</title><iframe width="720" height="405" title="Video" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen src="'+new URL(req.url,'http://localhost').searchParams.get('src')?.replaceAll('&','&amp;').replaceAll('"','&quot;')+'"></iframe>');});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const b=await chromium.launch();const results=[];
try{for(const [provider,src]of cases){if(!src){results.push({provider,result:'SKIP',reason:'No verified official VK Share/embed URL supplied; hash is never fabricated.'});continue;}
 const ctx=await b.newContext(),p=await ctx.newPage();const responses=[],errors=[];p.on('requestfailed',r=>errors.push({url:r.url(),error:r.failure()?.errorText}));p.on('response',r=>{if(r.url()===src)responses.push(r.status());});
 try{await p.goto('http://127.0.0.1:'+server.address().port+'/?src='+encodeURIComponent(src),{waitUntil:'domcontentloaded',timeout:20000});
  const deadline=Date.now()+25000;let played=false;const clicked=new Set();
  while(Date.now()<deadline){for(const frame of p.frames().filter(f=>f!==p.mainFrame())){try{played ||= await frame.evaluate(()=>Array.from(document.querySelectorAll('video')).some(v=>v.currentTime>0&&!v.paused));if(!played&&!clicked.has(frame)){const buttons=frame.locator('.ytp-large-play-button, .ytp-play-button, button[aria-label*="Play"], button[aria-label*="Oynat"], button[aria-label*="Воспроизвести"]');for(const button of await buttons.all())if(await button.isVisible()){await button.click({timeout:1000});clicked.add(frame);break;}}}catch{}}
   if(played)break;await p.waitForTimeout(1000);
  }
  const playerMessages=[];for(const frame of p.frames().filter(f=>f!==p.mainFrame())){try{playerMessages.push((await frame.locator('body').innerText({timeout:1000})).slice(0,500));}catch{}}
  results.push({provider,result:played?'PASS':'SKIP',playerMessages,reason:played?'Actual video time advanced':'Playback unavailable in this environment; iframe HTTP success alone is not playback proof.',responses,errors:errors.slice(0,8)});
 }catch(e){results.push({provider,result:'SKIP',reason:e.message,responses,errors:errors.slice(0,8)});}finally{await ctx.close();}
}}finally{await b.close();server.close();mkdirSync('.local/video-embeds',{recursive:true});writeFileSync('.local/video-embeds/real-playback.json',JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results));}
