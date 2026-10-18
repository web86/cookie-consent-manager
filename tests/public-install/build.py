"""Native MODX 3 builds; no MODX 2 builder or legacy aliases."""
import json,subprocess,zipfile
from prepare import ROOT,LOCAL
from driver import compose
case=json.loads((LOCAL/'cases.json').read_text())[0];sig='cookieconsentmanager3-1.0.8-pl5'
for label in ['release','reproducible']:
 out=LOCAL/'artifacts'/label;out.mkdir(parents=True,exist_ok=False)
 with (out/'build.log').open('w') as log:compose(case,'exec','-T','web','php','/opt/cc-source/_build/build.php','/var/www/html','/opt/cc-matrix/artifacts/'+label,stdout=log,stderr=log)
 archive=out/(sig+'.transport.zip');subprocess.run(['python3',str(ROOT/'_build/normalize.py'),str(archive)],check=True)
 r=compose(case,'exec','-T','web','php','/opt/cc-source/_build/verify.php','/opt/cc-matrix/artifacts/'+label+'/'+archive.name,capture_output=True,text=True);(out/'verification.json').write_text(r.stdout)
 with zipfile.ZipFile(archive) as z:
  for name in z.namelist():
   body=z.read(name);assert b'components/cookieconsent/' not in body,name
   assert b'components/cookieconsent3/' not in body,name
   assert b'legacy_state' not in body,name
 print(r.stdout,flush=True)
a=LOCAL/'artifacts/release'/(sig+'.transport.zip');b=LOCAL/'artifacts/reproducible'/(sig+'.transport.zip');assert a.read_bytes()==b.read_bytes()
