#!/usr/bin/env python3
"""Archive/reset only the named disposable native MODX fixtures; preserve all artifacts."""
from pathlib import Path
import subprocess
import shutil
root=Path(__file__).resolve().parents[2]
dc=['docker','compose','--env-file','.local/private/compose.env','-f','tests/local/compose.yaml','-f','tests/transport/compose.yaml','-f','tests/beta102/compose.yaml']
def run(args): subprocess.run(args,cwd=root,check=True)
run(dc+['stop','beta81'])
run(['python3','tests/transport/reset.py','clean','publiccore'])
source=root/'.local/download/pdoTools-a7a9a3366249c6689cefba5c2b901ada43a7df79/core/components/pdotools'
assert (source/'vendor/autoload.php').is_file()
for relative in ['.local/transport-clean/private/core/components/pdotools','.local/transport-publiccore/public/core/components/pdotools']:
    shutil.copytree(source,root/relative,dirs_exist_ok=True)
run(dc+['up','-d','--force-recreate','--no-deps','beta81'])
for service in ['clean','publiccore','beta81']:
    run(dc+['exec','-T',service,'sh','-c','printf "opcache.revalidate_freq=0\\n" > /usr/local/etc/php/conf.d/zz-beta-acceptance.ini'])
    run(dc+['restart',service])
