"""Native MODX fixtures with isolated DBs; existing cases are never reset/reused."""
from pathlib import Path
import json, os, subprocess, sys
root=Path(__file__).resolve().parents[2]; reference=root.parent.parent
out=root/'.local/adapter-updates'; container='cookie-consent-modx3-adapter-updates-web-1'
prefix=sys.argv[1] if len(sys.argv)>1 else 'run1'
archive=sys.argv[2] if len(sys.argv)>2 else '/opt/cc-updates/artifacts/beta1-a/cookieconsent3-0.1.0-beta5.transport.zip'
next_archive=sys.argv[3] if len(sys.argv)>3 else None
only=set(os.environ.get('CC_ADAPTER_CASES','').split(','))-{''}
results=[]; assertions=0
def run(args):return subprocess.check_output(args,cwd=root,text=True,stderr=subprocess.STDOUT)
def ctl(case,op,*args):return json.loads(run(['docker','exec',container,'runuser','-u','www-data','--','php','/opt/cc-source/tests/adapter-updates/control.php',case,op,*args]))
def check(a,b,message):
    global assertions
    assertions+=1
    if a!=b:raise AssertionError(message+': '+str((a,b)))
def setup(name):
    case=prefix+'-'+name;run(['python3','tests/adapter-updates/prepare.py',str(reference),case])
    run(['docker','exec',container,'php','/opt/cc-source/tests/adapter-updates/setup.php',case])
    log=run(['docker','exec','-w','/opt/cc-updates/cases/'+case+'/site/setup',container,'php','index.php','--installmode=new','--config=/opt/cc-updates/cases/'+case+'/private/setup.xml'])
    (out/'evidence'/('setup-'+case+'.log')).write_text(log)
    run(['docker','exec',container,'php','/opt/cc-source/tests/adapter-updates/finish.php',case])
    run(['docker','exec',container,'mv','/opt/cc-updates/cases/'+case+'/site/setup','/opt/cc-updates/cases/'+case+'/private/completed-setup'])
    run(['docker','exec',container,'chown','-R','www-data:www-data','/opt/cc-updates/cases/'+case])
    return case
def install(case,path=archive,expected=True):
    result=ctl(case,'install',path);check(result['success'],expected,'Native Package Management result');return result
def save():
    (out/'evidence'/('native-'+prefix+'.json')).write_text(json.dumps({'tests':len(results),'assertions':assertions,'failed':sum(r['result']=='FAIL' for r in results),'results':results},indent=2)+'\n')
for name, edits in [('fresh',[]),('original',[]),('one',[('google-ga4.js','comment')]),('several',[('google-ga4.js','comment'),('yandex.js','comment')]),('helper',[('google-common.js','comment')]),('deleted',[('google-ga4.js','delete')]),('extra',[('customer-extra.js','comment')]),('occupied',[('future-fixture.js','comment')]),('syntax',[('google-ga4.js','syntax')]),('permissions',[]),('firstsyntax',[('google-ga4.js','syntax')]),('firstpermissions',[])]:
    if only and name not in only:continue
    try:
        case=setup(name)
        if name not in ['fresh','firstsyntax','firstpermissions']:install(case,'/opt/cc-reference/.local/modx3/artifacts/sync-1.0.6-beta4/cookieconsent3-0.1.0-beta4.transport.zip')
        for file,kind in edits:ctl(case,'edit',file,kind)
        before=ctl(case,'state')
        if name in ['permissions','firstpermissions']:
            run(['docker','exec',container,'mkdir','-p','/opt/cc-updates/cases/'+case+'/site/assets/components/cookieconsentmanager3/js/cookie-consent'])
            run(['docker','exec',container,'chmod','0555','/opt/cc-updates/cases/'+case+'/site/assets/components/cookieconsentmanager3/js/cookie-consent'])
        install(case,expected=name not in ['permissions','firstpermissions','firstsyntax']);after=ctl(case,'state')
        if name in ['permissions','firstpermissions']:
            check(after['files'],before['files'],'Denied write preserves all adapters');check(after['bundle'],before['bundle'],'Denied write preserves bundle');check(after['timestamp'],before['timestamp'],'Denied write preserves timestamp')
            run(['docker','exec',container,'chmod','0755','/opt/cc-updates/cases/'+case+'/site/assets/components/cookieconsentmanager3/js/cookie-consent'])
            if name=='firstpermissions':check(after['elements'],before['elements'],'Preflight aborts before canonical objects');check(after['bundle'],None,'No false first-install success')
        elif name=='firstsyntax':
            check(after['bundle'],None,'Fresh parse failure has no working bundle');check(after['timestamp'],0,'No fake success timestamp');check(after['build']['state'],'error','Fresh failure visible');check(after['files']['google-ga4.js'],before['files']['google-ga4.js'],'Invalid user JS retained');check(bool(after['elements']),True,'Native partial installation is explicit, not rolled back')
            run(['docker','exec',container,'runuser','-u','www-data','--','cp','/opt/cc-updates/cases/'+case+'/private/core/components/cookieconsent/adapters/services/google-ga4.js','/opt/cc-updates/cases/'+case+'/site/assets/components/cookieconsentmanager3/js/cookie-consent/services/google-ga4.js'])
            install(case);check(ctl(case,'state')['build']['state'],'ready','Manual repair and reinstall completes fresh install')
        else:
            for file,_ in edits:check(after['files'].get(file),before['files'].get(file),'User source/deletion retained '+file)
            if name in ['deleted','syntax']:
                check(after['bundle'],before['bundle'],'Failure retains last working bundle');check(after['timestamp'],before['timestamp'],'Failure retains saved version');check(after['build']['state'],'error','Failure visible')
            else:check(after['build']['state'],'ready','Installed PHP production bundle ready')
            if name=='fresh':check(after['prebuilt'],False,'No prebuilt delivered');check(bool(after['bundle']),True,'Fresh build mandatory')
            else:check(after['elements'],before['elements'],'Canonical IDs and user metadata retained')
            install(case);reinstalled=ctl(case,'state');check(reinstalled['files'],after['files'],'Reinstall does not overwrite user files');check(reinstalled['bundle'],after['bundle'],'Reinstall preserves identical or retained bundle')
            if name=='extra':check('customer-extra.js' in reinstalled['checksums']['versions']['0.1.0-beta5'],False,'Extra file excluded from fixed input list')
            if next_archive and name in ['original','helper','deleted','extra','occupied']:
                install(case,next_archive);later=ctl(case,'state')
                for file,_ in edits:check(later['files'].get(file),before['files'].get(file),'Successive update retains user source/deletion '+file)
                check(later['checksums']['current'],'0.1.0-beta6','Next synchronized version recorded');check(len(later['checksums']['versions']),3,'All installed source baselines retained')
                check(later['files']['yandex.js']!=reinstalled['files']['yandex.js'],True,'New package original updates untouched adapter')
                if name=='helper':check('google-common.js' in later['checksums']['report']['conflicts'],True,'Changed package and user helper is reported as conflict')
                future='assets/components/cookieconsentmanager3/js/cookie-consent/services/future-fixture.js'
                if future in later['checksums']['versions']['0.1.0-beta6']:
                    if name=='occupied':check(later['files']['future-fixture.js'],before['files']['future-fixture.js'],'New package path occupied by user is retained');check('future-fixture.js' in later['checksums']['report']['unknown'],True,'Occupied new source reported')
                    else:check(later['files']['future-fixture.js'],later['checksums']['versions']['0.1.0-beta6'][future],'New explicitly listed input added at free path')
                if name=='deleted':check(later['bundle'],reinstalled['bundle'],'Successive missing-input upgrade retains previous bundle');check(later['timestamp'],reinstalled['timestamp'],'Successive failure retains timestamp')
                else:check(later['build']['state'],'ready','Next package builds production JS')
                install(case,next_archive);check(ctl(case,'state')['files'],later['files'],'Reinstall next version retains user sources')
                after=later
        results.append({'name':name,'case':case,'result':'PASS','after':after});print('PASS '+name,flush=True)
    except Exception as e:
        results.append({'name':name,'case':locals().get('case'),'result':'FAIL','error':str(e)});print('FAIL '+name+' '+str(e)[-1600:],flush=True);save();raise
    save()
print(json.dumps({'tests':len(results),'assertions':assertions,'failed':0}),flush=True)
