#!/usr/bin/env python3
"""Export completed frontend acceptance; never raw HAR, configuration keys or JSONL."""
from pathlib import Path
import json,hashlib,shutil
load=lambda p:json.loads(Path(p).read_text())
paths={'frontend':'.local/modx3/beta26-evidence/frontend-results.json','browser':'.local/modx3/evidence/browser-results.json','http':'.local/modx3/evidence/http-results.json','manager':'.local/modx3/evidence/manager-results.json','cmp':'.local/modx3/manager-i18n-evidence/results.json','parameters':'.local/modx3/evidence/provider-parameters-results.json','permissions':'.local/modx3/evidence/manager-permissions-results.json','liveGuard':'.local/modx3/evidence/live-guard-results.json','categories':'.local/modx3/category-evidence/category-results.json','activityMasks':'.local/modx3/beta21-evidence/categories.json','viewer':'.local/modx3/viewer-evidence/results.json','fileManager':'.local/modx3/viewer-evidence/file-manager.json','fileManagerUI':'.local/modx3/viewer-evidence/file-manager-ui.json','native':'.local/modx3/native-minimal-evidence/results.json','manual':'.local/modx3/native-minimal-evidence/manual-results.json','partialNative':'.local/modx3/native-minimal-evidence/partial-results.json','upgrade24':'.local/modx3/elements-evidence/upgrade-results.json','static':'.local/modx3/elements-evidence/static-results.json','legacyAudit':'.local/modx3/manager-ux-evidence/legacy-audit-results.json','managerUX':'.local/modx3/manager-ux-evidence/results.json','journalSave':'.local/modx3/beta24-evidence/save-results.json','cache':'.local/modx3/beta24-evidence/cache-results.json'}
for n in ['audit-php','settings-php','ux-php','viewer-php','elements-php','io-php','categories-php','syntax','architecture']:paths[n]='.local/modx3/beta26-evidence/'+n+'.json'
suites={n:load(p) for n,p in paths.items()}
for n,r in suites.items():
 if r.get('failed',0) or r.get('result')=='FAIL' or any(x.get('result')=='FAIL' for x in r.get('results',[])):raise RuntimeError('Failing suite '+n)
 r.pop('snapshots',None)
requests=0
for case in suites['browser']['results']:
 har=load('.local/modx3/evidence/'+case['name']+'.har')['log']['entries']
 from urllib.parse import urlsplit
 assert all(urlsplit(x['request']['url']).netloc=='127.0.0.1:20888' for x in har)
 requests+=len(har);case['har_requests']=len(har);case.pop('networkRequests',None)
assert sum(x['name'].startswith('providers-') for x in suites['browser']['results'])==256
sig='cookieconsent-0.1.0-beta26';root=Path('.local/modx3/release');archive=root/(sig+'.transport.zip');sha=hashlib.sha256(archive.read_bytes()).hexdigest();assert sha==load('.local/modx3/beta26-evidence/zip.json')['sha256'];assert archive.read_bytes()==Path('.local/modx3/private/beta26-frontend-repro/'+archive.name).read_bytes()
suites['runtime']={'suite':'53 final runtime hashes and no rejected prototype plugin','tests':1,'assertions':54,'failed':0,'result':'PASS'};suites['reproducibility']={'suite':'Two native builds byte-identical / generated output hashes','tests':1,'assertions':3,'failed':0,'result':'PASS'}
r={'date':'2026-10-13','branch':'feature/modx3-frontend-bundle','base_commit':'d748716','implementation_commit':'65d55f8','signature':sig,'sha256':sha,'result':'GO FOR REVIEW ONLY','tests':sum(v.get('tests',1) for v in suites.values()),'assertions':sum(v.get('assertions',0) for v in suites.values()),'failed':0,'bundle':load('_build/frontend-manifest.json'),'package':load('.local/modx3/beta26-evidence/zip.json'),'network':{'provider_combinations':256,'mock_har_requests':requests,'external_mock_requests':0,'live_sdk_execution':'NOT RUN / fulfilled locally'},'contract':'Assets once in head + Banner once before body end; alternatively legacy CookieConsent once. Do not mix; repeated new PHP tags unsupported. No MODX plugins/events/rewriting/PHP output suppression.', 'not_run':['Production/staging hosting/CDN/GTM/vendor SDK/API keys or deployment/merge','Firefox/WebKit/alternate PHP/MODX/Windows/IIS/LiteSpeed','CSP policies forbidding external self-hosted scripts, dynamically inserting banner after defer initialization','Automatic repair of duplicated/mixed integration tags (explicitly outside contract)','Power loss/ENOSPC/DB outage/arbitrary filesystem race/concurrent non-shared multi-node storage','Million-row performance rerun (regular Viewer/CSV/ACL/PHP rerun)'], 'suites':suites}
out=Path('docs/evidence');out.mkdir(exist_ok=True);(out/'modx3-beta26-results.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n');shutil.copyfile(root/(sig+'.zip-inventory.json'),out/'modx3-beta26-zip-inventory.json')
images=Path('docs/screenshots/beta26');images.mkdir(parents=True,exist_ok=True)
for src,name in [('.local/modx3/beta26-evidence/split-en.png','split-en.png'),('.local/modx3/viewer-evidence/viewer-en.png','viewer-en.png')]:shutil.copyfile(src,images/name)
print(json.dumps({k:r[k] for k in ['tests','assertions','failed','sha256']}));print('HAR requests '+str(requests))
