#!/usr/bin/env python3
from pathlib import Path
import zipfile,json
n=json.loads(Path('_build/package.json').read_text())['release_index']+1
old='cookieconsent-0.1.0-beta'+str(n);new='cookieconsent-0.1.0-beta91'
with zipfile.ZipFile('.local/modx3/artifacts/'+old+'.transport.zip') as z:
 entries={p.replace(old,new):z.read(p).replace(old.encode(),new.encode()).replace(('0.1.0-beta'+str(n)).encode(),b'0.1.0-beta91') for p in z.namelist()}
 target=next(p for p in entries if p.endswith('/home.tpl') and '/xPDOFileVehicle/' in p)
 entries[target]+=b'<!-- intentional verification fault -->'
with zipfile.ZipFile('.local/modx3/artifacts/'+new+'.transport.zip','w',zipfile.ZIP_DEFLATED) as z:
 for p,b in sorted(entries.items()):z.writestr(p,b)
print('Native partial-install test ZIP generated; never distribute')
