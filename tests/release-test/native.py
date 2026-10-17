"""Native installed-upgrade matrix. Every case gets a NEW database/site."""
from pathlib import Path
import hashlib, json, os, subprocess, sys
root=Path(__file__).resolve().parents[2]
major=sys.argv[1];assert major in ['2','3']
run_id=sys.argv[2];assert run_id.replace('-','').isalnum()
platform='modx'+major
source=root/'.local'/('modx'+major+'-safe-adapter-updates')
fixtures=source/'.local/adapter-updates'
out=root/'.local/release-test'/platform;out.mkdir(parents=True,exist_ok=True)
container='cookie-consent-'+('modx3-' if major=='3' else '')+'adapter-updates-web-1'
meta=json.loads((root/'_build/package.json').read_text());version=meta['version']+'-'+meta['release']+str(meta['release_index']);signature=meta['name']+'-'+version
archive=sys.argv[3]
old_version='1.0.6' if major=='2' else '0.1.0-beta4'
old_archive='/opt/cc-reference/'+('.local/artifacts/cookieconsent-1.0.6.transport.zip' if major=='2' else '.local/modx3/artifacts/sync-1.0.6-beta4/cookieconsent3-0.1.0-beta4.transport.zip')
def run(args):return subprocess.check_output(args,cwd=root,text=True,stderr=subprocess.STDOUT)
def ctl(case,op,*args):return json.loads(run(['docker','exec',container,'runuser','-u','www-data','--','php',('/opt/cc-reference/tests/release-test/native-control.php' if major=='3' else '/opt/cc-source/tests/adapter-updates/control.php'),case,op,*args]))
def own(case,op,*args):return json.loads(run(['docker','exec',container,'runuser','-u','www-data','--','php','/opt/cc-reference/tests/release-test/control.php',case,op,*args]))
results=[];n=0
def eq(a,b,message):
 global n;n+=1
 if a!=b:raise AssertionError(message+': '+str((a,b)))
def save():
 (out/('native-'+run_id+'.json')).write_text(json.dumps({'platform':platform,'signature':signature,'old_version':old_version,'tests':len(results),'assertions':n,'failed':sum(r['result']=='FAIL' for r in results),'results':results},indent=2)+'\n')
def setup(case):
 run(['python3',str(source/'tests/adapter-updates/prepare.py'),str(root),case])
 run(['docker','exec',container,'php','/opt/cc-source/tests/adapter-updates/setup.php',case])
 log=run(['docker','exec','-w','/opt/cc-updates/cases/'+case+'/site/setup',container,'php','index.php','--installmode=new','--config=/opt/cc-updates/cases/'+case+'/private/setup.xml'])
 (out/('setup-'+case+'.log')).write_text(log)
 if major=='3':run(['docker','exec',container,'php','/opt/cc-source/tests/adapter-updates/finish.php',case])
 run(['docker','exec',container,'mv','/opt/cc-updates/cases/'+case+'/site/setup','/opt/cc-updates/cases/'+case+'/private/completed-setup'])
 run(['docker','exec',container,'chown','-R','www-data:www-data','/opt/cc-updates/cases/'+case])
for name in ['fresh','original','legacy','edited','deleted','syntax']:
 case='ui-refinement-rt'+major+'-'+run_id+'-'+name;before_n=n
 try:
  setup(case)
  if name!='fresh':
   eq(ctl(case,'install',old_archive)['success'],True,'Real baseline native install')
   eq(ctl(case,'state')['packageVersion'],old_version,'Exact installed old component version')
   eq(own(case,'state')['checksum_state_exists'],False,'No checksum history on old release')
   own(case,'seed','legacy' if name=='legacy' else 'strict')
   if name=='edited':
    for file in ['google-ga4.js','yandex.js','google-common.js']:ctl(case,'edit',file,'comment')
   if name=='deleted':ctl(case,'edit','google-ga4.js','delete')
   if name=='syntax':ctl(case,'edit','google-ga4.js','syntax')
  before=ctl(case,'state');saved=own(case,'state')
  eq(ctl(case,'install',archive)['success'],True,'Candidate native Package Manager install/upgrade without uninstall')
  after=ctl(case,'state');preserved=own(case,'state')
  eq(after['packageVersion'],version,'Installed new runtime version');eq(after['checksums']['current'],version,'New SHA baseline current')
  eq(after['checksums']['versions'][version],{p:h for p,h in preserved['manifest']['inputs'].items() if p.startswith('assets/js/cookie-consent/services/')},'New private originals match manifest')
  eq(preserved['aliases_off'],True,'Native namespaces')
  if name!='fresh':
   eq(preserved['settings'],saved['settings'],'All settings, services, mode, category versions, texts and journal configuration retained byte-for-byte')
   eq(preserved['logs'],saved['logs'],'Historical JSONL retained byte-for-byte');eq(len(preserved['logs']),2,'Two historical files')
   eq(preserved['owner'],saved['owner'],'Configured owner JS and extra services file retained')
   eq(after['elements'],before['elements'],'Canonical identity and customer metadata preserved')
   eq(after['checksums']['versions'][old_version],{p:h for p,h in saved['manifest']['inputs'].items() if p.startswith('assets/js/cookie-consent/services/')},'Initial SHA256 baseline imported from real old manifest')
   eq(list(after['checksums']['versions']),[old_version,version],'Exactly old + new checksum baselines')
   for file in ['google-ga4.js','yandex.js','google-common.js','customer-extra.js']:
    if file in before['files']:eq(after['files'][file],before['files'][file],'Retained actual adapter bytes '+file)
   eq('assets/js/cookie-consent/services/customer-extra.js' in preserved['manifest']['inputs'],False,'Extra JS excluded from build recipe')
  else:
   eq(after['prebuilt'],False,'Fresh package contains no prebuilt production JS');eq(list(after['checksums']['versions']),[version],'Fresh baseline')
  if name in ['deleted','syntax']:
   eq(after['build']['state'],'error','Failed upgrade build visible');eq(after['bundle'],before['bundle'],'Prior production bundle retained EXACTLY');eq(after['timestamp'],before['timestamp'],'Last successful timestamp retained')
   if name=='deleted':eq('google-ga4.js' in after['files'],False,'Intentional deletion not restored')
  else:
   eq(after['build']['state'],'ready','Installed PHP production bundle ready');eq(bool(after['bundle']),True,'Executable JS exists')
   eq(preserved['php_error_count'],saved['php_error_count'],'No PHP errors introduced by normal install/upgrade')
  eq(ctl(case,'install',archive)['success'],True,'Same-byte native reinstall')
  again=ctl(case,'state');eq(again['files'],after['files'],'Reinstall retains all user files/deletions');eq(again['bundle'],after['bundle'],'Reinstall retains identical bundle');eq(own(case,'state')['settings'],preserved['settings'],'Reinstall retains settings')
  results.append({'name':name,'case':case,'result':'PASS','assertions':n-before_n,'before':before,'after':after,'preservation_before':saved,'preservation_after':preserved});print('PASS '+platform+' '+name,flush=True);save()
 except Exception as e:
  results.append({'name':name,'case':case,'result':'FAIL','error':str(e)});save();print('FAIL '+platform+' '+name+' '+str(e)[-2000:],flush=True);raise
print(json.dumps({'platform':platform,'tests':len(results),'assertions':n,'failed':0}),flush=True)
