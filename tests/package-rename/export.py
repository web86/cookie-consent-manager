"""Fail closed on incomplete gates; export no private settings, logs, keys or credentials."""
import hashlib,json,re,subprocess
from driver import compose
from prepare import ROOT,LOCAL

def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
sig='cookieconsentmanager-1.0.8-pl4';folder=LOCAL/'artifacts/release-rc';archive=folder/(sig+'.transport.zip')
verification=json.loads((folder/'verification.json').read_text());assert verification['result']=='PASS'
assert sha(archive)==verification['sha256']==(folder/(archive.name+'.sha256')).read_text().split()[0]
assert archive.read_bytes()==(LOCAL/'artifacts/reproducible-rc'/archive.name).read_bytes()
spec=json.loads((folder/(sig+'.inventory.json')).read_text());runtime=json.loads((ROOT/'_build/transport-files.json').read_text())
for item in spec['files']:
    assert item['sha256']==sha(ROOT/runtime[item['target']]),'Source changed after build: '+item['target']
    assert not re.search(r'components/cookieconsent/',item['target'])
    assert not item['target'].startswith('assets/js/cookie-consent/services/')
assert spec['objects']['category']['criteria']['category']=='CookieConsentManager'
assert spec['objects']['namespace']['fields']['name']=='cookie_consent'
rows=[];physical=0
for c in json.loads((LOCAL/'final-all-cases.json').read_text()):
    f=LOCAL/c['name'];out=f/'evidence';report=json.loads((out/('fresh.json' if c['fresh'] else 'browser.json')).read_text())
    assert report['failed']==0 and report['tests']==(4 if c['fresh'] else 13)
    assert all(r['result']=='PASS' for r in report['results'])
    state=json.loads(compose(c,'exec','-T','web','php','/opt/cc-source/tests/package-rename/fixture.php','rename-state',capture_output=True,text=True).stdout)
    assert all(v==1 for v in state['counts'].values());physical+=len(state['counts'])
    assert state['namespace']=='{core_path}components/cookieconsentmanager/';physical+=1
    assert state['history'].get('1.0.8-pl4');physical+=1
    canonical=json.loads(compose(c,'exec','-T','web','php','/opt/cc-source/tests/package-rename/fixture.php','canonical-state',capture_output=True,text=True).stdout)
    for key in ['chunk','CookieConsent','CookieConsentAssets','CookieConsentBanner','CookieConsentMap','CookieConsentVideo']:
        definition=spec['objects'][key];actual=canonical[definition['criteria']['name']]
        assert not actual['static'] and actual['sha256']==hashlib.sha256(definition['fields']['snippet'].encode()).hexdigest();physical+=1
    if c['fresh']:
        assert set(state['element_categories'].values())=={'CookieConsentManager'};physical+=1
        assert state['foreign']['category']['category']=='cookieconsent';physical+=1
        lifecycle=json.loads((out/'lifecycle.json').read_text());assert lifecycle['result']=='PASS' and lifecycle['test_only']
        proof=json.loads((out/'upstream-cache.json').read_text());assert proof['result']=='PASS' and not proof['component_loaded']
        # The concurrency proof used unmodified official xPDO, without component bootstrap.
        original=ROOT/'.local/modx2-compatibility/download'/('modx-'+c['modx'])/'core/xpdo/cache/xpdocachemanager.class.php'
        assert sha(original)==sha(f/'site/core/xpdo/cache/xpdocachemanager.class.php');physical+=1
    else:
        assert state['packages']['cookieconsent-1.0.8-pl3']['installed'];physical+=1
        assert '1.0.8-pl3' in state['history'];physical+=1
        lifecycle=None;proof=None
        for item in spec['files']:assert sha(f/'site'/item['target'])==item['sha256'];physical+=1
    rows.append(dict(case=c['name'],modx=c['modx'],php=c['php'],kind='fresh' if c['fresh'] else 'rename',tests=report['tests'],assertions=report['assertions'],failed=0,results=report['results'],same_family_lifecycle=lifecycle,upstream_cache=proof))
php=json.loads((LOCAL/'php-results.json').read_text());assert len(php)==36 and all(r['result']=='PASS' for r in php)
adapter=json.loads((LOCAL/'adapter-sync-final.json').read_text());assert len(adapter)==2 and all(r['result']=='PASS' for r in adapter)
php_assertions=0
for r in php:
    log=LOCAL/('unit-php'+r['php'].replace('.',''))/(r['file'].replace('/','-')+'.log')
    if r['file']=='tests/adapter-updates/php.php':log=log.parent/'adapter-sync-rename-final.log'
    matches=re.findall(r'"assertions"\s*:\s*(\d+)',log.read_text());assert matches,r['file'];php_assertions+=int(matches[-1])
diagnostics=json.loads((LOCAL/'diagnostics.json').read_text());assert len(diagnostics)==8 and all(not r['unexpected'] and not r['unexpected_http'] for r in diagnostics)
syntax=json.loads((LOCAL/'syntax.json').read_text());assert syntax['result']=='PASS'
base='1824a664e43f380722b0c49be9918acc407a32b7'
for p in (ROOT/'assets/js/cookie-consent').rglob('*.js'):
    # The generated build is also expected to be byte-identical, despite the package name.
    rel=str(p.relative_to(ROOT));assert p.read_bytes()==subprocess.check_output(['git','show',base+':'+rel],cwd=ROOT),rel
result=dict(schema=1,date='2026-10-18',branch='codex/modx2-cookieconsentmanager',base=base,signature=sig,sha256=sha(archive),bytes=archive.stat().st_size,compatibility=dict(modx='>=2.8.4,<3.0.0',php='>=8.1.0'),native_archive=verification,reproducible=True,tests=sum(r['tests'] for r in rows)+4,assertions=sum(r['assertions'] for r in rows)+sum(r['same_family_lifecycle']['assertions'] for r in rows if r['same_family_lifecycle']),failed=0,physical_checks=physical,cases=rows,php=dict(suites=len(php),assertions=php_assertions,failed=0,versions=['8.1.34','8.2.34'],results=php),syntax=syntax,diagnostics=diagnostics,preserved_visitor_js='byte-identical to base, including generated esbuild JS',third_party_fixture=dict(repository='https://github.com/QupeDev/cookieconsent',commit='2fb353a5ebf7974f38be080f5fbcb8baef3ccef8',scope='source trees and native namespace/settings/category/chunk/plugin; foreign banner disabled',official_modstore_zip='NOT RUN',clientconfig='NOT RUN'),migration=dict(native_action='INSTALL across different package names; UPGRADE within cookieconsentmanager family',old_package_record='retained, installed timestamp untouched',automatic_uninstall=False,old_component_files='unchanged',adapter_paths='unchanged',adapter_sha256_history='retained and extended',warning='Do not uninstall/reinstall/update the old cookieconsent transport after migration; it owns shared JS and removes the cache plugin by name.'),modstore_decision='NO-GO',blockers=['Official foreign Modstore transport with ClientConfig coexistence acceptance is not run.','Cross-name migration requires the documented manual restriction on the old package record; user acceptance is outstanding.'],modx3=dict(status='NOT STARTED: MODX 2 acceptance gate not closed',head='ef96e4f2e4d39ffebae5e63d2bbfbc9cfe48af32',candidate='cookieconsentmanager3-1.0.8-pl5',compatibility=dict(modx='>=3.1.2,<3.3.0',php='>=8.1.0')),release_published=False,deployed=False)
result['native_backup_dry_run']=json.loads((LOCAL/'backup-dry-run.json').read_text())
assert len(result['native_backup_dry_run'])==4 and all(r['result']=='PASS' and not r['applied'] and r['elements']==6 for r in result['native_backup_dry_run'])
result['js_regressions']=[]
for suite,path in [('video-esbuild','unit-final/esbuild-video-embeds.log'),('video-php','unit-final/php-video-embeds.log'),('placeholder-esbuild','placeholder-esbuild-final.log'),('placeholder-php','placeholder-php-final.log'),('differential','unit-final/differential.log'),('differential-php','unit-final/php-differential.log'),('semantics','unit-final/semantics.log')]:
    output=(LOCAL/path).read_text();passed=sum(line.startswith('PASS ') for line in output.splitlines());assert passed and 'AssertionError' not in output and 'FAIL ' not in output
    result['js_regressions'].append(dict(suite=suite,result='PASS',pass_lines=passed,log_sha256=sha(LOCAL/path)))
target=ROOT/'docs/evidence/modx2-package-rename.json';target.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:result[k] for k in ['signature','sha256','tests','assertions','failed','physical_checks','php','modstore_decision']},ensure_ascii=False))
