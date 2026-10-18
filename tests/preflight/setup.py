"""Prepare isolated MODX 2 sites; preserve every existing fixture and database."""
from pathlib import Path
import json, secrets, shutil, subprocess, sys
ROOT=Path(__file__).resolve().parents[2]
LOCAL=ROOT/'.local/preflight-fix'
sys.path.insert(0,str(ROOT/'tests/package-rename'))
import driver
driver.LOCAL=LOCAL

if __name__=='__main__':
    action=sys.argv[1]
    if action=='prepare':
        LOCAL.mkdir(exist_ok=False)
        cases=[]
        for i,(version,php,source_port,source_subnet) in enumerate([('2.8.4','8.2',22943,43),('2.8.8','8.1',22945,45)]):
            name='rename-'+version.replace('.','')[1:]+'-p'+php.replace('.','')+'-fresh'
            case=dict(name=name,modx=version+'-pl',php=php,port=22990+i,fresh=True)
            f=LOCAL/name;private=f/'private';private.mkdir(parents=True)
            (private/'disposable-marker').write_text(name+'\n')
            (private/'compose.env').write_text('CC_MATRIX_PASSWORD='+secrets.token_hex(24)+'\n');(private/'compose.env').chmod(0o600)
            shutil.copytree(ROOT/'.local/modx2-compatibility/download'/('modx-'+version+'-pl'),f/'site')
            (f/'evidence').mkdir()
            template=(ROOT/'.local/package-rename'/name/'compose.yaml').read_text()
            template=template.replace('name: cc2-'+name,'name: cc2-preflight-'+name).replace(str(ROOT/'.local/package-rename'),str(LOCAL)).replace(str(source_port),str(case['port'])).replace('10.219.'+str(source_subnet)+'.0/24','10.219.'+str(190+i)+'.0/24')
            (f/'compose.yaml').write_text(template);cases.append(case)
        (LOCAL/'cases.json').write_text(json.dumps(cases,indent=2)+'\n')
    elif action in ['setup','stop']:
        for case in json.loads((LOCAL/'cases.json').read_text()):
            f=LOCAL/case['name']
            if action=='stop':driver.compose(case,'stop');continue
            if (f/'evidence/setup-info.json').exists():raise RuntimeError('Existing setup preserved')
            with (f/'evidence/setup.log').open('a') as log:
                driver.compose(case,'up','-d',stdout=log,stderr=log)
                driver.compose(case,'exec','-T','web','php','/opt/cc-source/tests/package-rename/fixture.php','prepare',stdout=log,stderr=log)
                driver.compose(case,'exec','-T','-w','/var/www/html/setup','web','php','index.php','--installmode=new','--config=/opt/cc-private/setup.xml',stdout=log,stderr=log)
                info=driver.compose(case,'exec','-T','web','php','/opt/cc-source/tests/package-rename/fixture.php','finish',capture_output=True,text=True)
                json.loads(info.stdout);(f/'evidence/setup-info.json').write_text(info.stdout+'\n')
            print('Ready '+case['name'],flush=True)
    elif action=='build':
        import hashlib, zipfile
        case=json.loads((LOCAL/'cases.json').read_text())[0]
        for label in ['release','repro']:
            folder=LOCAL/'artifacts'/label;folder.mkdir(parents=True,exist_ok=False)
            with (folder/'build.log').open('w') as log:driver.compose(case,'exec','-T','web','php','/opt/cc-source/_build/build.php','/var/www/html','/opt/cc-matrix/artifacts/'+label,stdout=log,stderr=log)
            archive=folder/'cookieconsentmanager-1.0.8-pl4.transport.zip'
            subprocess.run(['python3',str(ROOT/'_build/normalize.py'),str(archive)],check=True)
            result=driver.compose(case,'exec','-T','web','php','/opt/cc-source/_build/verify.php','/opt/cc-matrix/artifacts/'+label+'/'+archive.name,capture_output=True,text=True)
            (folder/'verification.json').write_text(result.stdout)
            with zipfile.ZipFile(archive) as z:
                for name in z.namelist():assert b'components/cookieconsent/' not in z.read(name),name
            print(result.stdout,flush=True)
        a=LOCAL/'artifacts/release'/archive.name;b=LOCAL/'artifacts/repro'/archive.name
        assert a.read_bytes()==b.read_bytes()
    else:raise ValueError(action)
