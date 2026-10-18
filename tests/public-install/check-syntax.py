import json,subprocess
from prepare import ROOT,LOCAL
from driver import compose
cases=json.loads((LOCAL/'cases.json').read_text());rows=[]
for c in [cases[0],cases[1]]:
 r=compose(c,'exec','-T','web','php','/opt/cc-source/tests/public-install/syntax.php',capture_output=True,text=True);rows.append(json.loads(r.stdout))
js=[p for base in ['assets','_build','tests/public-install'] for p in (ROOT/base).rglob('*') if p.suffix in ['.js','.mjs']];errors=[]
for p in js:
 r=subprocess.run(['node','--check',str(p)],capture_output=True,text=True)
 if r.returncode:errors.append({'path':str(p.relative_to(ROOT)),'error':r.stderr})
assert all(r['result']=='PASS' for r in rows) and not errors
(LOCAL/'syntax.json').write_text(json.dumps({'result':'PASS','php':rows,'js_files':len(js),'js_errors':errors},indent=2)+'\n');print('PHP 8.1/8.2 and JS syntax PASS')
