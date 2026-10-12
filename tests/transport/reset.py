#!/usr/bin/env python3
"""Reset ONLY named disposable databases; archive previous fixture files unchanged."""
from pathlib import Path
import sys,subprocess,datetime,runpy
root=Path(__file__).resolve().parents[2]
names=sys.argv[1:]
if not names or any(n not in ['clean','publiccore'] for n in names):raise RuntimeError('Explicit disposable fixture names required')
compose=['docker','compose','--env-file',str(root/'.local/private/compose.env'),'-f',str(root/'tests/local/compose.yaml'),'-f',str(root/'tests/transport/compose.yaml')]
def run(args,**kwargs):subprocess.run(args,cwd=root,check=True,**kwargs)
run(compose+['stop']+names)
for name in names:
 code='$pdo=new PDO("mysql:host=db","root",getenv("CC_DB_PASSWORD"));$pdo->exec("DROP DATABASE IF EXISTS cookie_consent_transport_'+name+'");echo "Disposable DB reset\\n";'
 run(compose+['exec','-T','web','php','-r',code])
 path=root/('.local/transport-'+name)
 if path.exists():path.rename(path.with_name(path.name+'-archive-'+datetime.datetime.now().strftime('%Y%m%d%H%M%S')))
runpy.run_path(str(root/'tests/transport/prepare.py'))
run(compose+['up','-d','--force-recreate','--no-deps']+names)
for name in names:
 private='/opt/cc-clean' if name=='clean' else '/opt/cc-publiccore'
 run(compose+['exec','-T',name,'php','/opt/cc-source/tests/transport/install-modx.php',name])
 with (root/('.local/transport-'+name+'/private/install.log')).open('w') as log:
  run(compose+['exec','-T','-w','/var/www/html/setup',name,'php','index.php','--installmode=new','--config='+private+'/setup.xml'],stdout=log)
 run(compose+['exec','-T',name,'php','/opt/cc-source/tests/transport/permissions.php',name])
 run(compose+['exec','-T',name,'apachectl','-k','graceful'])
print('Disposable MODX 2 fixtures reset; previous files archived')
