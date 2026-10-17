"""Native builder + normalizer + inventory verifier; output folders are immutable."""
import json
import subprocess
import sys
from driver import compose
from prepare import ROOT, LOCAL

case=json.loads((LOCAL/'cases.json').read_text())[0]
for index in [2, 3]:
    source=f'/opt/cc-matrix/candidate-pl{index}'
    folder=LOCAL/f'artifacts/pl{index}'
    if folder.exists():
        raise RuntimeError('Existing build preserved')
    folder.mkdir(parents=True)
    with (folder/'build.log').open('w') as log:
        compose(case,'exec','-T','web','php',source+'/_build/build.php','/var/www/html',f'/opt/cc-matrix/artifacts/pl{index}',stdout=log,stderr=log)
    archive=folder/f'cookieconsent-1.0.8-pl{index}.transport.zip'
    subprocess.run(['python3',str(ROOT/'_build/normalize.py'),str(archive)],check=True)
    verified=compose(case,'exec','-T','web','php',source+'/_build/verify.php',f'/opt/cc-matrix/artifacts/pl{index}/'+archive.name,capture_output=True,text=True)
    (folder/'verification.json').write_text(verified.stdout)
    print(verified.stdout,flush=True)
