"""First-public-release scope: reuse prior functional evidence, verify the changed installer."""
from pathlib import Path
import hashlib,json,subprocess,sys,zipfile
ROOT=Path(__file__).resolve().parents[2];LOCAL=ROOT/'.local/package-rename'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
sig='cookieconsentmanager-1.0.8-pl4';folder=LOCAL/'artifacts/first-public';archive=folder/(sig+'.transport.zip')
spec=json.loads((folder/(sig+'.inventory.json')).read_text());allow=json.loads((ROOT/'_build/transport-files.json').read_text())
for item in spec['files']:assert sha(ROOT/allow[item['target']])==item['sha256']
assert archive.read_bytes()==(LOCAL/'artifacts/first-public-repro'/archive.name).read_bytes()
assert spec['objects']['namespace']['fields']=={'name':'cookie_consent','path':'{core_path}components/cookieconsentmanager/','assets_path':'{assets_path}components/cookieconsentmanager/'}
with zipfile.ZipFile(archive) as z:
 for name in z.namelist():
  assert b'components/cookieconsent/' not in z.read(name),name
  assert b'legacy_state' not in z.read(name),name
rows=[]
for c in json.loads((LOCAL/'public-cases.json').read_text()):
 r=json.loads((LOCAL/c['name']/'evidence/public-fresh.json').read_text());assert r['tests']==4 and r['failed']==0
 rows.append({'case':c['name'],'modx':c['modx'],'php':c['php'],'tests':r['tests'],'assertions':r['assertions'],'failed':r['failed'],'results':r['results']})
prior=json.loads((ROOT/'docs/evidence/modx2-package-rename.json').read_text())
result={'schema':1,'scope':'First public release, fresh installations only; user revised gates','signature':sig,'sha256':sha(archive),'bytes':archive.stat().st_size,'branch':'codex/modx2-cookieconsentmanager','native_archive':json.loads((folder/'verification.json').read_text()),'reproducible':True,'old_component_paths_in_zip':False,'legacy_state_import':False,'namespace':'cookie_consent','component':'cookieconsentmanager','cases':rows,'tests':sum(r['tests'] for r in rows),'assertions':sum(r['assertions'] for r in rows),'failed':0,'reused_regression':{'commit':'0444cda18333e7399eedd7665331e44922bbeec9','evidence':'docs/evidence/modx2-package-rename.json','native_browser_tests':prior['tests'],'native_browser_assertions':prior['assertions'],'php_suites':prior['php']['suites'],'php_assertions':prior['php']['assertions'],'note':'Visitor/Manager/service/audit behavior unchanged. Historical migration groups are retained as history, not a release requirement.'},'closed_out_of_scope':['Historical cookieconsent/cookieconsent3 migration','Official third-party transport/ClientConfig coexistence acceptance'],'compatibility':{'modx':'>=2.8.4,<3.0.0','php':'>=8.1.0'},'modstore_decision':'GO','fresh_install_decision':'GO','published':False,'deployed':False}
(ROOT/'docs/evidence/modx2-first-public-release.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:result[k] for k in ['signature','sha256','tests','assertions','failed','modstore_decision']}))
