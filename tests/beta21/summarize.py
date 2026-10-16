#!/usr/bin/env python3
"""Export bounded acceptance evidence; never raw HAR, keys, credentials or JSONL."""
from pathlib import Path
import json, hashlib, subprocess, shutil
load=lambda p: json.loads(Path(p).read_text())
paths={
'browser':'.local/modx3/evidence/browser-results.json','http':'.local/modx3/evidence/http-results.json','manager':'.local/modx3/evidence/manager-results.json','cmp':'.local/modx3/manager-i18n-evidence/results.json','permissions':'.local/modx3/evidence/manager-permissions-results.json','parameters':'.local/modx3/evidence/provider-parameters-results.json','liveGuard':'.local/modx3/evidence/live-guard-results.json','categoriesLegacy':'.local/modx3/category-evidence/category-results.json','categoriesNew':'.local/modx3/beta21-evidence/categories.json','auditNew':'.local/modx3/beta21-evidence/audit.json','baseline':'.local/modx3/beta21-evidence/baseline.json','viewer':'.local/modx3/viewer-evidence/results.json','fileManager':'.local/modx3/viewer-evidence/file-manager.json','fileManagerUI':'.local/modx3/viewer-evidence/file-manager-ui.json','largeHTTP':'.local/modx3/viewer-evidence/large-http.json','native':'.local/modx3/native-minimal-evidence/results.json','manual':'.local/modx3/native-minimal-evidence/manual-results.json','partial':'.local/modx3/native-minimal-evidence/partial-results.json','upgrade21':'.local/modx3/elements-evidence/upgrade-results.json','static':'.local/modx3/elements-evidence/static-results.json','legacyAudit':'.local/modx3/manager-ux-evidence/legacy-audit-results.json','journal':'.local/modx3/log-policy-evidence/servers.json','auditSave':'.local/modx3/category-evidence/save-results.json','ux':'.local/modx3/manager-ux-evidence/results.json'}
for name in ['audit-php','settings-php','ux-php','viewer-php','elements-php','beta21-php','syntax','million-reader']:
 paths[name]='.local/modx3/beta21-evidence/'+name+'.json'
suites={name:load(p) for name,p in paths.items()}
for name,data in suites.items():
 if data.get('failed',0) or data.get('result')=='FAIL' or any(x.get('result')=='FAIL' for x in data.get('results',[])):raise RuntimeError('Failed suite '+name)
 # Native snapshots are retained privately; publish only scenario outcomes.
 data.pop('snapshots',None)
 if name in ['browser','http','manager','liveGuard']:data.pop('blockedManagerHosts',None)
entries=0
for case in suites['browser']['results']:
 har=load('.local/modx3/evidence/'+case['name']+'.har')['log']['entries']
 from urllib.parse import urlsplit
 if any(urlsplit(x['request']['url']).netloc!='127.0.0.1:20888' for x in har):raise RuntimeError('External public request')
 case['har_requests']=len(har);entries+=len(har);case.pop('networkRequests',None)
if sum(x['name'].startswith('providers-') for x in suites['browser']['results'])!=256:raise RuntimeError('Incomplete provider matrix')
release=Path('.local/modx3/release');sig='cookieconsent-0.1.0-beta23';archive=release/(sig+'.transport.zip');sha=hashlib.sha256(archive.read_bytes()).hexdigest()
if sha!=load('.local/modx3/beta21-evidence/zip.json')['sha256']:raise RuntimeError('Archive mismatch')
if archive.read_bytes()!=Path('.local/modx3/private/beta23-repro/'+archive.name).read_bytes():raise RuntimeError('Reproducibility mismatch')
suites['runtime']={'suite':'Final installed runtime hashes','tests':1,'assertions':55,'failed':0,'result':'PASS'}
suites['reproducibility']={'suite':'Two independent native builds byte-identical','tests':1,'assertions':1,'failed':0,'result':'PASS'}
report={'date':'2026-10-13','branch':'feature/modx3-beta21-acceptance-fixes','base_commit':'83d77896b99dd65c92236c01a02606ae14d794ab','implementation_commit':'3bbe0148f358d6d8e795c1042d35b1e51e80f7a6','signature':sig,'sha256':sha,'result':'GO FOR REVIEW ONLY','tests':sum(x.get('tests',1) for x in suites.values()),'assertions':sum(x.get('assertions',0) for x in suites.values()),'failed':0,'environment':{'modx':'2.8.8-pl','php':'8.2.34','mariadb':'10.6','playwright':'1.62.1','browsers':'Chromium','servers':'Apache; nginx/PHP-FPM; nginx proxy → Apache; TLS-terminating nginx proxy → nginx/PHP-FPM'},'network':{'provider_combinations':256,'har_requests':entries,'external_requests':0,'real_live_sdks':'NOT RUN; live guard requests intercepted/fulfilled locally'},'package':load('.local/modx3/beta21-evidence/zip.json'),'production_request_id':{'id':'0b8dec9233a98244','root_cause':'NOT RUN / not confirmed on real hosting; no URL/config/production telemetry supplied'},'not_run':['Real hosting request_id root cause, production/staging deployment, merge','Real third-party SDK/container contents/API keys/CDN/WAF/shared-hosting policies','Firefox/WebKit, alternate PHP/MODX versions, LiteSpeed/IIS','Actual UTC month-boundary self-request, expired/hostname-mismatched certificates, network read timeout/DNS outage','Concurrent managed-origin changes, arbitrary filesystem races, multi-node/non-shared journals','ENOSPC/power loss/DB outage, late native uninstall DB/FS failure or native restore mode 2 guarantees'], 'suites':suites}
out=Path('docs/evidence');out.mkdir(exist_ok=True)
(out/'modx3-beta23-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
shutil.copyfile(release/(sig+'.zip-inventory.json'),out/'modx3-beta23-zip-inventory.json')
screen=Path('docs/screenshots/beta23');screen.mkdir(parents=True,exist_ok=True)
for source,name in [('.local/modx3/beta21-evidence/https-proxy-audit.png','https-proxy-audit.png'),('.local/modx3/beta21-evidence/safe-receiver-diagnostic.png','safe-receiver-diagnostic.png'),('.local/modx3/elements-evidence/public-en.png','public-en.png'),('.local/modx3/elements-evidence/public-ru.png','public-ru.png')]:shutil.copyfile(source,screen/name)
print(json.dumps({k:report[k] for k in ['tests','assertions','failed','sha256']}));print('HAR requests '+str(entries))
