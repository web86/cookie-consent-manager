"""Build a test-only successor; never distribute this synthetic 1.0.9 transport."""
import json,subprocess
from driver import compose
from prepare import LOCAL,ROOT
case=json.loads((LOCAL/'final-cases.json').read_text())[0];out=LOCAL/'artifacts/test-upgrade-final';out.mkdir()
with (out/'build.log').open('w') as log:
    compose(case,'exec','-T','web','php','/opt/cc-matrix/upgrade-source-final/_build/build.php','/var/www/html','/opt/cc-matrix/artifacts/test-upgrade-final',stdout=log,stderr=log)
archive=out/'cookieconsentmanager-1.0.9-pl1.transport.zip'
subprocess.run(['python3',str(ROOT/'_build/normalize.py'),str(archive)],check=True)
r=compose(case,'exec','-T','web','php','/opt/cc-matrix/upgrade-source-final/_build/verify.php','/opt/cc-matrix/artifacts/test-upgrade-final/'+archive.name,capture_output=True,text=True)
(out/'verification.json').write_text(r.stdout);print(r.stdout)
