"""Export bounded synthetic evidence only after all acceptance gates complete."""
import json
import os
import hashlib
from pathlib import Path
from prepare import LOCAL, ROOT

cases=json.loads((LOCAL/'cases.json').read_text())
shared=Path(os.environ.get('CC_MATRIX_SHARED_EVIDENCE',str(LOCAL)))
final=bool(os.environ.get('CC_MATRIX_FINAL'))
cells=[]
for case in cases:
    fixture=LOCAL/case['name']
    result=json.loads((fixture/'evidence/browser.json').read_text())
    if result['tests']!=23 or result['failed'] or any(r['result']!='PASS' for r in result['results']):
        raise RuntimeError('Incomplete/failed cell: '+case['name'])
    info=json.loads((fixture/'evidence/setup-info.json').read_text())
    if info['modx']!=case['modx'] or not info['php'].startswith(case['php']+'.'):
        raise RuntimeError('Unexpected installed versions')
    cells.append(dict(case=case,versions=info,result='PASS',tests=result['tests'],
                      assertions=result['assertions'],groups=result['results']))
upgrades=[]
for name in ['m312p81','m312p82']:
    fixture=LOCAL/name
    before=json.loads((fixture/'evidence/cms-before.json').read_text())
    after=json.loads((fixture/'evidence/cms-after.json').read_text())
    if before!=after: raise RuntimeError('CMS preservation failure')
    result=json.loads((fixture/'evidence/cms-browser.json').read_text())
    if result['result']!='PASS' or result['component_reinstalled']: raise RuntimeError('CMS browser failure')
    upgrades.append(dict(case=name,from_modx='3.1.2-pl',**result,preserved_snapshot=True))
local={}
for name in ['esbuild-video','esbuild-texts','php-video','php-texts']:
    result=json.loads((shared/f'local-regression/{name}.json').read_text())
    if result['failed']: raise RuntimeError('Local browser regression: '+name)
    local[name]=result
for name in ['php81-local','php82-local','php81-bundle-unprivileged']:
    records=[]
    for line in (shared/(name+'.log')).read_text().splitlines():
        try:
            row=json.loads(line)
            if row.get('result')=='PASS' or row.get('failed')==0: records.append(row)
        except ValueError: pass
    local[name]=records
    expected=5 if name=='php81-local' else 6 if name=='php82-local' else 1
    if len(records)!=expected: raise RuntimeError('Missing local PHP checks: '+name)
boundaries={}
for php in ['81','82']:
    result=json.loads((shared/f'requirements-{"final" if final else "candidate"}-php{php}.json').read_text())
    if result['result']!='PASS': raise RuntimeError('Candidate requirement boundary')
    boundaries['php'+php]=result
native=json.loads((shared/('native-verify-final.json' if final else 'native-verify-candidate.json')).read_text())
if native['result']!='PASS': raise RuntimeError('Native inventory')
focused=[]
focused_upgrades=[]
server_logs={}
if final:
    first=shared/'artifacts/release-pl4/cookieconsent3-1.0.8-pl4.transport.zip'
    second=LOCAL/'artifacts/repro-pl4/cookieconsent3-1.0.8-pl4.transport.zip'
    if hashlib.sha256(first.read_bytes()).hexdigest()!=native['sha256'] or first.read_bytes()!=second.read_bytes():
        raise RuntimeError('Final native artifact is not reproducible')
    lifecycle=ROOT/os.environ.get('CC_MATRIX_LIFECYCLE_DIRECTORY','.local/modx3-matrix-lifecycle')
    for label,directory in [('full',LOCAL),('lifecycle',lifecycle)]:
        rows=json.loads((directory/'server-log-audit.json').read_text())
        if len(rows)!=12 or any(r['unexpected_5xx'] or r['php_diagnostics'] or r['pre_setup_audit503']>1 for r in rows):
            raise RuntimeError('Unexplained server log errors')
        server_logs[label]=rows
    for case in cases:
        fixture=lifecycle/case['name']
        result=json.loads((fixture/'evidence/browser.json').read_text())
        if result['tests']!=4 or result['failed'] or not result.get('nativeOnly') or not result.get('complete'):
            raise RuntimeError('Strict native lifecycle incomplete: '+case['name'])
        focused.append(dict(case=case['name'],result='PASS',fresh_install_aliases=False,
                            tests=result['tests'],assertions=result['assertions'],groups=result['results']))
    for name in ['m312p81','m312p82']:
        fixture=lifecycle/name
        before=json.loads((fixture/'evidence/cms-before.json').read_text())
        after=json.loads((fixture/'evidence/cms-after.json').read_text())
        key_before=json.loads((fixture/'evidence/cms-before-key.json').read_text())
        key_after=json.loads((fixture/'evidence/cms-after-key.json').read_text())
        browser=json.loads((fixture/'evidence/cms-browser.json').read_text())
        if before!=after or not before['logs'] or key_before!=key_after or not key_before['sha256'] or browser['result']!='PASS':
            raise RuntimeError('Seeded strict CMS migration failure: '+name)
        focused_upgrades.append(dict(case=name,mode='strict',seeded_logs=True,key_retained=True,**browser))
evidence={
    'date':'2026-10-17','baseline_commit':'53b0c34','result':'GO','phase':'final-pl4' if final else 'candidate-pl3',
    'matrix_tests':sum(c['tests'] for c in cells),'matrix_assertions':sum(c['assertions'] for c in cells),
    'archives':json.loads((LOCAL/'archives.json').read_text()),
    'images':(shared/'images.txt').read_text().splitlines(),
    'baseline_comparison':json.loads((shared/('baseline-comparison-final.json' if final else 'baseline-comparison.json')).read_text()),
    'matrix':cells,'cms_upgrades':upgrades,'local_regression':local,
    'requirement_boundaries':boundaries,'native_inventory':native,
    'strict_native_lifecycle':focused,'strict_cms_upgrades':focused_upgrades,
    'strict_native_lifecycle_tests':sum(c['tests'] for c in focused),
    'strict_native_lifecycle_assertions':sum(c['assertions'] for c in focused),
    'reproducible_archive':final,
    'server_log_audit':server_logs,
    'attempt_history':[
        {'result':'FAIL','scope':'initial PHP 8.2 setup environment','reason':'Existing image lacked gd and zip; new full PHP 8.2.34 image installed official CMS successfully. Initial log retained.'},
        {'result':'FAIL','scope':'root-only bundle permission fixture','reason':'Root bypassed chmod denial; unprivileged www-data runs pass on PHP 8.1.34 and 8.2.34.'},
        {'result':'STOP','scope':'CMS upgrade harness before file overlay','reason':'Guard rejected stock config.core.php. Upgrade now explicitly preserves all active config files; original snapshot and SQL dump retained.'},
        {'result':'FAIL','scope':'CMS browser harness expectation','reason':'Expected Strict while accepted fixture intentionally retained Legacy. Expected iframe count and button now derive from preserved options; both migrations pass.'},
        {'result':'INTERRUPTED','scope':'m323p81 Playwright teardown after 4 passing groups','reason':'Pending route.fetch raced context.close. Await unrouteAll(wait); preserve initial log and four verified native groups, continue remaining groups on same site without reset. Final 23 groups pass.'},
        {'result':'HARNESS_ERROR','scope':'initial API setup request without Origin','reason':'The harness omitted Origin; Save correctly returned partial=true and left audit not configured, causing first audit HTTP 503. Real browser Save configured it. Corrected API helper includes Origin/Referer and asserts partial=false, ready audit and exact log directory. A separate clean 12-cell lifecycle campaign verifies the rejection, valid setup, seeded logs before native upgrade and 200 deliveries afterward.'},
        {'result':'INFRASTRUCTURE_STOP','scope':'last three final compose networks','reason':'Docker default address pools exhausted. Preserved logs and removed only completed task containers/networks with compose down, retaining DB volumes/sites; no global prune or other project changes. Continued unused cells afterward.'},
    ],
}
target=ROOT/'docs/evidence'/('modx3-version-compatibility-final.json' if final else 'modx3-version-compatibility.json')
target.write_text(json.dumps(evidence,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'result':'GO','cells':len(cells),'tests':evidence['matrix_tests'],'assertions':evidence['matrix_assertions']}))
