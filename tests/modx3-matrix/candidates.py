"""Test-only candidates; never widen tracked requirements before acceptance."""
from pathlib import Path
import json
import shutil
import subprocess
from prepare import ROOT, LOCAL

for index in [2, 3]:
    target=LOCAL/f'candidate-pl{index}'
    if target.exists(): raise RuntimeError('Candidate exists; preserve it')
    for name in subprocess.check_output(['git','ls-files'],cwd=ROOT,text=True).splitlines():
        if name.startswith(('docs/','tests/','.github/')): continue
        path=target/name
        path.parent.mkdir(parents=True,exist_ok=True)
        shutil.copyfile(ROOT/name,path)
    metadata=target/'_build/package.json'
    data=json.loads(metadata.read_text())
    data['release_index']=index
    data['minimum_modx']='3.1.2'
    metadata.write_text(json.dumps(data,indent=2)+'\n')
    for name in ['_build/preflight.php','_build/build.php']:
        path=target/name
        path.write_text(path.read_text().replace('3.2.4','3.1.2'))
    subprocess.run(['node',str(target/'_build/version.mjs')],check=True)
    subprocess.run(['node','_build/frontend.mjs'],cwd=target,check=True)
