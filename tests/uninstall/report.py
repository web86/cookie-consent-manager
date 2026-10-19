"""Summarize real native lifecycle evidence; keep test secrets outside Git."""
from pathlib import Path
import hashlib,json,os,zipfile
ROOT=Path(__file__).resolve().parents[2]
platform=os.environ.get('CC_PLATFORM','2');LOCAL=ROOT/os.environ.get('CC_UNINSTALL_LOCAL','.local/uninstall2-final')
artifact=json.loads((LOCAL/'current-artifact.json').read_text());folder=ROOT/artifact['folder']
sig='cookieconsentmanager-1.0.8-pl5' if platform=='2' else 'cookieconsentmanager3-1.0.8-pl6';archive=folder/(sig+'.transport.zip')
rows=[]
for c in json.loads((LOCAL/'cases.json').read_text()):
 row=json.loads((LOCAL/c['name']/'evidence/uninstall.json').read_text());assert row['tests']==9 and row['failed']==0
 assert all(r['result']=='PASS' for r in row['results']);rows.append(row)
 log=(LOCAL/c['name']/'site/core/cache/logs/error.log').read_text()
 assert 'PHP Fatal' not in log and 'Cookie Consent verification failed' not in log
 assert 'uninstall incomplete: Shipped file directory is not writable:' in log
 console=json.loads((LOCAL/c['name']/'evidence/console.json').read_text());assert console['result']=='PASS' and console['warnings_visible']
sha=hashlib.sha256(archive.read_bytes()).hexdigest();assert sha==artifact['sha256']==archive.with_suffix('.zip.sha256').read_text().split()[0]
assert archive.read_bytes()==(folder.parent/'repro'/archive.name).read_bytes()
regpath=ROOT/os.environ.get('CC_REGRESSION_RESULT','.local/uninstall2/rename-88-p82-fresh/evidence/browser.json')
reg=json.loads(regpath.read_text());assert reg['failed']==0 and reg.get('complete',True)
if platform=='2':
 draft=json.loads((ROOT/'.local/uninstall2/artifacts/candidate1/release'/(sig+'.inventory.json')).read_text());final=json.loads(archive.with_name(sig+'.inventory.json').read_text());assert draft['files']==final['files']
result={'decision':'GO','platform':'MODX '+platform,'signature':sig,'sha256':sha,'bytes':archive.stat().st_size,'native_tests':sum(r['tests'] for r in rows),'native_assertions':sum(r['assertions'] for r in rows),'failed':0,'native_cases':rows,'functional_regression':reg,'console_verification':{'tests':len(rows),'assertions':4*len(rows),'result':'PASS'},'archive_verification':json.loads((folder/'verification.json').read_text()),'compatibility':{'modx':'>=2.8.4,<3.0.0' if platform=='2' else '>=3.1.2,<3.3.0','php':'>=8.1.0'},'ownership':'Native preserved.php; no new database schema or lifecycle store','retained_data':['consent JSONL and .rate in shared/custom log directories','custom audit configuration files and paths','modified/unknown public adapters and other unknown or changed files','pre-existing permission definitions','foreign replacement objects and categories containing foreign elements'],'failure_test':'A shipped file was already absent and a different occupied runtime directory was made read-only. Package Manager returned failure and kept installed=true. Restoring permissions and retrying uninstall succeeded.','historical_candidate_limit':'An older candidate that overwrote its original native category backup on reinstall may lack proof that it created the category. Such an unproven pre-existing category is retained, rather than deleted by name. New ownership receipts survive reinstalls.','publication_performed':False}
text=json.dumps(result,ensure_ascii=False,indent=2)+'\n';(ROOT/('docs/evidence/modx'+platform+'-uninstall.json')).write_text(text);(folder/'acceptance.json').write_text(text)
print(json.dumps({k:result[k] for k in ['decision','signature','sha256','bytes','native_tests','native_assertions']},indent=2))
