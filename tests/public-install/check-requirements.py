import json
from prepare import LOCAL
from driver import compose
rows=[]
for c in json.loads((LOCAL/'cases.json').read_text()):
 r=compose(c,'exec','-T','web','php','/opt/cc-source/tests/public-install/requirements.php',capture_output=True,text=True)
 report=json.loads(r.stdout);assert report['result']=='PASS';rows.append(dict(case=c['name'],**report))
(LOCAL/'requirements.json').write_text(json.dumps(rows,indent=2)+'\n');print(json.dumps(rows))
