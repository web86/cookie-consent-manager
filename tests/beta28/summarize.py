#!/usr/bin/env python3
"""Export completed beta28 results, excluding raw HAR, events and secret config."""
from pathlib import Path
from urllib.parse import urlsplit
import hashlib,json,shutil
load=lambda p:json.loads(Path(p).read_text())
root=Path('.local/modx3/beta28-evidence')
suites={name:load(root/file) for name,file in {'native':'category-results.json','localization':'localization-results.json','php':'php.json','syntax':'syntax.json','runtime':'runtime.json','reproducibility':'repro.json','package':'zip.json'}.items()}
for name in ['browser','http']:suites[name]=load('.local/modx3/evidence/'+name+'-results.json')
for name,r in suites.items():
 if r.get('failed',0) or r.get('result')=='FAIL' or any(x.get('result')=='FAIL' for x in r.get('results',[])):raise RuntimeError('Failing suite '+name)
network=0
for case in suites['browser']['results']:
 har=load('.local/modx3/evidence/'+case['name']+'.har')['log']['entries']
 assert all(urlsplit(x['request']['url']).netloc=='127.0.0.1:20888' for x in har)
 network+=len(har);case['har_requests']=len(har);case.pop('networkRequests',None)
assert sum(x['name'].startswith('providers-') for x in suites['browser']['results'])==256
sig='cookieconsent-0.1.0-beta28';artifact=Path('.local/modx3/artifacts')/(sig+'.transport.zip');sha=hashlib.sha256(artifact.read_bytes()).hexdigest()
assert sha==suites['package']['sha256']
assert artifact.read_bytes()==Path('.local/modx3/private/beta28-category-b/'+artifact.name).read_bytes()
assert hashlib.sha256(Path('.local/modx3/release/cookieconsent-0.1.0-beta26.transport.zip').read_bytes()).hexdigest()=='d02c26f29354ba793843ee204a273c6eca2984b79c87762f8bc566ea98e79c4e'
release=Path('.local/modx3/release')
for suffix in ['.transport.zip','.transport.zip.sha256','.inventory.json','.zip-inventory.json']:
 source=Path('.local/modx3/artifacts')/(sig+suffix);target=release/source.name
 if target.exists():
  assert target.read_bytes()==source.read_bytes(), 'Immutable release must never be overwritten'
 else:
  with target.open('xb') as f:f.write(source.read_bytes())
  target.chmod(0o444)
r={'date':'2026-10-13','branch':'feature/modx3-frontend-bundle','base_commit':'b42f836','implementation_commit':'1ffc9f2','signature':sig,'sha256':sha,'result':'GO FOR REVIEW ONLY','tests':sum(v.get('tests',1) for v in suites.values()),'assertions':sum(v.get('assertions',0) for v in suites.values()),'failed':0,'network':{'provider_combinations':256,'mock_har_requests':network,'external_mock_requests':0},'bundle':load('_build/frontend-manifest.json'),'suites':suites,'not_run':['Production/staging installation or deployment; real hosting/CDN/vendor SDK/API keys/GTM container contents','Firefox/WebKit, alternate PHP/MODX, Windows/IIS/LiteSpeed','Manager/Audit Viewer/CSV/ACL/reverse proxy/nginx/cache-deletion/million-row suites not rerun for beta28 (beta26 historical results only)','Static canonical restore and late transport failure injection not rerun for beta28','Case-colliding or already duplicate category names under custom database collations','ENOSPC/power loss/DB outage/arbitrary FS race; no universal atomic rollback','Automatic repair of duplicate/mixed integration tags outside the documented contract']}
out=Path('docs/evidence');out.mkdir(exist_ok=True);(out/'modx3-beta28-results.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n');shutil.copyfile(release/(sig+'.zip-inventory.json'),out/'modx3-beta28-zip-inventory.json')
print(json.dumps({k:r[k] for k in ['tests','assertions','failed','sha256','network']}))
