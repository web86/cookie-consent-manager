#!/usr/bin/env python3
"""Export final beta32 evidence only, never raw HAR/POST/config/SDK or consent logs."""
from pathlib import Path
from urllib.parse import urlsplit
import hashlib,json,shutil,subprocess
load=lambda p:json.loads(Path(p).read_text());root=Path('.local/beta32-evidence')
paths={n:root/f for n,f in {'callbacks':'callbacks-results.json','jsMaps':'maps-results.json','native':'native-results.json','mainReinstall':'main-reinstall.json','registryPHP':'registry-php.json','settingsPHP':'settings-php.json','elementsPHP':'elements-php.json','viewerPHP':'viewer-php.json','syntax':'syntax.json','package':'zip.json','runtime':'runtime.json','reproducibility':'repro.json','scope':'scope.json'}.items()}
paths.update({'gtm':Path('.local/beta31-evidence/gtm-results.json'),'pixels':Path('.local/beta31-evidence/pixels-results.json'),'providerConfig':Path('.local/beta30-evidence/providers-results.json'),'frontend':Path('.local/beta26-evidence/frontend-results.json'),'localization':Path('.local/beta28-evidence/localization-results.json'),'viewer':Path('.local/viewer-evidence/results.json')})
for name in ['browser','http','live-guard','provider-parameters']:paths[name]=Path('.local/evidence')/(name+'-results.json')
suites={n:load(p) for n,p in paths.items()}
for name,r in suites.items():
 if r.get('failed',0) or r.get('result')=='FAIL' or any(x.get('result')=='FAIL' for x in r.get('results',[])):raise RuntimeError('Failed suite '+name)
 r.pop('snapshots',None)
requests=0
for case in suites['browser']['results']:
 har=load('.local/evidence/'+case['name']+'.har')['log']['entries'];assert all(urlsplit(x['request']['url']).netloc=='127.0.0.1:8888' for x in har)
 requests+=len(har);case['har_requests']=len(har);case.pop('networkRequests',None)
assert sum(x['name'].startswith('providers-') for x in suites['browser']['results'])==256
sig='cookieconsent-0.1.0-beta32';artifact=Path('.local/artifacts')/(sig+'.transport.zip');sha=hashlib.sha256(artifact.read_bytes()).hexdigest();assert sha==suites['package']['sha256'];assert artifact.read_bytes()==Path('.local/private/beta32-final-b/'+artifact.name).read_bytes()
assert hashlib.sha256(Path('.local/release/cookieconsent-0.1.0-beta31.transport.zip').read_bytes()).hexdigest()=='aff907145f3cec7a51cc072661fccdc80619477b82f37ae4b60bbb618fd87ec4'
spec=load('.local/artifacts/'+sig+'.inventory.json');assert len([v for v in spec['objects'].values() if v['class'] in ['modSnippet','modChunk']])==5;assert all(v['criteria'].get('name')!='CookieConsentCustomScripts' and v['class'] not in ['modPlugin','modPluginEvent'] for v in spec['objects'].values());assert not any('myyandexcoordstv' in x['target'] or 'examples' in x['target'] for x in spec['files'])
for suffix in ['.transport.zip','.transport.zip.sha256','.inventory.json','.zip-inventory.json']:
 source=Path('.local/artifacts')/(sig+suffix);target=Path('.local/release')/source.name
 if target.exists():assert target.read_bytes()==source.read_bytes(), 'Immutable release cannot be overwritten'
 else:
  with target.open('xb') as f:f.write(source.read_bytes())
  target.chmod(0o444)
r={'date':'2026-10-14','branch':'feature/modx2-frontend-bundle','base_commit':'b2f6b5a','implementation_commit':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'signature':sig,'sha256':sha,'result':'GO FOR REVIEW ONLY','tests':sum(v.get('tests',1) for v in suites.values()),'assertions':sum(v.get('assertions',0) for v in suites.values()),'failed':0,'network':{'provider_combinations':256,'mock_har_requests':requests,'external_mock_requests':0,'js_maps':'Controlled local API/endpoint fulfillment, no Yandex key or real vendor requests','gtm':'Real published owner test container; harmless marketing/analytics Custom HTML checks'},'bundle':load('_build/frontend-manifest.json'),'suites':suites,'not_run':['Actual client MODX/TV YandexCoor/endpoints deployment, genuine Yandex SDK/key/tiles/geocode/browser network. Only owner-supplied functional code and adaptation tested with controlled fixtures.','Real Meta/VK/GA/Ads destination delivery and background SDK behavior; no fake IDs sent to vendors.','Production/staging deployment; actual hosting/CDN caches; Firefox/WebKit and other PHP/MODX/Windows/IIS/LiteSpeed.','Full nginx/reverse-proxy and lifecycle failure injection not repeated; receiver/private audit code unchanged.','ENOSPC/power loss/DB outage/arbitrary FS races; no universal atomic rollback.']}
out=Path('docs/evidence');out.mkdir(exist_ok=True);(out/'modx2-beta32-results.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n');shutil.copyfile(Path('.local/release')/(sig+'.zip-inventory.json'),out/'modx2-beta32-zip-inventory.json');print(json.dumps({k:r[k] for k in ['tests','assertions','failed','sha256','network']}))
