#!/usr/bin/env python3
"""Export finished beta29 evidence without credentials, raw HAR, CSV or events."""
from pathlib import Path
from urllib.parse import urlsplit
import hashlib,json,shutil
load=lambda p:json.loads(Path(p).read_text())
root=Path('.local/modx3/beta29-evidence')
paths={n:root/f for n,f in {'native':'native-results.json','mainUpgrade':'main-upgrade.json','mainReinstall':'main-reinstall.json','manager':'manager-results.json','publicJSON':'public-json-results.json','localization':'localization-results.json','frontend':'frontend-results.json','viewerPHP':'viewer-php.json','elementsPHP':'elements-php.json','settingsPHP':'settings-php.json','syntax':'syntax.json','package':'zip.json','journalSave':'save-results.json','cache':'cache-results.json','runtime':'runtime.json','reproducibility':'repro.json'}.items()}
paths.update({'viewer':Path('.local/modx3/viewer-evidence/results.json'),'cmp':Path('.local/modx3/manager-i18n-evidence/results.json')})
for n in ['browser','http','live-guard','manager-permissions']:paths[n]=Path('.local/modx3/evidence')/(n+'-results.json')
suites={n:load(p) for n,p in paths.items()}
for n,r in suites.items():
 if r.get('failed',0) or r.get('result')=='FAIL' or any(x.get('result')=='FAIL' for x in r.get('results',[])):raise RuntimeError('Failing suite '+n)
 r.pop('snapshots',None)
requests=0
for case in suites['browser']['results']:
 har=load('.local/modx3/evidence/'+case['name']+'.har')['log']['entries']
 assert all(urlsplit(x['request']['url']).netloc=='127.0.0.1:20888' for x in har)
 requests+=len(har);case['har_requests']=len(har);case.pop('networkRequests',None)
assert sum(x['name'].startswith('providers-') for x in suites['browser']['results'])==256
sig='cookieconsent-0.1.0-beta29';artifact=Path('.local/modx3/artifacts')/(sig+'.transport.zip');sha=hashlib.sha256(artifact.read_bytes()).hexdigest();assert sha==suites['package']['sha256']
assert artifact.read_bytes()==Path('.local/modx3/private/beta29-manager-wide-b/'+artifact.name).read_bytes()
assert hashlib.sha256(Path('.local/modx3/release/cookieconsent-0.1.0-beta28.transport.zip').read_bytes()).hexdigest()=='1a69b5a88719d606d180b30e53421365940d08526ddf9430f6a8473612cb2db1'
spec=load('.local/modx3/artifacts/'+sig+'.inventory.json');assert len([v for v in spec['objects'].values() if v['class'] in ['modSnippet','modChunk']])==5
assert all(v['criteria'].get('name')!='CookieConsentRegistry' for v in spec['objects'].values())
assert all(v['class'] not in ['modPlugin','modPluginEvent'] for v in spec['objects'].values())
for suffix in ['.transport.zip','.transport.zip.sha256','.inventory.json','.zip-inventory.json']:
 source=Path('.local/modx3/artifacts')/(sig+suffix);target=Path('.local/modx3/release')/source.name
 if target.exists():assert target.read_bytes()==source.read_bytes(), 'Immutable release cannot be overwritten'
 else:
  with target.open('xb') as f:f.write(source.read_bytes())
  target.chmod(0o444)
r={'date':'2026-10-13','branch':'feature/modx3-frontend-bundle','base_commit':'df4b9a5','implementation_commits':['47cff7c','323d277'],'signature':sig,'sha256':sha,'result':'GO FOR REVIEW ONLY','tests':sum(v.get('tests',1) for v in suites.values()),'assertions':sum(v.get('assertions',0) for v in suites.values()),'failed':0,'network':{'provider_combinations':256,'mock_har_requests':requests,'external_mock_requests':0,'live_sdk_execution':'NOT RUN: fulfilled local stubs'},'bundle':load('_build/frontend-manifest.json'),'suites':suites,'not_run':['Production/staging installation or deployment; actual hosting/CDN/vendor SDK/API keys/GTM container contents','Firefox/WebKit, alternate PHP/MODX, Windows/IIS/LiteSpeed','nginx/reverse proxy matrix rerun (server/receiver unchanged; local Apache used)','Million-row performance, static canonical restore, late transport failure injection not rerun','ENOSPC, power loss, DB outage, arbitrary FS races or universal atomic rollback','Custom duplicate/case-colliding categories or mixed/duplicated integration tags outside the documented contract']}
out=Path('docs/evidence');out.mkdir(exist_ok=True);(out/'modx3-beta29-results.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n');shutil.copyfile(Path('.local/modx3/release')/(sig+'.zip-inventory.json'),out/'modx3-beta29-zip-inventory.json')
images=Path('docs/screenshots/beta29');images.mkdir(parents=True,exist_ok=True)
for source,name in [(root/'logs-desktop.png','logs-desktop.png'),(root/'logs-390.png','logs-mobile.png'),(Path('.local/modx3/viewer-evidence/viewer-ru.png'),'logs-ru.png')]:shutil.copyfile(source,images/name)
print(json.dumps({k:r[k] for k in ['tests','assertions','failed','sha256','network']}))
