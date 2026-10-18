"""Build/normalize/verify using the real MODX 2 builder in an isolated fixture."""
import json,subprocess,sys,os
from driver import compose
from prepare import ROOT,LOCAL
cases=json.loads((LOCAL/('final-cases.json' if os.environ.get('CC_RENAME_FINAL') else 'cases.json')).read_text());case=next((c for c in cases if c['name']==os.environ.get('CC_RENAME_BUILD_CASE')),cases[0])
sig='cookieconsentmanager-1.0.8-pl4'
suffix=sys.argv[1] if len(sys.argv)>1 else ''
for label in ['release'+suffix,'reproducible'+suffix]:
    folder=LOCAL/'artifacts'/label
    if folder.exists():raise RuntimeError('Existing output preserved')
    folder.mkdir()
    with (folder/'build.log').open('w') as log:
        compose(case,'exec','-T','web','php','/opt/cc-source/_build/build.php','/var/www/html','/opt/cc-matrix/artifacts/'+label,stdout=log,stderr=log)
    archive=folder/(sig+'.transport.zip')
    subprocess.run(['python3',str(ROOT/'_build/normalize.py'),str(archive)],check=True)
    result=compose(case,'exec','-T','web','php','/opt/cc-source/_build/verify.php','/opt/cc-matrix/artifacts/'+label+'/'+archive.name,capture_output=True,text=True)
    (folder/'verification.json').write_text(result.stdout)
    print(result.stdout,flush=True)
a=LOCAL/('artifacts/release'+suffix)/(sig+'.transport.zip');b=LOCAL/('artifacts/reproducible'+suffix)/(sig+'.transport.zip')
assert a.read_bytes()==b.read_bytes(),'Nondeterministic transport'
