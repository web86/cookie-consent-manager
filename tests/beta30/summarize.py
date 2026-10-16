#!/usr/bin/env python3
"""Export beta30 completed evidence, excluding raw POST, config keys, JSONL and HAR."""
from pathlib import Path
from urllib.parse import urlsplit
import hashlib,json,shutil
load=lambda p:json.loads(Path(p).read_text());root=Path('.local/modx3/beta30-evidence')
paths={n:root/f for n,f in {'rootCause':'reproduction.json','providerE2E':'providers-results.json','php':'php.json','upgrade':'upgrade.json','fresh':'fresh.json','scope':'scope.json','syntax':'syntax.json','package':'zip.json','runtime':'runtime.json','reproducibility':'repro.json'}.items()}
paths.update({'managerUI':Path('.local/modx3/beta29-evidence/manager-results.json'),'cmp':Path('.local/modx3/manager-i18n-evidence/results.json')})
for n in ['browser','http','provider-parameters']:paths[n]=Path('.local/modx3/evidence')/(n+'-results.json')
suites={n:load(p) for n,p in paths.items()}
for n,r in suites.items():
 if r.get('failed',0) or r.get('result')=='FAIL' or any(x.get('result')=='FAIL' for x in r.get('results',[])):raise RuntimeError('Failing suite '+n)
requests=0
for case in suites['browser']['results']:
 har=load('.local/modx3/evidence/'+case['name']+'.har')['log']['entries'];assert all(urlsplit(x['request']['url']).netloc=='127.0.0.1:20888' for x in har)
 requests+=len(har);case['har_requests']=len(har);case.pop('networkRequests',None)
assert sum(x['name'].startswith('providers-') for x in suites['browser']['results'])==256
sig='cookieconsent-0.1.0-beta30';artifact=Path('.local/modx3/artifacts')/(sig+'.transport.zip');sha=hashlib.sha256(artifact.read_bytes()).hexdigest();assert sha==suites['package']['sha256'];assert artifact.read_bytes()==Path('.local/modx3/private/beta30-config-b/'+artifact.name).read_bytes()
assert hashlib.sha256(Path('.local/modx3/release/cookieconsent-0.1.0-beta29.transport.zip').read_bytes()).hexdigest()=='9aa4e0bc498d29accb31897a1da11a2c21c1152b3a532a102118806488dbff96'
for suffix in ['.transport.zip','.transport.zip.sha256','.inventory.json','.zip-inventory.json']:
 source=Path('.local/modx3/artifacts')/(sig+suffix);target=Path('.local/modx3/release')/source.name
 if target.exists():assert target.read_bytes()==source.read_bytes(), 'Immutable release cannot be overwritten'
 else:
  with target.open('xb') as f:f.write(source.read_bytes())
  target.chmod(0o444)
r={'date':'2026-10-13','branch':'feature/modx3-frontend-bundle','base_commit':'ced9884','implementation_commit':'764e635','signature':sig,'sha256':sha,'result':'GO FOR REVIEW ONLY','tests':sum(v.get('tests',1) for v in suites.values()),'assertions':sum(v.get('assertions',0) for v in suites.values()),'failed':0,'network':{'provider_combinations':256,'mock_har_requests':requests,'external_mock_requests':0,'real_vendor_sdk':'NOT RUN: local fulfilled SDK stubs'},'bundle':load('_build/frontend-manifest.json'),'suites':suites,'not_run':['Production/staging deployment and actual hosting/browser/CDN caches or real vendor SDK/API keys/GTM contents','Firefox/WebKit, other PHP/MODX/Windows/IIS/LiteSpeed','Full Viewer/CSV/ACL/cache/reverse proxy matrix/native uninstall/rollback failures not rerun for this Manager-only fix (beta29 historical results)','ENOSPC/power loss/DB outage/arbitrary FS races; no universal atomic rollback']}
out=Path('docs/evidence');out.mkdir(exist_ok=True);(out/'modx3-beta30-results.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n');shutil.copyfile(Path('.local/modx3/release')/(sig+'.zip-inventory.json'),out/'modx3-beta30-zip-inventory.json')
print(json.dumps({k:r[k] for k in ['tests','assertions','failed','sha256','network']}))
