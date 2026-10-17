"""Compare the exact native install and inventory to this checkout (no writes)."""
from pathlib import Path
import hashlib, json, re, subprocess, sys
root=Path(__file__).resolve().parents[2]
file=Path(sys.argv[1]);major=sys.argv[2];case=sys.argv[3]
assert major in ['2','3'] and re.fullmatch(r'ui-refinement-[a-z0-9-]+',case)
container='cookie-consent-'+('modx3-' if major=='3' else '')+'adapter-updates-web-1'
installed=json.loads(subprocess.check_output(['docker','exec',container,'runuser','-u','www-data','--','php','/opt/cc-reference/tests/ui-refinement/control.php',case,'inventory'],text=True))
spec=json.loads(file.read_text());runtime=json.loads((root/'_build/transport-files.json').read_text());n=0
assert set(runtime)==set(installed['runtime'])==set(row['target'] for row in spec['files']);n+=1
for row in spec['files']:
    assert hashlib.sha256((root/runtime[row['target']]).read_bytes()).hexdigest()==row['sha256'],row['target'];n+=1
    assert installed['runtime'][row['target']]==row['sha256'],row['target'];n+=1
print(json.dumps({'result':'PASS','assertions':n,'runtime_files':len(runtime),'modx':installed['modx'],'signature':spec['signature']}))
