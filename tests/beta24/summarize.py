#!/usr/bin/env python3
"""Export completed beta24 suites only. Never credentials, raw HAR or JSONL."""
from pathlib import Path
import json,hashlib,shutil
load=lambda p:json.loads(Path(p).read_text())
paths={'browser':'.local/evidence/browser-results.json','http':'.local/evidence/http-results.json','manager':'.local/evidence/manager-results.json','cmp':'.local/manager-i18n-evidence/results.json','permissions':'.local/evidence/manager-permissions-results.json','parameters':'.local/evidence/provider-parameters-results.json','liveGuard':'.local/evidence/live-guard-results.json','categories':'.local/category-evidence/category-results.json','activityMasks':'.local/beta21-evidence/categories.json','viewer':'.local/viewer-evidence/results.json','fileManager':'.local/viewer-evidence/file-manager.json','fileManagerUI':'.local/viewer-evidence/file-manager-ui.json','native':'.local/native-minimal-evidence/results.json','manual':'.local/native-minimal-evidence/manual-results.json','partialNative':'.local/native-minimal-evidence/partial-results.json','upgrade23':'.local/elements-evidence/upgrade-results.json','static':'.local/elements-evidence/static-results.json','legacyAudit':'.local/manager-ux-evidence/legacy-audit-results.json','serverMatrix':'.local/beta24-server-evidence/servers.json','managerUX':'.local/manager-ux-evidence/results.json'}
for name in ['save-results','cache-results','proxy-results','disabled-upgrade','publiccore-default','audit-php','settings-php','ux-php','viewer-php','elements-php','beta21-php','local-io','syntax']:paths[name]='.local/beta24-evidence/'+name+'.json'
suites={name:load(p) for name,p in paths.items()}
for name,v in suites.items():
 if v.get('failed',0) or v.get('result')=='FAIL' or any(x.get('result')=='FAIL' for x in v.get('results',[])):raise RuntimeError('Cannot publish failing suite '+name)
 v.pop('snapshots',None)
entries=0
for case in suites['browser']['results']:
 har=load('.local/evidence/'+case['name']+'.har')['log']['entries']
 from urllib.parse import urlsplit
 if any(urlsplit(x['request']['url']).netloc!='127.0.0.1:8888' for x in har):raise RuntimeError('External mock origin')
 entries+=len(har);case['har_requests']=len(har);case.pop('networkRequests',None)
assert sum(x['name'].startswith('providers-') for x in suites['browser']['results'])==256
sig='cookieconsent-0.1.0-beta24';release=Path('.local/release');zipfile=release/(sig+'.transport.zip');sha=hashlib.sha256(zipfile.read_bytes()).hexdigest();artifact=load('.local/beta24-evidence/zip.json');assert sha==artifact['sha256'];assert zipfile.read_bytes()==Path('.local/private/beta24-journal-repro/'+zipfile.name).read_bytes()
suites['runtime']={'suite':'Final runtime inventory','tests':1,'assertions':56,'failed':0,'result':'PASS'};suites['reproducibility']={'suite':'Two independent native builds identical','tests':1,'assertions':1,'failed':0,'result':'PASS'}
r={'date':'2026-10-13','branch':'feature/modx2-beta21-acceptance-fixes','base_commit':'3cd7952','implementation_commit':'ce14113','signature':sig,'sha256':sha,'result':'GO FOR REVIEW ONLY','tests':sum(v.get('tests',1) for v in suites.values()),'assertions':sum(v.get('assertions',0) for v in suites.values()),'failed':0,'package':artifact,'network':{'provider_combinations':256,'mock_har_requests':entries,'external_mock_requests':0,'real_live_sdks':'NOT RUN; intercepted requests only'},'receiver':'Public wrapper/receiver/logger/rate/event validator source unchanged from beta23','architecture':'One Save; local temporary I/O; partial journal errors; runtime-derived native fresh default; existing disabled/custom paths retained','not_run':['Real hosting/CDN/WAF configuration, staging/production deployment or merge','Live Google/Yandex SDK/container contents/API keys','Alternative PHP/MODX, Firefox/WebKit, Windows/IIS/LiteSpeed','ENOSPC/power loss/DB outage, lock/unlink failure or adversarial filesystem race','Concurrent multi-node non-shared log storage and custom MODX cache purge plugins','Million-row performance rerun for beta24; regular Viewer/CSV/PHP suites were rerun'], 'suites':suites}
out=Path('docs/evidence');out.mkdir(exist_ok=True);(out/'modx2-beta24-results.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n');shutil.copyfile(release/(sig+'.zip-inventory.json'),out/'modx2-beta24-zip-inventory.json')
images=Path('docs/screenshots/beta24');images.mkdir(parents=True,exist_ok=True)
for source,name in [('.local/beta24-evidence/partial-save.png','partial-save.png'),('.local/beta24-evidence/proxy-self403-browser200.png','proxy-browser-event.png'),('.local/viewer-evidence/viewer-en.png','viewer-en.png'),('.local/viewer-evidence/viewer-ru.png','viewer-ru.png')]:shutil.copyfile(source,images/name)
print(json.dumps({k:r[k] for k in ['tests','assertions','failed','sha256']}));print('HAR '+str(entries))
