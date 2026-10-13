#!/usr/bin/env python3
"""Publish completed beta31 evidence without credentials, raw requests, logs or SDK source."""
from pathlib import Path
from urllib.parse import urlsplit
import hashlib,json,shutil,subprocess
load=lambda p:json.loads(Path(p).read_text());root=Path('.local/beta31-evidence')
paths={n:root/f for n,f in {'gtm':'gtm-results.json','pixels':'pixels-results.json','manager':'manager-results.json','native':'native-results.json','mainReinstall':'main-reinstall.json','registryPHP':'php.json','elementsPHP':'elements-php.json','settingsPHP':'settings-php.json','viewerPHP':'viewer-php.json','syntax':'syntax.json','package':'zip.json','runtime':'runtime.json','reproducibility':'repro.json'}.items()}
paths.update({'providerConfig':Path('.local/beta30-evidence/providers-results.json'),'cmp':Path('.local/manager-i18n-evidence/results.json'),'frontend':Path('.local/beta26-evidence/frontend-results.json'),'localization':Path('.local/beta28-evidence/localization-results.json'),'viewer':Path('.local/viewer-evidence/results.json'),'journalSave':Path('.local/beta24-evidence/save-results.json'),'cache':Path('.local/beta24-evidence/cache-results.json')})
for name in ['browser','http','live-guard','provider-parameters','manager-permissions']:paths[name]=Path('.local/evidence')/(name+'-results.json')
suites={n:load(p) for n,p in paths.items()}
for name,r in suites.items():
 if r.get('failed',0) or r.get('result')=='FAIL' or any(x.get('result')=='FAIL' for x in r.get('results',[])):raise RuntimeError('Failed suite '+name)
 r.pop('snapshots',None)
requests=0
for case in suites['browser']['results']:
 har=load('.local/evidence/'+case['name']+'.har')['log']['entries'];assert all(urlsplit(x['request']['url']).netloc=='127.0.0.1:8888' for x in har)
 requests+=len(har);case['har_requests']=len(har);case.pop('networkRequests',None)
assert sum(x['name'].startswith('providers-') for x in suites['browser']['results'])==256
sig='cookieconsent-0.1.0-beta31';artifact=Path('.local/artifacts')/(sig+'.transport.zip');sha=hashlib.sha256(artifact.read_bytes()).hexdigest();assert sha==suites['package']['sha256'];assert artifact.read_bytes()==Path('.local/private/beta31-final2-b/'+artifact.name).read_bytes()
assert hashlib.sha256(Path('.local/release/cookieconsent-0.1.0-beta30.transport.zip').read_bytes()).hexdigest()=='065c4ebdcc3c8a6cd2b3fb7e8ac74d6af3fbc8ba06301c058d8ee75722e22c48'
spec=load('.local/artifacts/'+sig+'.inventory.json');assert len([v for v in spec['objects'].values() if v['class'] in ['modSnippet','modChunk']])==5;assert all(v['class'] not in ['modPlugin','modPluginEvent'] for v in spec['objects'].values())
for suffix in ['.transport.zip','.transport.zip.sha256','.inventory.json','.zip-inventory.json']:
 source=Path('.local/artifacts')/(sig+suffix);target=Path('.local/release')/source.name
 if target.exists():assert target.read_bytes()==source.read_bytes(), 'Immutable release cannot be overwritten'
 else:
  with target.open('xb') as f:f.write(source.read_bytes())
  target.chmod(0o444)
history=load(root/'gtm-container-v3-failure.json');history['analyticsTag']='FAIL: published version 3 lacked analytics_storage consent check; marketing-only executed the analytics test once, expected zero.'
r={'date':'2026-10-13','branch':'feature/modx2-frontend-bundle','base_commit':'bd6d3b1','implementation_commit':subprocess.check_output(['git','rev-parse','828fd0f'],text=True).strip(),'signature':sig,'sha256':sha,'result':'GO FOR REVIEW ONLY','tests':sum(v.get('tests',1) for v in suites.values()),'assertions':sum(v.get('assertions',0) for v in suites.values()),'failed':0,'network':{'provider_combinations':256,'mock_har_requests':requests,'external_mock_requests':0,'real_GTM':'GTM-WJD8XJD6 published version 4: marketing and analytics test Custom HTML tags; tag analytics_storage check verified. Only owner gtm.js allowed externally','real_Meta_delivery':'NOT RUN','real_VK_delivery':'NOT RUN: owner genuine pixel required'},'bundle':load('_build/frontend-manifest.json'),'suites':suites,'container_configuration_review':{'version3':history,'resolution':'Owner published version 4 with analytics_storage consent check; final real-container regression passes.'},'not_run':['Genuine Google Analytics/Ads destination delivery from GTM: owner tests use harmless Custom HTML counters. Real Meta delivery/SDK background activity and VK account receipt; controlled SDK mocks only, no fabricated IDs sent to vendors. Manual VK instructions provided.','Production/staging deployment; actual hosting/CDN/browser caches; Firefox/WebKit, other PHP/MODX, Windows/IIS/LiteSpeed.','Full nginx/reverse-proxy matrix and lifecycle failure injection not rerun for this frontend release; public receiver/log code unchanged.','ENOSPC/power loss/DB outage/arbitrary FS races; no universal atomic rollback.']}
out=Path('docs/evidence');out.mkdir(exist_ok=True);(out/'modx2-beta31-results.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n');shutil.copyfile(Path('.local/release')/(sig+'.zip-inventory.json'),out/'modx2-beta31-zip-inventory.json');print(json.dumps({k:r[k] for k in ['tests','assertions','failed','sha256','network']}))
