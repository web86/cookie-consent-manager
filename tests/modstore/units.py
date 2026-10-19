from pathlib import Path
import subprocess,json,sys
ROOT=Path(__file__).resolve().parents[2];REPO=ROOT.parents[1];LOCAL=REPO/'.local/modstore-matrix';BASE=['docker','compose','--env-file',str(LOCAL/'private/compose.env'),'-f',str(LOCAL/'compose.json')]
for c in json.loads((LOCAL/'cases.json').read_text()):
 if c['name'] not in ['m284p81','m284p82','m312p81','m312p82']:continue
 suites=sys.argv[1:] or ['lint','adapter-cache','adapter-updates']
 evidence=LOCAL/c['name']/'evidence/php-units.json'
 results=[r for r in json.loads(evidence.read_text())['checks'] if r['suite'] not in suites] if evidence.exists() else []
 for suite in suites:
  r=subprocess.run(BASE+['exec','-T','--user','www-data',c['name'],'php','/opt/cc-source/tests/modstore/unit.php',suite],capture_output=True,text=True)
  if r.returncode:raise RuntimeError(r.stdout+'\n'+r.stderr)
  data=json.loads(r.stdout);assert data['result']=='PASS';results.append({'suite':suite,**data});print('PASS',c['name'],suite,flush=True)
 (LOCAL/c['name']/'evidence/php-units.json').write_text(json.dumps({'case':c,'result':'PASS','checks':results},indent=2)+'\n')
