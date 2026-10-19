"""Native build plus immutable ZIP verification; only disposable local fixtures."""
from pathlib import Path
import hashlib,json,subprocess,sys,zipfile
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'tests/package-rename'))
from driver import compose
from prepare import LOCAL
case=json.loads((LOCAL/'public-cases.json').read_text())[0]
sig='cookieconsentmanager-1.0.8-pl4'
for label in ['first-public','first-public-repro']:
    folder=LOCAL/'artifacts'/label
    folder.mkdir(exist_ok=False)
    with (folder/'build.log').open('w') as log:compose(case,'exec','-T','web','php','/opt/cc-source/_build/build.php','/var/www/html','/opt/cc-matrix/artifacts/'+label,stdout=log,stderr=log)
    archive=folder/(sig+'.transport.zip')
    subprocess.run(['python3',str(ROOT/'_build/normalize.py'),str(archive)],check=True)
    r=compose(case,'exec','-T','web','php','/opt/cc-source/_build/verify.php','/opt/cc-matrix/artifacts/'+label+'/'+archive.name,capture_output=True,text=True)
    (folder/'verification.json').write_text(r.stdout)
    with zipfile.ZipFile(archive) as z:
        for name in z.namelist():
            body=z.read(name)
            assert b'components/cookieconsent/' not in body,name
            assert b'legacy_state' not in body,name
    print(r.stdout,flush=True)
a=LOCAL/'artifacts/first-public'/(sig+'.transport.zip');b=LOCAL/'artifacts/first-public-repro'/(sig+'.transport.zip')
assert a.read_bytes()==b.read_bytes()
