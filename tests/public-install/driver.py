"""Operate only new marked first-public-release projects."""
import json,subprocess,sys
from concurrent.futures import ThreadPoolExecutor
from prepare import ROOT,LOCAL

def compose(c,*args,**kwargs):
 f=LOCAL/c['name'];assert (f/'private/disposable-marker').read_text().strip()==c['name']
 return subprocess.run(['docker','compose','--env-file',str(f/'private/compose.env'),'-f',str(f/'compose.yaml'),*args],cwd=ROOT,check=True,**kwargs)
def setup(c):
 f=LOCAL/c['name'];print('Setup '+c['name'],flush=True)
 if (f/'evidence/setup-info.json').exists():raise RuntimeError('Already installed')
 with (f/'evidence/setup.log').open('a') as log:
  compose(c,'up','-d',stdout=log,stderr=log)
  action='verify-prepared' if (f/'private/setup.xml').exists() else 'prepare'
  compose(c,'exec','-T','web','php','/opt/cc-source/tests/public-install/fixture.php',action,stdout=log,stderr=log)
  compose(c,'exec','-T','-w','/var/www/html/setup','web','php','index.php','--installmode=new','--config=/opt/cc-private/setup.xml',stdout=log,stderr=log)
  compose(c,'exec','-T','web','php','/opt/cc-source/tests/public-install/fixture.php','finish',stdout=log,stderr=log)
  r=compose(c,'exec','-T','web','php','/opt/cc-source/tests/public-install/fixture.php','aliases','off',capture_output=True,text=True)
  info=json.loads(r.stdout);assert info['aliases'] is False;(f/'evidence/setup-info.json').write_text(r.stdout+'\n')
if __name__=='__main__':
 cases=json.loads((LOCAL/'cases.json').read_text());cases=[c for c in cases if len(sys.argv)<3 or c['name'] in sys.argv[2:]]
 if sys.argv[1]=='setup':
  with ThreadPoolExecutor(max_workers=4) as pool:list(pool.map(setup,cases))
 elif sys.argv[1]=='stop':
  for c in cases:compose(c,'stop')
 else:raise ValueError(sys.argv[1])
