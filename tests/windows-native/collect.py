from pathlib import Path
import os,json,re,shutil
base=Path(os.environ['CC_MATRIX_ROOT']);out=base/'results';out.mkdir(exist_ok=True)
result={'requested_php':os.environ['CC_REQUESTED_PHP'],'mode':os.environ['CC_NATIVE_CACHE_MODE'],'http_exit':int(os.environ.get('CC_HTTP_EXIT','999')),'cli_exit':int(os.environ.get('CC_CLI_EXIT','999')),'source_sha':os.environ['GITHUB_SHA'],'packages':'beta128 -> 1.0.9-pl1' if os.environ.get('CC_NATIVE_RELEASE_MODE')=='1' else 'beta128 -> beta129','scenarios':{}}
for scenario in ['http','cli','control']:
 work=base/scenario;info={'status':'PASS' if int(os.environ.get('CC_'+scenario.upper()+'_EXIT','999'))==0 else 'FAIL'}
 configFile=work/'private/config.json';secret=json.loads(configFile.read_text()).get('password','') if configFile.exists() else ''
 def clean(text):
  if secret:text=text.replace(secret,'[REDACTED]')
  text=re.sub(r'(?i)(HTTP_MODAUTH[=:])[a-z0-9]+',r'\1[REDACTED]',text)
  return re.sub(r'(?i)(rate_limit_key["\s:=]+)[a-f0-9]{64}',r'\1[REDACTED]',text)
 for f in (work/'evidence').glob('*') if (work/'evidence').exists() else []:
  if f.suffix in ['.json','.ndjson','.png']:
   if f.suffix=='.png':shutil.copyfile(f,out/(scenario+'-'+f.name))
   else:(out/(scenario+'-'+f.name)).write_text(clean(f.read_text(errors='replace')))
 for f in (work/'artifacts').glob('*.json') if (work/'artifacts').exists() else []:
  (out/(scenario+'-'+f.name)).write_text(clean(f.read_text(errors='replace')))
 trace=work/'evidence/stages.ndjson'
 if trace.exists():
  records=[]
  for line in trace.read_text(errors='replace').splitlines():
   try:records.append(json.loads(line))
   except ValueError:pass
  operations=[row for row in records if row['event'].startswith(('native.','cli.package.')) and row['sapi']==('cli-server' if scenario=='http' else 'cli')]
  info['last_native_operations']=operations[-10:]
 for name,path in [('modx',work/'private/core/cache/logs/error.log'),('php-main',work/'private/php-8091.log'),('php-audit',work/'private/php-8092.log')]:
  if path.exists():
   lines=[line for line in path.read_text(errors='replace').splitlines() if re.search(r'Fatal|Uncaught|Warning|Notice|ERROR|Cookie|uninstall|redeclare|opcache|JIT',line,re.I)]
   (out/(scenario+'-'+name+'.log')).write_text(clean('\n'.join(lines))+'\n')
 result['scenarios'][scenario]=info
result['control_exit']=int(os.environ.get('CC_CONTROL_EXIT','999'))
result['status']='PASS' if result['http_exit']==result['cli_exit']==result['control_exit']==0 else 'FAIL'
(out/'matrix-result.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:result[k] for k in ['requested_php','mode','http_exit','cli_exit','status']}))
