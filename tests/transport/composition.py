#!/usr/bin/env python3
"""Closed native ZIP inventory, plus negative tests for untracked/development payloads."""
from pathlib import Path
import hashlib,json,subprocess,sys,tempfile,zipfile
root=Path(__file__).resolve().parents[2]
archive=Path(sys.argv[1]).resolve()
core=sys.argv[2] if len(sys.argv)>2 else '/opt/cc-private/core'
spec_path=Path(str(archive).replace('.transport.zip','.inventory.json'))
spec=json.loads(spec_path.read_text())
allowlist=json.loads((root/'_build/transport-files.json').read_text())
manifest=json.loads((root/'_build/frontend-manifest.json').read_text())
checks=0

def check(value,message):
    global checks
    checks+=1
    if not value:raise AssertionError(message)

def verify(path):
    return subprocess.run(['php',str(root/'_build/verify.php'),str(path),core],text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)

baseline=verify(archive)
check(baseline.returncode==0,baseline.stdout)
summary=json.loads(baseline.stdout)
check({f['target'] for f in spec['files']}==set(allowlist),'Exact runtime allowlist')
js=[p for p in manifest['inputs'] if p.endswith('.js')]
check(len(js)==21 and all(allowlist.get(p)==p for p in js),'All 21 ordered BundleManager sources shipped')
check(all('assets/js/cookie-consent/embeds/'+p+'.js' in allowlist for p in ['youtube','rutube','vk-video']),'All video adapters')
check(not any('/mock/' in p for p in allowlist),'Test/demo mock directory excluded')
check('assets/js/cookie-consent/services/mock-marketing.js' in allowlist,'Referenced factory retained among the 21 build sources')
for target in allowlist:
    parts=set(Path(target).parts)
    check(not parts.intersection({'.git','.github','.local','node_modules','tests','fixtures','debug','logs','docs','mock','mocks','mok'}),'No development directory: '+target)
    check(not target.endswith(('.map','.log','.har','.pem','.env','README.md')),'No development payload: '+target)
with zipfile.ZipFile(archive) as z:
    names=[i.filename for i in z.infolist() if not i.is_dir()]
    entries={n:z.read(n) for n in names}
check(len(entries)==len(names),'No duplicate ZIP paths')
negative=[]
# Recompute SHA so the tests exercise content policy, not merely the checksum gate.
with tempfile.TemporaryDirectory(prefix='cc-composition-') as temp:
    for label,name in [('test-fixture','tests/fixture.js'),('source-map','debug.js.map'),('unknown-runtime','unexpected-runtime.php')]:
        path=Path(temp)/(spec['signature']+'.transport.zip')
        with zipfile.ZipFile(path,'w',compression=zipfile.ZIP_DEFLATED) as z:
            for n,body in entries.items():z.writestr(n,body)
            z.writestr(spec['signature']+'/'+name,'/* not required by any native vehicle */')
        Path(str(path).replace('.transport.zip','.inventory.json')).write_bytes(spec_path.read_bytes())
        Path(str(path)+'.sha256').write_text(hashlib.sha256(path.read_bytes()).hexdigest()+'  '+path.name+'\n')
        result=verify(path)
        check(result.returncode!=0 and ('Excluded content' in result.stdout or 'Unexpected or missing ZIP content' in result.stdout),'Reject '+label+': '+result.stdout)
        negative.append({'case':label,'result':'PASS'})
    # Byte changes in an allowlisted runtime file must still fail its native inventory hash.
    key=next(n for n in entries if n.endswith('/CookieConsentBundleManager.php'))
    with zipfile.ZipFile(path,'w',compression=zipfile.ZIP_DEFLATED) as z:
        for n,body in entries.items():z.writestr(n,body+(b'\n// corrupt' if n==key else b''))
    Path(str(path)+'.sha256').write_text(hashlib.sha256(path.read_bytes()).hexdigest()+'  '+path.name+'\n')
    result=verify(path)
    check(result.returncode!=0 and 'Native file inventory mismatch' in result.stdout,'Reject changed runtime bytes: '+result.stdout)
    negative.append({'case':'changed-runtime-bytes','result':'PASS'})
out=root/'.local/beta2-evidence';out.mkdir(exist_ok=True,parents=True)
report={'result':'PASS','assertions':checks,'native':summary,'mock_directory_files_retained':0,'referenced_mock_factory_retained':True,'negative':negative}
(out/'composition.json').write_text(json.dumps(report,indent=2)+'\n')
(out/'runtime-files.txt').write_text('\n'.join(sorted(allowlist))+'\n')
(out/'zip-files.txt').write_text('\n'.join(sorted(entries))+'\n')
print(json.dumps(report))
