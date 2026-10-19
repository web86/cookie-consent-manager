"""Isolated official MODX 3 fixtures, aliases disabled; existing sites are preserved."""
from pathlib import Path
import json,secrets,shutil,subprocess,sys,os,hashlib,zipfile
ROOT=Path(__file__).resolve().parents[2];LOCAL=ROOT/os.environ.get('CC_UNINSTALL_LOCAL','.local/uninstall3')
sys.path.insert(0,str(ROOT/'tests/modx3-matrix'))
import driver
driver.LOCAL=LOCAL
if __name__=='__main__':
 action=sys.argv[1]
 if action=='prepare':
  LOCAL.mkdir(exist_ok=False);cases=[]
  versions=[('3.2.4','8.2',23123,23)] if 'regression' in str(LOCAL) else [('3.1.2','8.1',23120,20),('3.2.4','8.2',23123,23)]
  for i,(version,php,old_port,subnet) in enumerate(versions):
   name='m'+version.replace('.','')+'p'+php.replace('.','');c=dict(name=name,modx=version+'-pl',php=php,port=(23420 if 'regression' in str(LOCAL) else 23410)+i)
   f=LOCAL/name;private=f/'private';private.mkdir(parents=True);(private/'disposable-marker').write_text(name+'\n')
   (private/'compose.env').write_text('CC_MATRIX_PASSWORD='+secrets.token_hex(24)+'\n');(private/'compose.env').chmod(0o600)
   shutil.copytree(ROOT/'.local/modx3-matrix/download'/('modx-'+version+'-pl'),f/'site');(f/'evidence').mkdir()
   text=(ROOT/'.local/modx3-first-public'/name/'compose.yaml').read_text().replace('name: cc3-first-public-','name: cc3-uninstall-'+('regression-' if 'regression' in str(LOCAL) else '')).replace(str(ROOT/'.local/modx3-first-public'),str(LOCAL)).replace(str(old_port),str(c['port'])).replace('10.220.'+str(subnet)+'.0/24','10.220.'+str((220 if 'regression' in str(LOCAL) else 210)+i)+'.0/24')
   (f/'compose.yaml').write_text(text);cases.append(c)
  (LOCAL/'cases.json').write_text(json.dumps(cases,indent=2)+'\n')
 elif action in ['setup','stop']:
  for c in json.loads((LOCAL/'cases.json').read_text()):
   if action=='stop':driver.compose(c,'stop');continue
   f=LOCAL/c['name']
   if (f/'evidence/setup-info.json').exists():raise RuntimeError('Existing setup preserved')
   with (f/'evidence/setup.log').open('a') as log:
    driver.compose(c,'up','-d',stdout=log,stderr=log)
    driver.compose(c,'exec','-T','web','php','/opt/cc-source/tests/public-install/fixture.php','prepare',stdout=log,stderr=log)
    driver.compose(c,'exec','-T','-w','/var/www/html/setup','web','php','index.php','--installmode=new','--config=/opt/cc-private/setup.xml',stdout=log,stderr=log)
    info=driver.compose(c,'exec','-T','web','php','/opt/cc-source/tests/public-install/fixture.php','finish',capture_output=True,text=True);json.loads(info.stdout);(f/'evidence/setup-info.json').write_text(info.stdout+'\n')
    driver.compose(c,'exec','-T','web','php','/opt/cc-source/tests/public-install/fixture.php','aliases','off',stdout=log,stderr=log)
   print('Ready '+c['name'],flush=True)
 elif action=='build':
  case=json.loads((LOCAL/'cases.json').read_text())[0];sig='cookieconsentmanager3-1.0.8-pl6';round_name=os.environ.get('CC_BUILD_ROUND','final')
  for label in [round_name+'/release',round_name+'/repro']:
   out=LOCAL/'artifacts'/label;out.mkdir(parents=True,exist_ok=False)
   with (out/'build.log').open('w') as log:driver.compose(case,'exec','-T','web','php','/opt/cc-source/_build/build.php','/var/www/html','/opt/cc-matrix/artifacts/'+label,stdout=log,stderr=log)
   archive=out/(sig+'.transport.zip');subprocess.run(['python3',str(ROOT/'_build/normalize.py'),str(archive)],check=True)
   r=driver.compose(case,'exec','-T','web','php','/opt/cc-source/_build/verify.php','/opt/cc-matrix/artifacts/'+label+'/'+archive.name,capture_output=True,text=True);(out/'verification.json').write_text(r.stdout)
   with zipfile.ZipFile(archive) as z:
    for name in z.namelist():
     body=z.read(name);assert b'components/cookieconsent/' not in body and b'components/cookieconsent3/' not in body and b'legacy_state' not in body,name
   print(r.stdout,flush=True)
  a=LOCAL/'artifacts'/round_name/'release'/archive.name;b=LOCAL/'artifacts'/round_name/'repro'/archive.name;assert a.read_bytes()==b.read_bytes();(LOCAL/'current-artifact.json').write_text(json.dumps({'folder':str(a.parent.relative_to(ROOT)),'sha256':hashlib.sha256(a.read_bytes()).hexdigest()})+'\n')
 else:raise ValueError(action)
