#!/usr/bin/env python3
"""Publish bounded evidence only. Never export raw HAR, POST/config, keys or logs."""
from pathlib import Path
from urllib.parse import urlsplit
import hashlib,json,subprocess,shutil
root=Path('.local/release100-evidence');read=lambda p:json.loads(Path(p).read_text())
# Snapshot final reruns instead of stale predecessor evidence.
for src,dest in [('.local/beta33-evidence/manager-results.json','managerCategories.json'),('.local/beta31-evidence/manager-results.json','pixelManager.json'),('.local/beta30-evidence/providers-results.json','providerConfig.json')]:
 r=read(src);assert r.get('failed',0)==0;r['signature']='cookieconsent-1.0.0';(root/dest).write_text(json.dumps(r,indent=2)+'\n')
paths=sorted(p for p in root.glob('*.json') if p.name not in ['run.json']);suites={p.stem:read(p)for p in paths}
for name,r in suites.items():
 assert not r.get('failed',0) and r.get('result')!='FAIL' and not any(x.get('result')=='FAIL' for x in r.get('results',[])),name
 r.pop('snapshots',None)
requests=0
for case in suites['browser']['results']:
 har=read('.local/evidence/'+case['name']+'.har')['log']['entries'];assert all(urlsplit(x['request']['url']).netloc=='127.0.0.1:8888'for x in har)
 requests+=len(har);case['har_requests']=len(har);case.pop('networkRequests',None)
assert sum(x['name'].startswith('providers-')for x in suites['browser']['results'])==256
sig='cookieconsent-1.0.0';src=Path('.local/artifacts')/(sig+'.transport.zip');sha=hashlib.sha256(src.read_bytes()).hexdigest();assert sha=='0ed4563a2e92cf5e40ba1c269dc0d39bd0acdb6b3fb12a86f734983ce2f4b04b';assert sha==suites['package']['sha256'];assert src.read_bytes()==Path('.local/private/release100-final-d/'+src.name).read_bytes()
assert suites['native-results']['tests']==7 and suites['migration']['tests']==10 and suites['reinstall']['runtime_files']==54
assert hashlib.sha256(Path('.local/release/cookieconsent-0.1.0-beta32.transport.zip').read_bytes()).hexdigest()=='a6b1a3f18a6183f8dbbff9c706932330b054859ab4bdef90ea9f442ccad62a82'
assert hashlib.sha256(Path('.local/release/cookieconsent-0.1.0-beta33.transport.zip').read_bytes()).hexdigest()=='c7a000076850de6f6698e17577f3ea483f528486ddc95b134be48a8eb62e2caa'
spec=read('.local/artifacts/'+sig+'.inventory.json');assert spec['version_release']=='1.0.0';assert len([v for v in spec['objects'].values()if v['class']in['modSnippet','modChunk']])==5;assert all(v['class']not in['modPlugin','modPluginEvent']for v in spec['objects'].values());assert not any('bitrix24-clientid' in f['target'] or '/examples/'in f['target']for f in spec['files'])
for suffix in ['.transport.zip','.transport.zip.sha256','.inventory.json','.zip-inventory.json']:
 p=Path('.local/artifacts')/(sig+suffix);dest=Path('.local/release')/p.name
 if dest.exists():assert dest.read_bytes()==p.read_bytes(),'Immutable release cannot be overwritten'
 else:
  with dest.open('xb')as f:f.write(p.read_bytes())
  dest.chmod(0o444)
r={'date':'2026-10-14','signature':sig,'sha256':sha,'implementation_commit':subprocess.check_output(['git','rev-parse','7a00ef3'],text=True).strip(),'beta33_commit':subprocess.check_output(['git','rev-parse','37f6d8c'],text=True).strip(),'result':'GO stable repository release; site deployment requires owner staging acceptance','tests':sum(v.get('tests',1)for v in suites.values()),'assertions':sum(v.get('assertions',0)for v in suites.values()),'failed':0,'network':{'provider_combinations':256,'mock_har_requests':requests,'external_mock_requests':0,'real_gtm':'Owner published GTM-WJD8XJD6; harmless marketing/analytics checks only','servers':['Apache','nginx/PHP-FPM','Apache behind nginx proxy'],'self_request_403_browser_ack_jsonl':True},'bundle':read('_build/frontend-manifest.json'),'suites':suites,'not_run':['Actual Meta/VK/GA/Ads/Metrika/Bitrix24 account delivery, real Yandex SDK/key/tiles/geocode or client TV/backend/hosting. Controlled SDKs/queues/owner source adaptation do not prove vendor delivery.','Production or customer staging deployment; actual CDN/hosting caches; Firefox/WebKit, Windows/IIS/LiteSpeed, other MODX/PHP versions.','Full native late failure injection after partial writes/uninstall, ENOSPC, power loss, DB outages, arbitrary filesystem races. Native PM is not an atomic rollback guarantee; backup/restore is required.','Legacy ledger state.json/menu/rollback scenarios are not applicable to this minimal native architecture; no own package ledger exists.','Real TLS/certificate chain/remote redirects repeated testing and malformed audit self-response matrix at hosting were not run; enable/Save uses no self-request. Local PHP diagnostics, Origin/replay/rate checks and real browser ACK+JSONL were run.'],'preparatory_findings':['Detected fresh Manager empty locale dictionaries as arrays; fixed narrowly, real RU/EN POST/save/reload and corrupt-array refusal regression passed.','Development ZIP replacement under the same signature caused a stale resolver OPcache failure; cleared local fixture workers and final immutable native fresh/upgrade/reinstall/uninstall passed. Published beta archives were not replaced.','Harness corrections: JSON helper parsing, fixture alias, explicit mixed-checkbox reapproval, generic stable signature path, direct API draft dictionary shape, inclusion of CSS in runtime snapshot. Final runs have zero FAIL.'],'execution_scope':'Public full matrix ran on the identical final public bundle/PHP category and consent code. Later narrow Manager dictionary/restore-helper fixes were followed by affected Manager, clean/native lifecycle, recovery, runtime hashes and syntax reruns on the exact final ZIP.'}
out=Path('docs/evidence');(out/'modx2-1.0.0-results.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n');shutil.copyfile(Path('.local/release')/(sig+'.zip-inventory.json'),out/'modx2-1.0.0-zip-inventory.json');print(json.dumps({k:r[k]for k in['tests','assertions','failed','sha256','network']}))
