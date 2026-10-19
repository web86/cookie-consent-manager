from pathlib import Path
import json,copy,zipfile,shutil
ROOT=Path(__file__).resolve().parents[2];REPO=ROOT.parents[1];LOCAL=REPO/'.local/modstore-matrix'
cases=json.loads((LOCAL/'cases.json').read_text());compose=json.loads((LOCAL/'compose.json').read_text())
for index,source in enumerate([c for c in cases if c['name'] in ['m288p82','m324p82']]):
 c=copy.deepcopy(source);c['name']+='f';c['port']=24510+index;c['fresh_final']=True
 f=LOCAL/c['name'];f.mkdir(exist_ok=False);(f/'private').mkdir();(f/'evidence').mkdir()
 folder='modx2-compatibility' if c['major']==2 else 'modx3-matrix'
 with zipfile.ZipFile(REPO/f'.local/{folder}/download/modx-{c["modx"]}.zip') as z:z.extractall(f/'unpack')
 shutil.move(str(next((f/'unpack').iterdir())),str(f/'site'));(f/'unpack').rmdir()
 shutil.copyfile(LOCAL/source['name']/'apache.conf',f/'apache.conf')
 service=copy.deepcopy(compose['services'][source['name']]);service['ports']=[f'127.0.0.1:{c["port"]}:80'];service['volumes']=[v.replace(str(LOCAL/source['name']),str(f)) for v in service['volumes']];service['environment']['CC_MODSTORE_CASE']=c['name'];service['environment']['CC_MODSTORE_PORT']=str(c['port']);compose['services'][c['name']]=service;cases.append(c)
(LOCAL/'cases.json').write_text(json.dumps(cases,indent=2)+'\n');(LOCAL/'compose.json').write_text(json.dumps(compose,indent=2)+'\n')
