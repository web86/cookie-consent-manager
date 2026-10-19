from pathlib import Path
import json,subprocess
ROOT=Path(__file__).resolve().parents[2];REPO=ROOT.parents[1];LOCAL=REPO/'.local/modstore-matrix';BASE=['docker','compose','--env-file',str(LOCAL/'private/compose.env'),'-f',str(LOCAL/'compose.json')]
def call(*args):
 r=subprocess.run(BASE+list(args),capture_output=True,text=True)
 if r.returncode:raise RuntimeError(r.stdout+'\n'+r.stderr)
 return r.stdout
def cli(c,*args):return call('exec','-T','--user','www-data',c['name'],'php','/opt/cc-source/tests/modstore/fixture.php',*args)
def value(output):return json.loads(output[output.index('{'):])
for c in json.loads((LOCAL/'cases.json').read_text()):
 f=LOCAL/c['name'];checks=[]
 if (f/'evidence/native-checks.json').exists():continue
 # Separate fixture listener makes the configured loopback origin reachable from the test CMS.
 call('exec','-T','-d','--user','www-data',c['name'],'php','-S','127.0.0.1:'+str(c['port']),'-t','/var/www/html','/opt/cc-source/tests/modstore/http-router.php')
 result=cli(c,'http-check');checks.append({'action':'ordinary-http-check-and-log','output':value(result)})
 sig='cookieconsentmanager'+('3' if c['major']==3 else '')+'-1.0.8-pl'+str(9 if c['major']==3 else 7)
 core='/opt/cc-case/private/core/' if c['custom'] else '/var/www/html/core/'
 before=value(cli(c,'snapshot-elements'))
 tool=core+'components/cookieconsentmanager'+('3' if c['major']==3 else '')+'/bin/restore-elements.php'
 if c.get('fresh_final'):
  r=subprocess.run(BASE+['exec','-T','--user','www-data',c['name'],'php',tool,'/var/www/html',sig],capture_output=True,text=True)
  assert r.returncode!=0 and 'No canonical native backups' in r.stderr
  assert before==value(cli(c,'snapshot-elements'))
  checks.append({'action':'restore-refuses-missing-fresh-backup','result':'PASS'})
  (f/'evidence/native-checks.json').write_text(json.dumps({'case':c,'result':'PASS','checks':checks,'settings_and_ids_unchanged':True},indent=2)+'\n');print('PASS',c['name'],'HTTP log and safe refusal without backups',flush=True);continue
 for option in [[],['--apply']]:
  output=call('exec','-T','--user','www-data',c['name'],'php',tool,'/var/www/html',sig,*option)
  parsed=value(output);assert len(parsed['elements'])==6;checks.append({'action':'restore-elements'+('-apply' if option else '-dry-run'),'output':parsed})
 after=value(cli(c,'snapshot-elements'));assert before==after,'Restore changed settings, IDs or current canonical code'
 (f/'evidence/native-checks.json').write_text(json.dumps({'case':c,'result':'PASS','checks':checks,'settings_and_ids_unchanged':True},indent=2)+'\n');print('PASS',c['name'],'ordinary HTTP log and six-element restore',flush=True)
