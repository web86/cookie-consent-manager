"""Release invariants, exact adapter bytes and transport boundaries."""
from pathlib import Path
import json,sys,hashlib,zipfile,subprocess
ROOT=Path(__file__).resolve().parents[2]
meta=json.loads((ROOT/'_build/package.json').read_text());name=meta['name'];major=3 if name.endswith('3') else 2
base='fdae379' if major==3 else '4ba4ef4';sha=lambda b:hashlib.sha256(b).hexdigest();count=0
def check(ok,message):
 global count
 count+=1
 if not ok:raise AssertionError(message)
manifest=json.loads((ROOT/'_build/frontend-manifest.json').read_text())
for path,digest in manifest['inputs'].items():check(sha((ROOT/path).read_bytes())==digest,path)
for path,d in manifest['outputs'].items():check(sha((ROOT/path).read_bytes())==d['sha256'],path)
for path in manifest['inputs']:
 if '/services/' in path:
  old='assets/js/cookie-consent/services/'+Path(path).name
  check((ROOT/path).read_bytes()==subprocess.check_output(['git','show',base+':'+old],cwd=ROOT),'Adapter bytes changed: '+path)
check(not any('mock-marketing' in path for path in manifest['inputs']),'Mock in build')
check('mock_marketing' not in (ROOT/'server/src/CookieConsentServiceRegistry.php').read_text(),'Mock registry')
check('COOKIE_CONSENT_LOCAL_HTTP' not in (ROOT/'server/src/CookieConsentAuditHttp.php').read_text(),'Docker routing')
check('CookieConsentRegistry' not in (ROOT/'server/bin/restore-elements.php').read_text(),'Retired snippet')
check("dirname(__DIR__,3).'/index.php'" not in (ROOT/f'server/modx{major}-public-endpoint.example.php').read_text(),'Root index bootstrap')
for target in json.loads((ROOT/'_build/transport-files.json').read_text()):check(target.startswith((f'core/components/{name}/',f'assets/components/{name}/')),'Shared target '+target)
if len(sys.argv)>1:
 archive=Path(sys.argv[1]);spec=json.loads(Path(str(archive).replace('.transport.zip','.inventory.json')).read_text())
 for item in spec['files']:check(item['target'].startswith((f'core/components/{name}/',f'assets/components/{name}/')),'Shared ZIP target')
 with zipfile.ZipFile(archive) as z:
  for filename in z.namelist():
   check(not filename.endswith('/mock-marketing.js'),'Mock file in ZIP')
   if filename.endswith('.php'):check(b'COOKIE_CONSENT_LOCAL_HTTP' not in z.read(filename),'Docker route in ZIP')
print(json.dumps({'result':'PASS','assertions':count,'product':name,'sha256':sha(archive.read_bytes()) if len(sys.argv)>1 else None}))
