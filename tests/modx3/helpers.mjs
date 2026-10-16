import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
export const compose=['compose','--env-file','.local/modx3/private/compose.env','-f','tests/modx3/compose.yaml'];
export const cli=(service,args,input)=>execFileSync('docker',[...compose,'exec','-T',service,...args],{encoding:'utf8',input,maxBuffer:8*1024*1024}).trim();
export const control=(service,action,...args)=>JSON.parse(cli(service,['php','/opt/cc-source/tests/modx3/control.php',action,...args]));
export async function manager(browser,service='web',language='en'){
  cli(service,['php','/opt/cc-source/tests/modx3/guard.php']);
  const origin='http://127.0.0.1:'+({web:20888,clean:20889,fresh:20890,php82:20891,pristine:20892,finalclean:20893,finalfresh:20894,finalpristine:20895}[service]);
  const ctx=await browser.newContext({locale:language,viewport:{width:1440,height:1000}});
  await ctx.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  const p=await ctx.newPage(),credentials=control(service,'credentials');
  await p.goto(origin+'/manager/?manager_language='+language);
  await p.locator('#modx-login-username').fill(credentials.username);
  await p.locator('#modx-login-password').fill(credentials.password);
  await p.locator('#modx-login-btn').click();
  await p.waitForFunction(()=>window.MODx?.siteId);
  const token=await p.evaluate(()=>MODx.siteId);
  const core=async(action,form={})=>{
    const r=await ctx.request.post(origin+'/connectors/index.php',{headers:{modAuth:token},form:{action,HTTP_MODAUTH:token,...form},timeout:120000});
    return r.json();
  };
  const api=async(action,form={})=>{
    const r=await ctx.request.post(origin+'/assets/components/cookieconsent/connector.php',{headers:{modAuth:token},form:{action,HTTP_MODAUTH:token,...form},timeout:120000});
    return r.json();
  };
  const install=async(signature,folder)=>{
    const bytes=readFileSync(folder+'/'+signature+'.transport.zip'),expected=createHash('sha256').update(bytes).digest('hex'),existing=control(service,'artifact-hash',signature);
    let upload;
    if(existing){if(existing!==expected)throw Error('Refusing different immutable native ZIP');upload={success:true,reusedIdentical:true};}
    else {const r=await ctx.request.post(origin+'/connectors/index.php',{headers:{modAuth:token},multipart:{action:'workspace/packages/upload',HTTP_MODAUTH:token,file:{name:signature+'.transport.zip',mimeType:'application/zip',buffer:bytes}},timeout:120000});upload=await r.json();if(!upload.success)throw Error('Native upload: '+JSON.stringify(upload));}
    const scan=await core('workspace/packages/scanlocal');if(!scan.success)throw Error('Native scan: '+JSON.stringify(scan));
    const result=await core('workspace/packages/install',{signature});if(!result.success)throw Error('Native install: '+JSON.stringify(result));
    return {upload,scan,result};
  };
  return{ctx,p,origin,token,core,api,install};
}
