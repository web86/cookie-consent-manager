"""Validate the final native evidence and archive; emit only safe release data."""
from pathlib import Path
from collections import Counter
import hashlib,json,re,zipfile
ROOT=Path(__file__).resolve().parents[2];LOCAL=ROOT/'.local/preflight-fix'
sig='cookieconsentmanager-1.0.8-pl4';archive=LOCAL/'artifacts/release'/(sig+'.transport.zip')
sha=hashlib.sha256(archive.read_bytes()).hexdigest()
assert sha==(archive.with_suffix('.zip.sha256').read_text().split()[0])
assert archive.read_bytes()==(LOCAL/'artifacts/repro'/archive.name).read_bytes()
old=ROOT/'.local/package-rename/artifacts/first-public'/archive.name
with zipfile.ZipFile(old) as a,zipfile.ZipFile(archive) as b:
    assert a.namelist()==b.namelist()
    changed=[name for name in a.namelist() if a.read(name)!=b.read(name)]
    assert len(changed)==1 and changed[0].endswith('.preflight.script'),changed
    assert (ROOT/'_build/preflight.php').read_bytes()[6:] in b.read(changed[0])
    assert all(b'components/cookieconsent/' not in b.read(name) for name in b.namelist())
inventory=archive.with_name(sig+'.inventory.json')
assert inventory.read_bytes()==old.with_name(inventory.name).read_bytes()
cases=[];warnings=Counter()
for c in json.loads((LOCAL/'cases.json').read_text()):
    folder=LOCAL/c['name'];e=json.loads((folder/'evidence/preflight.json').read_text())
    assert not e['failed'] and all(r['result']=='PASS' for r in e['results'])
    version=json.loads((folder/'evidence/setup-info.json').read_text())
    cases.append({'modx':version['modx'],'php':version['php'],'tests':e['tests'],'assertions':e['assertions'],'results':e['results']})
    log=(folder/'site/core/cache/logs/error.log').read_text()
    assert 'verification failed' not in log and 'PHP Fatal' not in log
    for line in log.splitlines():
        if 'PHP warning:' not in line:continue
        if '/setup/includes/modinstallsettings.class.php' in line:warnings['MODX setup cache']+=1
        elif '/core/cache/mgr/smarty/' in line:warnings['MODX Manager Smarty']+=1
        elif '/core/xpdo/cache/xpdocachemanager.class.php' in line:warnings['xPDO cache directory race']+=1
        elif '/core/model/modx/xmlrss/magpierss.class.php' in line:warnings['MODX Manager RSS PHP 8.2 reference warning']+=1
        else:raise AssertionError('Unexpected PHP warning location')
log=(LOCAL/'rename-88-p81-fresh/site/core/cache/logs/error.log').read_text()
reasons=re.findall(r'Cookie Consent preflight refused: ([^\n]+)',log)[-20:]
expected=['Unowned canonical element conflict: '+name for name in ['CookieConsent','CookiesPopup','CookieConsentCacheBuild']]+['Unowned cookie_consent objects']*4+['Unowned component files; inspect before retry']*6+['Occupied runtime target; inspect before retry']+['Unowned component files; inspect before retry']*2+['Unowned component symlink; inspect before retry','Namespace path conflict','Namespace assets path conflict','bundle_busy']
assert reasons==expected,(reasons,expected)
result={'result':'PASS','decision':'GO for MODX 2 native first installation / Modstore candidate','branch':'codex/modx2-cookieconsentmanager','base_commit':'3e03babf5c2fdb635306ea96784129f68d7ed162','signature':sig,'sha256':sha,'bytes':archive.stat().st_size,'tests':sum(c['tests'] for c in cases),'assertions':sum(c['assertions'] for c in cases),'failed':0,'cases':cases,'verified_refusal_reasons':reasons,'runtime_inventory_identical_to_previous_candidate':True,'only_changed_archive_entry':changed[0],'reproducible':True,'archive_verification':json.loads((LOCAL/'artifacts/release/verification.json').read_text()),'known_core_warning_counts':dict(warnings),'upgrade_scope':'Real native vehicles invoked with ACTION_UPGRADE on own installation; no historical migration or synthetic release.','modx3_untouched_commit':'ee299272c864416e0ff49348d732ff42bd85e503','same_signature_opcache':'The replacement was tested after restarting only its disposable web container to clear old deterministic-mtime hook bytecode.'}
text=json.dumps(result,ensure_ascii=False,indent=2)+'\n'
(ROOT/'docs/evidence/modx2-preflight-fix.json').write_text(text)
(LOCAL/'artifacts/release/acceptance.json').write_text(text)
print(json.dumps({k:result[k] for k in ['result','tests','assertions','failed','sha256','bytes']},indent=2))
