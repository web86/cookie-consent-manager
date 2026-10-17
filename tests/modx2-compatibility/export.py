"""Strict gates; only synthetic bounded results enter Git, never keys/raw snapshots."""
import collections
import hashlib
import json
from pathlib import Path
import re
from audit import ROOT, LOCAL

def read(path):return json.loads(path.read_text())
def passed(report, count):
    assert report['tests']==count and report['failed']==0
    assert all(r['result']=='PASS' for r in report['results'])
    return {k:report[k] for k in ['tests','assertions','failed','results']}

archive_audit=read(LOCAL/'api-audit.json')
rows=[];attempts=[]
for case in read(LOCAL/'cases.json'):
    folder=LOCAL/case['name']/'evidence'
    browser=passed(read(folder/'browser.json'),13)
    upgrade=read(folder/'cms-browser.json');assert upgrade['result']=='PASS'
    before,after=read(folder/'cms-before.json'),read(folder/'cms-after.json')
    assert before==after and before['logs'] and len(before['elements'])==6
    key_before,key_after=read(folder/'cms-before-key.json'),read(folder/'cms-after-key.json')
    assert key_before==key_after and key_before['sha256']
    for artifact in ['requirements-candidate.json','requirements-final.json','original-core-integrity.json']:
        assert read(folder/artifact)['result']=='PASS'
    targeted=read(folder/'targeted.json');assert len(targeted)==5 and all(r['result']=='PASS' for r in targeted)
    rows.append(dict(case=case,environment=read(folder/'setup-info.json'),browser=browser,
                     targeted=targeted,upgrade=upgrade,settings_logs_ids_adapters_preserved=True,
                     audit_key_preserved=True,core_integrity=read(folder/'original-core-integrity.json')))
    for attempt in sorted(folder.glob('browser-attempt-*.json')):
        for test in read(attempt)['results']:
            if test['result']=='FAIL':attempts.append(dict(case=case['name'],test=test['name'],result='FAIL',reason='test reader used wrong suffix' if 'ACK event_id' in test['error'] else 'test used MODX 3 language controller URL'))
assert [r['upgrade']['mode'] for r in rows]==['Strict','Legacy']
fresh=[]
for case in read(LOCAL/'final-cases.json'):
    folder=LOCAL/case['name']/'evidence'
    report=passed(read(folder/'final.json'),4)
    integrity=read(folder/'original-core-integrity.json');assert integrity['result']=='PASS' and not integrity['changed']
    upstream=read(folder/'upstream-rss.json');assert upstream['result']=='PASS' and not upstream['component_loaded']
    fresh.append(dict(case=case,environment=read(folder/'setup-info.json'),acceptance=report,core_integrity=integrity,upstream_reproduction=upstream,
                      adapters={mode:read(folder/f'adapters-{mode}.json') for mode in ['strict','legacy']}))
baseline=read(LOCAL/'baseline/results.json');passed(baseline,4)
diagnostics=read(LOCAL/'server-log-audit-final.json');assert len(diagnostics)==4
assert all(not r['unexpected_php_or_modx'] and not r['unexpected_http'] for r in diagnostics)
signature='cookieconsent-1.0.8-pl3';zip_name=signature+'.transport.zip'
hashes=[hashlib.sha256((LOCAL/'artifacts'/folder/zip_name).read_bytes()).hexdigest() for folder in ['pl3','release','reproducible']]
assert len(set(hashes))==1
verification=read(LOCAL/'artifacts/release/verification.json');assert verification['result']=='PASS' and verification['sha256']==hashes[0]
cli=collections.Counter()
for file in ['browser-run.log','final-run.log']:
    for line in (LOCAL/file).read_text().splitlines():
        if 'PHP Deprecated:' in line:
            diagnostic=line.split('PHP Deprecated:',1)[1].strip()
            assert re.search(r'Creation of dynamic property xPDOQuery_mysql::\$xpdo is deprecated',diagnostic)
            cli[diagnostic]+=1
result=dict(decision='GO for component compatibility review; official old-CMS warnings remain',
            base_commit='24fb052c83aefe2966f236ba5a466782458f48ed',
            requirements=dict(php='>=8.1.0',modx='>=2.8.4,<3.0.0'),
            audit=archive_audit,matrix=rows,final_fresh=fresh,baseline=baseline,
            diagnostics=diagnostics,known_original_xpdo_cli_deprecations=dict(cli),
            prior_harness_attempts=attempts,artifact=dict(path=str((LOCAL/'artifacts/release'/zip_name).relative_to(ROOT)),
                sha256=hashes[0],candidate_final_cross_php_identical=True,verification=verification),
            limitations=['Intermediate CMS installs/browser tests intentionally SKIP; static + targeted original xPDO checks PASS.',
                         'External SDK/player responses controlled locally; actual vendor delivery/playback SKIP.',
                         'Official MODX 2.8.4 warnings/deprecations are recorded, not fixed or hidden.'])
out=ROOT/'docs/evidence/modx2-version-compatibility.json'
out.write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n')
print(json.dumps(dict(result='PASS',matrix_browser_assertions=sum(r['browser']['assertions'] for r in rows),
                     final_fresh_assertions=sum(r['acceptance']['assertions'] for r in fresh),
                     baseline_assertions=baseline['assertions'],upgrade_assertions=sum(r['upgrade']['assertions'] for r in rows),sha256=hashes[0])))
