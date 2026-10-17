"""Compact, non-secret release evidence; full disposable snapshots stay ignored."""
from pathlib import Path
import json, sys
root=Path(__file__).resolve().parents[2];major=sys.argv[1];run_id=sys.argv[2];base=root/'.local/release-test'/('modx'+major)
read=lambda p:json.loads((base/p).read_text())
native=read('native-'+run_id+'.json');ui=read('ui/results.json');web=read('web/results.json');local=read('local/results.json');transport=read('transport.json');inventory=read('installed-inventory.json')
for d in [native,ui,web,local]:assert d['failed']==0
assert native['tests']==6 and ui['tests']==15 and web['tests']==7
rows=[]
for row in native['results']:
 before=row['before'];after=row['after'];old=row['preservation_before'];new=row['preservation_after']
 rows.append({'name':row['name'],'case':row['case'],'result':row['result'],'assertions':row['assertions'],'installed_version':after['packageVersion'],'baseline_versions':list(after['checksums']['versions']),'settings_retained':old['settings']==new['settings'] if row['name']!='fresh' else None,'historical_jsonl_retained':old['logs']==new['logs'] if row['name']!='fresh' else None,'owner_js_retained':old['owner']==new['owner'] if row['name']!='fresh' else None,'old_bundle_sha256':before['bundle'],'new_bundle_sha256':after['bundle'],'old_build_timestamp':before['timestamp'],'new_build_timestamp':after['timestamp'],'build_state':after['build']['state'],'php_error_delta':new['php_error_count']-old['php_error_count'],'aliases_off':new['aliases_off']})
meta=json.loads((root/'_build/package.json').read_text())
e={'status':'READY FOR MANUAL TESTING','platform':'MODX '+('2.8.8' if major=='2' else '3.2.4'),'branch':'codex/modx'+major+'-release-test','ui_source_commit':'efaca7389ae7a77ba2aadcb9e0077a3e05e355fa' if major=='2' else '12adbd0eb45e7ebc88a8238420a51bf1585d06b8','transport':transport,'installed_inventory':inventory,'native_upgrade':{'tests':native['tests'],'assertions':native['assertions'],'failed':0,'old_version':native['old_version'],'results':rows},'browser_installed_frontend':web,'browser_upgraded_ui':ui,'local':local,'manual':'docs/release-test-manual.md','full_evidence':str(base.relative_to(root)),'database_migration':False,'runtime_change':'Existence checks avoid MODX logging @-suppressed missing optional bundle/error-marker warnings; no change to build recipe, locking, atomic publish, rollback or visitor path.','limitations':['External SDK/player responses controlled. Real delivery/playback and customer hosting/CSP require manual testing.','Chromium only. Full historical Manager ACL matrix not repeated.','MODX 3 pdoTools3 warm Fenom issue is out of scope and unchanged.']}
(root/'docs/evidence'/('modx'+major+'-release-test-results.json')).write_text(json.dumps(e,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'platform':e['platform'],'native':native['tests'],'ui':ui['tests'],'web':web['tests'],'local':local['tests'],'status':e['status']}))
