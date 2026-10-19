from pathlib import Path
import subprocess,json,sys,concurrent.futures
ROOT=Path(__file__).resolve().parents[2];REPO=ROOT.parents[1];LOCAL=REPO/'.local/modstore-matrix'
BASE=['docker','compose','--env-file',str(LOCAL/'private/compose.env'),'-f',str(LOCAL/'compose.json')]
cases=json.loads((LOCAL/'cases.json').read_text())
if len(sys.argv)>2:cases=[c for c in cases if c['name'] in sys.argv[2:]]
def call(args,log=None):
 r=subprocess.run(BASE+args,stdout=log or subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
 if r.returncode:raise RuntimeError(str(args)+'\n'+str(r.stdout))
 return r.stdout
def cli(c,*args,root=False):
 return call(['exec','-T','--user','root' if root else 'www-data',c['name'],'php','/opt/cc-source/tests/modstore/fixture.php',*args])
def setup(c):
 f=LOCAL/c['name'];log=(f/'evidence/setup.log').open('a')
 log.write(cli(c,'prepare',root=True));log.flush()
 call(['exec','-T','-w','/var/www/html/setup',c['name'],'php','index.php','--installmode=new','--config=/opt/cc-case/private/setup.xml'],log)
 log.write(cli(c,'finish',root=True));log.close();print('READY',c['name'],flush=True)
if sys.argv[1]=='setup':
 call(['up','-d']);
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:list(pool.map(setup,[c for c in cases if not (LOCAL/c['name']/'private/manager.json').exists()]))
elif sys.argv[1]=='info':
 for c in cases:print(c['name'],cli(c,'info'))

elif sys.argv[1] in ['fresh','upgrade','remove']:
 def run(c):
  f=LOCAL/c['name'];sig='cookieconsentmanager'+('3' if c['major']==3 else '')+'-1.0.8-pl'+str(9 if c['major']==3 else 7)
  buildcase='m312p81' if c['major']==3 else 'm284p81'
  archive='/opt/cc-repo/.local/modstore-matrix/'+buildcase+'/evidence/release1/'+sig+'.transport.zip'
  results=[]
  if sys.argv[1]=='fresh':commands=[('install',archive),('configure',),('rebuild',),('cache',),('failure',),('rebuild',)]
  elif sys.argv[1]=='upgrade':
   old='cookieconsentmanager'+('3' if c['major']==3 else '')+'-1.0.8-pl'+str(7 if c['major']==3 else 5)
   # The preceding fresh run is removed first, exercising clean uninstall before the baseline upgrade.
   previous='/opt/cc-repo/.local/modstore-matrix/'+buildcase+'/evidence/build1/cookieconsentmanager'+('3' if c['major']==3 else '')+'-1.0.8-pl'+str(8 if c['major']==3 else 6)+'.transport.zip'
   commands=[('uninstall',previous),('verify-uninstall',),('install','/opt/cc-repo/dist/'+old+'.transport.zip'),('edit-old','syntax' if c['name'] in ['m284p81','m312p81'] else 'comment'),('install',archive),('verify-upgrade',),('repair-upgrade',),('install',archive),('verify-upgrade',),('configure',),('rebuild',),('cache',),('failure',),('rebuild',),('install',archive),('verify-upgrade',)]
  else:commands=[('snapshot-uninstall',),('uninstall',archive),('verify-uninstall',)]
  progress=f/'evidence'/('native-'+sys.argv[1]+'.json')
  if sys.argv[1]=='upgrade' and progress.exists():results=json.loads(progress.read_text())['checks'];commands=commands[len(results):]
  for args in commands:
   output=cli(c,*args);results.append({'action':args[0],'output':output});(f/'evidence'/('native-'+sys.argv[1]+'.json')).write_text(json.dumps({'case':c,'result':'RUNNING','checks':results},indent=2)+'\n')
  (f/'evidence'/('native-'+sys.argv[1]+'.json')).write_text(json.dumps({'case':c,'result':'PASS','checks':results},indent=2)+'\n');print('PASS',c['name'],sys.argv[1],flush=True)
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:list(pool.map(run,cases))
