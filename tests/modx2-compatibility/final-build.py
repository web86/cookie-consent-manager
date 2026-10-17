"""Final source native builds must match the already tested immutable candidate."""
import hashlib
import json
import subprocess
from driver import compose
from prepare import ROOT, LOCAL

signature='cookieconsent-1.0.8-pl3'
candidate=LOCAL/'artifacts/pl3'/(signature+'.transport.zip')
expected=hashlib.sha256(candidate.read_bytes()).hexdigest()
cases=json.loads((LOCAL/'cases.json').read_text())
for case in cases:
    label='release' if case['php']=='8.1' else 'reproducible'
    folder=LOCAL/'artifacts'/label
    if folder.exists():raise RuntimeError('Existing final output preserved')
    folder.mkdir()
    with (folder/'build.log').open('w') as log:
        compose(case,'exec','-T','web','php','/opt/cc-source/_build/build.php','/var/www/html','/opt/cc-matrix/artifacts/'+label,stdout=log,stderr=log)
    archive=folder/(signature+'.transport.zip')
    subprocess.run(['python3',str(ROOT/'_build/normalize.py'),str(archive)],check=True)
    if hashlib.sha256(archive.read_bytes()).hexdigest()!=expected:raise RuntimeError('Final ZIP differs from tested candidate')
    result=compose(case,'exec','-T','web','php','/opt/cc-source/_build/verify.php','/opt/cc-matrix/artifacts/'+label+'/'+archive.name,capture_output=True,text=True)
    (folder/'verification.json').write_text(result.stdout)
    requirement=compose(case,'exec','-T','web','php','/opt/cc-source/tests/modx2-compatibility/requirements.php',capture_output=True,text=True)
    (LOCAL/case['name']/'evidence/requirements-final.json').write_text(requirement.stdout)
    print(label,'PASS; identical SHA256',expected,flush=True)
