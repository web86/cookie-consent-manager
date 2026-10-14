#!/usr/bin/env python3
"""Bounded acceptance export. Keep upgrade and provider-matrix evidence separate."""
from pathlib import Path
import hashlib,json,subprocess
root=Path('.local/locale-guide-evidence')
names=['browser-results','categories-results','managerCategories-results','callbacks-results',
       'maps-results','clientIdExample-results','localization-results','publicJson-results',
       'liveGuard-results','providerParameters-results','pixels-results','gtm-results',
       'frontend-results','viewer-results','http-results','native-results','provider-config',
       'ui','package','settings','projection','examples','settings-validation',
       'categories-php','viewer-php','config-php','reinstall','syntax','zip']
read=lambda p:json.loads(p.read_text())
suites={name:read(root/(name+'.json'))for name in names}
suites['reviewed-candidate-upgrade']=read(root/'upgrade/browser-results.json')
for name,r in suites.items():
    assert not r.get('failed',0) and r.get('result')!='FAIL',name
    assert not any(x.get('result')=='FAIL'for x in r.get('results',[])),name
assert sum(x['name'].startswith('providers-')for x in suites['browser-results']['results'])==256
assert suites['reviewed-candidate-upgrade']['results'][0]['name'].startswith('real-cookieconsent-1.0.1-to-cookieconsent-1.0.2')
sig='cookieconsent-1.0.2';archive=Path('.local/artifacts')/(sig+'.transport.zip')
digest=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
sha=digest(archive);assert sha=='dc01bd4c6d5b5e96888a6c6707a92d134daadea7fe506ea741152783153cc506'
assert archive.read_bytes()==Path('.local/private/locale-guide-b/'+archive.name).read_bytes()
assert suites['zip']['sha256']==sha
assert Path('.local/artifacts/cookieconsent-1.0.1.transport.zip').read_bytes()==Path('.local/review/public-registry/cookieconsent-1.0.1.transport.zip').read_bytes()
assert digest(Path('.local/review/public-registry/cookieconsent-1.0.1.transport.zip'))=='cb239c590c9e1f4df42409e98c642b9b927e82934520748310830e4c9f24b3d4'
assert digest(Path('.local/release/cookieconsent-1.0.0.transport.zip'))=='0ed4563a2e92cf5e40ba1c269dc0d39bd0acdb6b3fb12a86f734983ce2f4b04b'
assert subprocess.check_output(['git','rev-parse','main'],text=True).strip()==subprocess.check_output(['git','rev-parse','v1.0.0^{}'],text=True).strip()=='b6c4402a0d61c167ca9f677cc25dcc2c26e235c9'
target=Path('.local/review/locale-guide');target.mkdir(parents=True,exist_ok=True)
for suffix in ['.transport.zip','.transport.zip.sha256','.inventory.json','.zip-inventory.json']:
    src=Path('.local/artifacts')/(sig+suffix);dst=target/src.name
    if dst.exists():assert dst.read_bytes()==src.read_bytes(),'Never overwrite immutable review ZIP'
    else:dst.write_bytes(src.read_bytes());dst.chmod(0o444)
r={'date':'2026-10-14','timezone':'Europe/Istanbul','branch':'feature/modx2-commercial-polish-performance',
   'base_commit':'44b36c7','implementation_commits':['0706282','dd46995'],
   'changed_files':sorted(set(subprocess.check_output(['git','diff','--name-only','44b36c7','HEAD'],text=True).splitlines()+subprocess.check_output(['git','ls-files','--others','--exclude-standard'],text=True).splitlines())),
   'result':'GO FOR REVIEW; unpublished 1.0.2 candidate','signature':sig,'sha256':sha,
   'tests':sum(x.get('tests',1)for x in suites.values()),'assertions':sum(x.get('assertions',0)for x in suites.values()),
   'failed':0,'suites':suites,
   'environment':{'modx':'2.8.8-pl','php':'8.2.34','web_server':'Apache','browser':'Chromium','playwright':'1.62.1','esbuild':'0.28.2'},
   'frontend':{'removed_block_bytes_ru_en':78,'previous_js_bytes':20201,'current_js_bytes':20095,
               'css_bytes':3286,'registry':'Byte-identical minimal technical JSON across actual 1.0.1 upgrade',
               'consent':'Raw storage, effective consent, ID, policy/category versions and v2 fingerprints unchanged'},
   'initial_runs':[{'result':'FAIL','scenario':'Before/after HTML comparison captured EN from old regenerated context cache and RU after native upgrade',
                    'resolution':'Waited for disposable PHP context-cache revalidation, asserted RU before baseline. Actual 1.0.1-to-1.0.2 upgrade then passed exact localized HTML comparison. No product locale code fix needed.'}],
   'not_run':['Production deployment, GitHub Release/tag/main publication or updates to protected 1.0.0/1.0.1 ZIPs.',
              'Client hosting/CDN deployment, nginx/proxy/LiteSpeed/IIS, load/concurrency or network performance.',
              'PHP 8.1/other versions, Firefox/WebKit/older browsers and screen reader acceptance.',
              'Real Meta/VK/other vendor event delivery, client JS-map API keys/backend/tiles/geocode. Controlled fixtures; safe owner GTM v4 tested.',
              'New full late filesystem/DB fault injection and archived beta migration permutations; current native fresh/1.0.0 upgrade/reinstall/uninstall plus reviewed 1.0.1 consent upgrade tested.',
              'Arbitrary customer scripts and complete historical standalone CMP stacks. Retained i18n ready/t helper tested only with owner-supplied same-origin lexicons or inline strings.']}
out=Path('docs/evidence/modx2-locale-guide-results.json');out.write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:r[k]for k in ['tests','assertions','failed','sha256']}))
